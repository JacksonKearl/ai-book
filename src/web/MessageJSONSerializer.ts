import * as vscode from "vscode"

export const MessageJSONSerializer: vscode.NotebookSerializer = {
  deserializeNotebook(content: Uint8Array): vscode.NotebookData {
    let rawCells = [
      { content: "You are a helpful assistant.", role: "system" },
      { content: "Who are you?", role: "user" },
    ]

    const str = new TextDecoder().decode(content)
    try {
      rawCells = JSON.parse(str)
    } catch (e) {
      console.error(e)
    }
    const notebookCells: vscode.NotebookCellData[] = []
    for (const cell of rawCells) {
      notebookCells.push(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          cell.content,
          cell.role,
        ),
      )
    }

    return new vscode.NotebookData(notebookCells)
  },
  serializeNotebook(data: vscode.NotebookData): Uint8Array {
    const rawCells: { content: string; role: string }[] = data.cells
      .filter((cell) => cell.kind === vscode.NotebookCellKind.Code)
      .map((cell) => ({
        content: cell.value,
        role: cell.languageId,
      }))

    return new TextEncoder().encode(JSON.stringify(rawCells))
  },
}

export const MessageJSONSerializerOptions: vscode.NotebookDocumentContentOptions =
  {
    transientOutputs: true,
  }
