import { execFile } from "node:child_process"

export type ExecResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export type Exec = (command: string, args: string[], timeout: number) => Promise<ExecResult>

export type Runtime = {
  command?: string
  warning?: string
}

export type Rewrite = {
  changed: boolean
  original: string
  rewritten: string
  exitCode: number
  warning?: string
}

function firstLine(value: string) {
  const line = value.split(/\r?\n/).map((item) => item.trim()).find(Boolean)
  if (!line) return
  if (line.length > 1 && ((line[0] === '"' && line.at(-1) === '"') || (line[0] === "'" && line.at(-1) === "'"))) {
    return line.slice(1, -1)
  }
  return line
}

export function createExec(): Exec {
  return (command, args, timeout) => new Promise((resolve, reject) => {
    execFile(command, args, { timeout, windowsHide: true, encoding: "utf8" }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout, stderr, exitCode: 0 })
        return
      }
      if (typeof error.code === "number") {
        resolve({ stdout, stderr, exitCode: error.code })
        return
      }
      reject(error)
    })
  })
}

export async function resolveRuntime(exec: Exec, platform = process.platform): Promise<Runtime> {
  const resolver = platform === "win32" ? "where.exe" : "which"
  let command = "rtk"
  let warning: string | undefined

  try {
    const result = await exec(resolver, ["rtk"], 1_000)
    const path = firstLine(result.stdout)
    if (result.exitCode === 0 && path) command = path
    else warning = `rtk path lookup failed: ${(result.stderr || result.stdout || `exit ${result.exitCode}`).trim()}`
  } catch (error) {
    warning = `rtk path lookup failed: ${error instanceof Error ? error.message : String(error)}`
  }

  try {
    const result = await exec(command, ["--version"], 1_000)
    if (result.exitCode === 0) {
      const runtime: Runtime = { command }
      if (warning) runtime.warning = warning
      return runtime
    }
    return { warning: `rtk unavailable: ${(result.stderr || result.stdout || `exit ${result.exitCode}`).trim()}` }
  } catch (error) {
    return { warning: `rtk unavailable: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function resolveRewrite(exec: Exec, command: string, executable: string): Promise<Rewrite> {
  if (!command.trim() || /^\s*rtk(?:\s|$)/.test(command)) {
    return { changed: false, original: command, rewritten: command, exitCode: 1 }
  }

  try {
    const result = await exec(executable, ["rewrite", command], 3_000)
    if (result.exitCode === 1) {
      return { changed: false, original: command, rewritten: command, exitCode: 1 }
    }
    if (result.exitCode === 2) {
      return {
        changed: false,
        original: command,
        rewritten: command,
        exitCode: 2,
        warning: result.stderr.trim() || "rtk denied rewrite",
      }
    }
    if (result.exitCode !== 0 && result.exitCode !== 3) {
      return {
        changed: false,
        original: command,
        rewritten: command,
        exitCode: result.exitCode,
        warning: `rtk rewrite exited with code ${result.exitCode}`,
      }
    }

    const rewritten = result.stdout.trim()
    if (!rewritten) {
      return {
        changed: false,
        original: command,
        rewritten: command,
        exitCode: result.exitCode,
        warning: "rtk rewrite returned no command",
      }
    }
    return {
      changed: rewritten !== command,
      original: command,
      rewritten,
      exitCode: result.exitCode,
    }
  } catch (error) {
    return {
      changed: false,
      original: command,
      rewritten: command,
      exitCode: -1,
      warning: `rtk rewrite failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
