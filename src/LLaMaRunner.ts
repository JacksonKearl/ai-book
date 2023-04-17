import * as vscode from "vscode"
import { Runner } from "./web/ControllerFromRunner"
import { spawn } from "child_process"

export const LLaMaRunner: Runner = async (
  messages,
  notebook,
  clear,
  append,
  trace,
  token,
) => {
  return new Promise((c, e) => {
    const config = vscode.workspace.getConfiguration("llm-book.LLaMa")

    const binary = config.get<string>("binary")
    const args = config.get<string[]>("args")

    if (!binary || !args) {
      throw Error(
        "LLaMa Runner: Missing binary and/or args. Configure in vscode's settings as `llm-book.LLaMa.binary` and `llm-book.LLaMa.args`.",
      )
    }

    const messageText =
      messages.map((m) => `${m.role}: ${m.content}`).join("\n") + "\nassistant:"

    clear()

    const process = spawn(
      binary,
      args.map((arg) => arg.replace("${messages}", messageText)),
    )

    process.on("error", (err) => {
      e(err)
    })

    process.stdout.on("data", (data: Buffer) => {
      const str = data.toString()
      append(str)
    })

    process.stderr.on("data", (data: Buffer) => {
      trace(data.toString())
    })

    process.on("close", () => {
      c(undefined)
    })

    token.onCancellationRequested(() => {
      process.kill()
    })
  })
}
