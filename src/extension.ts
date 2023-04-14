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

  const notebookControllerLLaMa = vscode.notebooks.createNotebookController(
    "llm-book-llama",
    notebookType,
    "LlAmA",
    ControllerFromRunner(LLaMaRunner),
  )

  notebookControllerLLaMa.supportedLanguages = ["system", "user", "assistant"]

  context.subscriptions.push(notebookControllerLLaMa)
}

export function deactivate() {
  deactivateWeb()
}
