import * as vscode from "vscode"
import { Runner } from "./ControllerFromRunner"

import * as nodeFetch from "node-fetch"

let getReader = async function* (response: Response) {
  const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader()
  if (!reader) throw Error("No reader")

  while (true) {
    const { value, done } = await reader?.read()
    if (done) return
    yield value
  }
}

if (typeof globalThis.fetch == "undefined") {
  globalThis.fetch = nodeFetch.default as any

  getReader = async function* (response: any) {
    response = response as nodeFetch.Response

    for await (const chunk of response.body) {
      yield chunk.toString()
    }
  }
}

export const MakeOpenAiRunner: (context: vscode.ExtensionContext) => Runner =
  (context) => async (messages, notebook, clearOutput, appendOutput) => {
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

    let options = config.get<{}>("parameters") ?? {}

    options = { ...options, ...notebook.metadata.parameters }

    console.log("Using options", options)

    const response = await globalThis.fetch(endpoint, {
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

    if (!response.ok) {
      throw Error(
        'Error accessing OpenAI. The "Update OpenAPI Api Key" command may help you.\n' +
          (await response.text()),
      )
    }

    const reader = getReader(response)

    if (!reader) throw Error("Unable to get reader")

    clearOutput()
    for await (const value of reader) {
      const lines = value
        .split("\n")
        .filter((x) => x && x.startsWith("data: "))
        .map((x) => x.slice("data: ".length))

      for (const line of lines) {
        if (line === "[DONE]") {
          break
        }

        const json = JSON.parse(line)
        const content = json.choices[0].delta.content
        await appendOutput(content)
      }
    }
  }
