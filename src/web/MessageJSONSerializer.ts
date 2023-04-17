import * as vscode from "vscode"
import { Message } from "./ControllerFromRunner"

type SerializedNotebook = {
  messages: Message[]
  parameters: Record<string, any>
}

export const MessageJSONSerializer: vscode.NotebookSerializer = {
  deserializeNotebook(content: Uint8Array): vscode.NotebookData {
    let serialized: SerializedNotebook = {
      messages: [
        { content: "You are a helpful assistant.", role: "system" },
        { content: "Who are you?", role: "user" },
      ],
      parameters: {},
    }

    const str = new TextDecoder().decode(content)
    try {
      const data = JSON.parse(str) as Message[] | SerializedNotebook
      if (Array.isArray(data)) {
        serialized = { messages: data, parameters: {} }
      } else {
        serialized = data
      }
    } catch (e) {
      if (content.length) {
        console.error(e)
      }
    }

    const notebookCells: vscode.NotebookCellData[] = []
    for (const cell of serialized.messages) {
      notebookCells.push(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          cell.content,
          cell.role,
        ),
      )
    }

    const notebook = new vscode.NotebookData(notebookCells)
    notebook.metadata = { parameters: serialized.parameters }
    console.log("deserialized into notebook data:", notebook)

    return notebook
  },
  serializeNotebook(data: vscode.NotebookData): Uint8Array {
    console.log(
      "serializeNotebook is running! good stuff. Notebook data:",
      data,
    )

    const rawCells: { content: string; role: string }[] = data.cells
      .filter((cell) => cell.kind === vscode.NotebookCellKind.Code)
      .map((cell) => ({
        content: cell.value,
        role: cell.languageId,
      }))

    const serialized: SerializedNotebook = {
      messages: rawCells,
      parameters: data.metadata?.parameters ?? {},
    }

    return new TextEncoder().encode(JSON.stringify(serialized, null, 2))
  },
}

export const MessageJSONSerializerOptions: vscode.NotebookDocumentContentOptions =
  {
    transientOutputs: true,
  }
