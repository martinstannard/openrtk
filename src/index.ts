import type { Plugin } from "@opencode/plugin"
import { execFile } from "node:child_process"
import { rewrite } from "./rewrite"

/**
 * OpenCode 1.x funnelled every tool through a single `tool.execute.before`
 * hook, so shell commands had to be picked out by tool name. OpenCode 2 has a
 * dedicated hook for shell creation and no longer needs this list.
 */
const SHELL_TOOL_NAMES = ["bash", "shell"]

/** Resolves to whether the `rtk` binary is installed and runnable. */
function rtkInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("rtk", ["--version"], (error) => resolve(!error))
  })
}

const v2 = {
  id: "openrtk",
  async setup(ctx: Plugin.Context) {
    if (!(await rtkInstalled())) {
      console.warn("[openrtk] rtk binary not found in PATH — plugin disabled")
      return
    }

    await ctx.shell.hook("create.before", (event) => {
      const rewritten = rewrite(event.command)
      if (rewritten) event.command = rewritten
    })
  },
} satisfies Plugin.Plugin

interface V1Shell {
  (strings: TemplateStringsArray, ...values: unknown[]): { quiet(): Promise<unknown> }
}

interface V1BeforeInput {
  tool?: string
}

interface V1BeforeOutput {
  args?: Record<string, unknown>
}

export default {
  ...v2,

  // OpenCode 1.x entrypoint. V1 calls `server()`; V2 ignores it and uses the
  // `id`/`setup` above instead.
  async server({ $ }: { $: V1Shell }) {
    try {
      await $`which rtk`.quiet()
    } catch {
      console.warn("[openrtk] rtk binary not found in PATH — plugin disabled")
      return {}
    }

    return {
      "tool.execute.before": async (input: V1BeforeInput, output: V1BeforeOutput) => {
        const tool = String(input?.tool ?? "").toLowerCase()
        if (!SHELL_TOOL_NAMES.includes(tool)) return

        const args = output?.args
        if (!args || typeof args !== "object") return

        const rewritten = rewrite(args.command)
        if (rewritten) args.command = rewritten
      },
    }
  },
}
