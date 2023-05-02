import * as vscode from "vscode"
import { ControllerFromRunner } from "./web/ControllerFromRunner"
import { LLaMaRunner } from "./LLaMaRunner"
import {
  activate as activateWeb,
  deactivate as deactivateWeb,
} from "./web/extension"
import { get_encoding } from "@dqbd/tiktoken"

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

  const enc = get_encoding("cl100k_base") // technically, should change based on model/kernel.
  vscode.notebooks.registerNotebookCellStatusBarItemProvider(notebookType, {
    provideCellStatusBarItems(cell, token) {
      const openAiConfig = vscode.workspace.getConfiguration("llm-book.openAI")
      if (!openAiConfig.get<boolean>("showTokenCount")) {
        return []
      }

      const text = cell.document.getText()

      const dollarsPerKiloToken =
        openAiConfig.get<number>("dollarsPerKiloToken") ?? 0

      const encoding = enc.encode(text)
      const tokens = encoding.length
      const kiloTokens = tokens / 1000
      const dollars = kiloTokens * dollarsPerKiloToken
      const cents = ("" + dollars * 100).slice(0, 4)
      const tokenItem = {
        text: `${tokens} Tokens`,
        alignment: vscode.NotebookCellStatusBarAlignment.Left,
      }
      const costItem = {
        text: `${cents}¢`,
        alignment: vscode.NotebookCellStatusBarAlignment.Left,
      }

      return dollars ? [tokenItem, costItem] : [tokenItem]
    },
  })

  const llamaConfig = vscode.workspace.getConfiguration("llm-book.LLaMa")
  if (llamaConfig.get("binary")) {
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
