import type { Plugin } from "@opencode-ai/plugin"
import { createHooks, type Notice } from "./hooks"
import { createExec } from "./rewrite"

export const rtkPlugin: Plugin = async ({ client, directory }) => {
  const notify: Notice = async (message, variant) => {
    await client.tui.showToast({
      body: {
        title: "openrtk",
        message,
        variant,
        duration: variant === "info" ? 3_000 : 6_000,
      },
      query: { directory },
    }).catch(() => {})
  }

  return createHooks(createExec(), notify)
}

export default rtkPlugin
