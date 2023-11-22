import * as vscode from "vscode"
import { ControllerFromRunner } from "./web/ControllerFromRunner"
import { LLaMaRunner } from "./LLaMaRunner"
import {
  activate as activateWeb,
  deactivate as deactivateWeb,
  notebookType,
} from "./web/extension"
import { Tiktoken, get_encoding } from "@dqbd/tiktoken"

export function activate(context: vscode.ExtensionContext) {
  activateWeb(context)

  let enabled = false
  const enableLLaMa = () => {
    if (!enabled) {
      enabled = true

      const notebookControllerLLaMa = vscode.notebooks.createNotebookController(
        "llm-book-llama",
        notebookType,
        "LLaMa",
        ControllerFromRunner(LLaMaRunner)
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
    provideCellStatusBarItems(cell) {
      const openAiConfig = vscode.workspace.getConfiguration("llm-book.openAI")
      if (!openAiConfig.get<boolean>("showTokenCount")) {
        return []
      }

      const text = cell.document.getText()

      return getTokenMessages(openAiConfig, enc, text)
    },
  })

  const sbi = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right)

  vscode.window.onDidChangeActiveNotebookEditor((e) => {
    const openAiConfig = vscode.workspace.getConfiguration("llm-book.openAI")
    if (
      !openAiConfig.get<boolean>("showTokenCount") ||
      e?.notebook.notebookType !== notebookType
    ) {
      sbi.hide()
      return
    }

    sbi.show()

    // https://platform.openai.com/docs/guides/chat/managing-tokens
    const fullText =
      e?.notebook
        .getCells()
        .filter((c) => c.kind === vscode.NotebookCellKind.Code)
        .map((c) => `<im_start>{role}\n${c.document.getText()}<im_end>\n`)
        .join("") ?? ""

    sbi.text = getTokenMessages(openAiConfig, enc, fullText)
      .map(({ text }) => text)
      .join(" | ")
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

function getTokenMessages(
  config: vscode.WorkspaceConfiguration,
  enc: Tiktoken,
  text: string
) {
  const dollarsPerKiloToken = config.get<number>("dollarsPerKiloToken") ?? 0

  const encoding = enc.encode(text)
  const tokens = encoding.length
  const kiloTokens = tokens / 1000
  const dollars = kiloTokens * dollarsPerKiloToken
  const truncateToRound = 0.005
  const cents = ("" + (dollars * 100 + truncateToRound)).slice(0, 4)
  const tokenItem = {
    text: `${tokens} Tokens`,
    alignment: vscode.NotebookCellStatusBarAlignment.Right,
  }
  const costItem = {
    text: `${cents}¢`,
    alignment: vscode.NotebookCellStatusBarAlignment.Right,
  }

  return dollars ? [tokenItem, costItem] : [tokenItem]
}

export function deactivate() {
  deactivateWeb()
}
