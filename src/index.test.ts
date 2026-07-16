import { describe, expect, test } from "bun:test"
import { createHooks } from "./hooks"
import { resolveRewrite, resolveRuntime, type Exec } from "./rewrite"

function result(stdout = "", stderr = "", exitCode = 0) {
  return { stdout, stderr, exitCode }
}

describe("resolveRuntime", () => {
  test("resolves and validates rtk on Windows", async () => {
    const calls: [string, string[]][] = []
    const exec: Exec = async (command, args) => {
      calls.push([command, args])
      if (command === "where.exe") return result('"C:\\Program Files\\rtk.exe"\r\n')
      return result("rtk 1.0.0")
    }

    expect(await resolveRuntime(exec, "win32")).toEqual({ command: "C:\\Program Files\\rtk.exe" })
    expect(calls).toEqual([
      ["where.exe", ["rtk"]],
      ["C:\\Program Files\\rtk.exe", ["--version"]],
    ])
  })

  test("reports unavailable rtk", async () => {
    const exec: Exec = async () => result("", "not found", 1)
    expect(await resolveRuntime(exec, "linux")).toEqual({ warning: "rtk unavailable: not found" })
  })
})

describe("resolveRewrite", () => {
  test("passes complete command as one argument", async () => {
    const calls: [string, string[]][] = []
    const exec: Exec = async (command, args) => {
      calls.push([command, args])
      return result("rtk git diff --stat; if ($?) { git diff }\n")
    }

    const command = "git diff --stat; if ($?) { git diff }"
    expect(await resolveRewrite(exec, command, "C:\\rtk.exe")).toEqual({
      changed: true,
      original: command,
      rewritten: "rtk git diff --stat; if ($?) { git diff }",
      exitCode: 0,
    })
    expect(calls).toEqual([["C:\\rtk.exe", ["rewrite", command]]])
  })

  test("accepts rtk rewrite exit code 3", async () => {
    const exec: Exec = async () => result("rtk git status", "", 3)
    expect((await resolveRewrite(exec, "git status", "rtk")).changed).toBe(true)
  })

  test("leaves no-match and denied commands unchanged", async () => {
    const noMatch: Exec = async () => result("", "", 1)
    const denied: Exec = async () => result("", "unsafe rewrite", 2)
    expect(await resolveRewrite(noMatch, "echo ok", "rtk")).toEqual({
      changed: false,
      original: "echo ok",
      rewritten: "echo ok",
      exitCode: 1,
    })
    expect(await resolveRewrite(denied, "git push", "rtk")).toEqual({
      changed: false,
      original: "git push",
      rewritten: "git push",
      exitCode: 2,
      warning: "unsafe rewrite",
    })
  })

  test("does not invoke rewrite for direct rtk commands", async () => {
    let invoked = false
    const exec: Exec = async () => {
      invoked = true
      return result()
    }
    expect((await resolveRewrite(exec, "rtk git diff", "rtk")).changed).toBe(false)
    expect(invoked).toBe(false)
  })

  test("fails open on timeout and empty rewrite output", async () => {
    const timeout: Exec = async () => {
      throw new Error("command timed out after 3000 ms")
    }
    const empty: Exec = async () => result("", "", 3)
    expect(await resolveRewrite(timeout, "git diff", "rtk")).toEqual({
      changed: false,
      original: "git diff",
      rewritten: "git diff",
      exitCode: -1,
      warning: "rtk rewrite failed: command timed out after 3000 ms",
    })
    expect(await resolveRewrite(empty, "git diff", "rtk")).toEqual({
      changed: false,
      original: "git diff",
      rewritten: "git diff",
      exitCode: 3,
      warning: "rtk rewrite returned no command",
    })
  })
})

