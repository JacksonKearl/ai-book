import * as vscode from "vscode"
import { Runner } from "./ControllerFromRunner"

export const MakeOpenAiRunner: (context: vscode.ExtensionContext) => Runner =
  (context) => async (messages, clearOutput, appendOutput, token) => {
    let apiKey = await context.secrets.get("ai-book.openAI.apiKey")
    if (!apiKey) {
      apiKey = await vscode.commands.executeCommand("llm-book.updateOpenAIKey")
      if (!apiKey) {
        return
      }
    }

    const config = vscode.workspace.getConfiguration("llm-book.openAI")
    const model = config.get<string>("model") ?? "gpt-3.5-turbo"
    const endpoint =
      config.get<string>("endpoint") ??
      "https://api.openai.com/v1/chat/completions"

    const options = config.get<{}>("options") ?? {}

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        ...options,
      }),
    })

    const reader = response.body
      ?.pipeThrough(new TextDecoderStream())
      .getReader()

    if (!reader) throw Error("Unable to get reader")

    clearOutput()

    let hasMore = true
    while (hasMore) {
      const { value, done } = await reader.read()
      if (done) break

      const lines = value
        .split("\n")
        .filter((x) => x && x.startsWith("data: "))
        .map((x) => x.slice("data: ".length))

      for (const line of lines) {
        if (line === "[DONE]") {
          hasMore = false
          break
        }

        const json = JSON.parse(line)
        const content = json.choices[0].delta.content
        await appendOutput(content)
      }
    }
  }
