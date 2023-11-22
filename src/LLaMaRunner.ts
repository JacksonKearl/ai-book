import * as vscode from "vscode"
import { Runner } from "./web/ControllerFromRunner"
import { spawn } from "child_process"
import { dirname } from "path"

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
    const globalArgs = config.get<string[]>("args")

    if (!binary || !globalArgs) {
      throw Error(
        "LLaMa Runner: Missing binary and/or args. Configure in vscode's settings as `llm-book.LLaMa.binary` and `llm-book.LLaMa.args`.",
      )
    }

    const messageText = messages.map((m) => `${m.content}`).join("\n") + "\n"

    clear()

    const cwd = dirname(notebook.uri.fsPath)

    console.log({ cwd })
    const notebookArgs: string[] = Object.entries(notebook.metadata.parameters)
      .map(([k, v]) => [String(k), String(v)])
      .flat()

    const allArgs = [...globalArgs, ...notebookArgs]
    console.log("LLaMa Args:", { notebookArgs, globalArgs, allArgs })

    const hydratedArgs = allArgs.map((arg) =>
      arg.replace("${messages}", messageText),
    )

    console.log("spawning", { binary, hydratedArgs, cwd })
    const process = spawn(binary, hydratedArgs, { cwd })

    process.on("error", (err) => {
      e(err)
    })

    let promptReplyBuffer = " " + messageText

    process.stdout.on("data", (data: Buffer) => {
      let str = data.toString()
      while (str[0] && str[0] === promptReplyBuffer[0]) {
        str = str.slice(1)
        promptReplyBuffer = promptReplyBuffer.slice(1)
      }

      console.log(
        "LLaMa STDOUT:" + new Date().toISOString() + ": " + data.toString(),
      )
      append(str)
    })

    process.stderr.on("data", (data: Buffer) => {
      console.log(
        "LLaMa STDERR:" + new Date().toISOString() + ": " + data.toString(),
      )
    })

    process.on("close", () => {
      c(undefined)
    })

    token.onCancellationRequested(() => {
      process.kill()
    })
  })
}