describe("plugin lifecycle", () => {
  function setup(rewritten = "rtk git diff") {
    const notices: string[] = []
    const exec: Exec = async (command, args) => {
      if (command === "where.exe" || command === "which") return result("C:\\rtk.exe\n")
      if (args[0] === "--version") return result("rtk 1.0.0")
      return result(`${rewritten}\n`)
    }
    const hooks = createHooks(exec, async (message) => {
      notices.push(message)
    })
    return { hooks, notices }
  }

  test("executes rewrite while restoring model-facing command", async () => {
    const { hooks, notices } = setup()
    const args = { command: "git diff", description: "Get changes" }
    await hooks["tool.execute.before"]?.(
      { tool: "bash", sessionID: "session", callID: "call" },
      { args },
    )
    expect(args.command).toBe("rtk git diff")

    const output = { title: "Get changes", output: "compressed diff", metadata: { exit: 0 } }
    await hooks["tool.execute.after"]?.(
      { tool: "bash", sessionID: "session", callID: "call", args },
      output,
    )
    expect(args.command).toBe("git diff")
    expect(output.output).toBe("compressed diff")
    expect(output.metadata).toEqual({
      exit: 0,
      openrtk: { original: "git diff", rewritten: "rtk git diff" },
    })
    expect(notices).toContain("git diff -> rtk git diff")
  })

  test("restores persisted rewritten commands before model conversion", async () => {
    const { hooks } = setup()
    const args = { command: "git diff" }
    await hooks["tool.execute.before"]?.(
      { tool: "bash", sessionID: "session", callID: "call" },
      { args },
    )

    const part = {
      id: "part",
      sessionID: "session",
      messageID: "message",
      type: "tool" as const,
      tool: "bash",
      callID: "call",
      state: {
        status: "running" as const,
        input: { command: "rtk git diff" },
        time: { start: Date.now() },
      },
    }
    await hooks["experimental.chat.messages.transform"]?.({}, {
      messages: [{ info: {} as never, parts: [part] }],
    })
    expect(part.state.input.command).toBe("git diff")
  })

  test("uses persisted provenance after successful call state is released", async () => {
    const { hooks } = setup()
    const args = { command: "git diff" }
    await hooks["tool.execute.before"]?.(
      { tool: "bash", sessionID: "session", callID: "call" },
      { args },
    )
    const output = { title: "", output: "diff", metadata: { exit: 0 } }
    await hooks["tool.execute.after"]?.(
      { tool: "bash", sessionID: "session", callID: "call", args },
      output,
    )

    const part = {
      id: "part",
      sessionID: "session",
      messageID: "message",
      type: "tool" as const,
      tool: "bash",
      callID: "call",
      state: {
        status: "completed" as const,
        input: { command: "rtk git diff" },
        output: "diff",
        title: "",
        metadata: output.metadata,
        time: { start: Date.now(), end: Date.now() },
      },
    }
    await hooks["experimental.chat.messages.transform"]?.({}, {
      messages: [{ info: {} as never, parts: [part] }],
    })
    expect(part.state.input.command).toBe("git diff")
  })

  test("marks silent success and exposes command failures", async () => {
    const success = setup()
    const successArgs = { command: "git diff" }
    await success.hooks["tool.execute.before"]?.(
      { tool: "bash", sessionID: "session", callID: "success" },
      { args: successArgs },
    )
    const successOutput = { title: "", output: "", metadata: { exit: 0 } }
    await success.hooks["tool.execute.after"]?.(
      { tool: "bash", sessionID: "session", callID: "success", args: successArgs },
      successOutput,
    )
    expect(successOutput.output).toBe("(no output)")

    const failure = setup()
    const failureArgs = { command: "git diff" }
    await failure.hooks["tool.execute.before"]?.(
      { tool: "bash", sessionID: "session", callID: "failure" },
      { args: failureArgs },
    )
    const failureOutput = { title: "", output: "fatal", metadata: { exit: 7 } }
    await failure.hooks["tool.execute.after"]?.(
      { tool: "bash", sessionID: "session", callID: "failure", args: failureArgs },
      failureOutput,
    )
    expect(failureOutput.output).toBe("fatal\n\nCommand exited with code 7")
  })

  test("keeps parallel calls isolated", async () => {
    const exec: Exec = async (command, args) => {
      if (command === "where.exe" || command === "which") return result("rtk\n")
      if (args[0] === "--version") return result("rtk 1.0.0")
      return result(`rtk ${args[1]}\n`)
    }
    const hooks = createHooks(exec)
    const first = { command: "git diff" }
    const second = { command: "git status" }
    await Promise.all([
      hooks["tool.execute.before"]?.({ tool: "bash", sessionID: "s", callID: "1" }, { args: first }),
      hooks["tool.execute.before"]?.({ tool: "bash", sessionID: "s", callID: "2" }, { args: second }),
    ])
    await hooks["tool.execute.after"]?.(
      { tool: "bash", sessionID: "s", callID: "2", args: second },
      { title: "", output: "ok", metadata: { exit: 0 } },
    )
    await hooks["tool.execute.after"]?.(
      { tool: "bash", sessionID: "s", callID: "1", args: first },
      { title: "", output: "ok", metadata: { exit: 0 } },
    )
    expect(first.command).toBe("git diff")
    expect(second.command).toBe("git status")
  })
})
