import * as vscode from "vscode"
import { ControllerFromRunner } from "./web/ControllerFromRunner"
import { LLaMaRunner } from "./LLaMaRunner"
import {
  activate as activateWeb,
  deactivate as deactivateWeb,
} from "./web/extension"

export function activate(context: vscode.ExtensionContext) {
  activateWeb(context)

  const notebookType = "llm-book"

  let enabled = false
  const enableLLaMa = () => {
    if (!enabled) {
      enabled = true

      const notebookControllerLLaMa = vscode.notebooks.createNotebookController(
        "llm-book-llama",
        notebookType,
        "LlAmA",
        ControllerFromRunner(LLaMaRunner),
      )

      notebookControllerLLaMa.supportedLanguages = [
        "system",
        "user",
        "assistant",
      ]

      context.subscriptions.push(notebookControllerLLaMa)
    }
  }

  const config = vscode.workspace.getConfiguration("llm-book.LLaMa")
  if (config.get("binary")) {
    enableLLaMa()
  }

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("llm-book.LLaMa.binary")) {
      enableLLaMa()
    }
  })
}

export function deactivate() {
  deactivateWeb()
}
