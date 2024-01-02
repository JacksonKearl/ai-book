import * as vscode from "vscode"
import { Runner } from "./ControllerFromRunner"
import { AsAsyncIterable, ReadableFromOpenAIResponse } from "gjp-4-gpt"

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
    let model = config.get<string>("model") ?? "gpt-3.5-turbo"
    let endpoint =
      config.get<string>("endpoint") ??
      "https://api.openai.com/v1/chat/completions"

    let options = config.get<object>("parameters") ?? {}

    if (Object.prototype.hasOwnProperty.call(notebook.metadata.parameters, 'settings')) {
      const clonedSettings = { ...notebook.metadata.parameters.settings };
      delete notebook.metadata.parameters.settings;
      if (Object.prototype.hasOwnProperty.call(clonedSettings, 'endpoint')) {
        endpoint = clonedSettings.endpoint;
      }
      if (Object.prototype.hasOwnProperty.call(clonedSettings, 'model')) {
        model = clonedSettings.model;
      }
    }
  
    options = { ...options, ...notebook.metadata.parameters }

    console.log("Using options", options)

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

    const readable = ReadableFromOpenAIResponse(response)
    if (readable.error) {
      throw Error(
        'Error accessing OpenAI. The "Update OpenAPI Api Key" command may help you.\n' +
          (await readable.error).message,
      )
    }
    clearOutput()
    for await (const chunk of AsAsyncIterable(readable)) {
      await appendOutput(chunk)
    }
  }
