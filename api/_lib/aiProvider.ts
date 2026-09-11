export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AiProviderErrorKind = "rate_limited" | "provider_error";

export class AiProviderError extends Error {
  readonly kind: AiProviderErrorKind;

  constructor(message: string, kind: AiProviderErrorKind) {
    super(message);
    this.name = "AiProviderError";
    this.kind = kind;
  }
}

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export async function callAiProvider(messages: ChatMessage[]): Promise<{ content: string }> {
  const provider = process.env.AI_PROVIDER ?? "gemini";

  if (provider !== "gemini") {
    throw new AiProviderError(`Unsupported AI_PROVIDER "${provider}".`, "provider_error");
  }

  return callGemini(messages);
}

async function callGemini(messages: ChatMessage[]): Promise<{ content: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiProviderError("The server is not configured with an AI provider API key.", "provider_error");
  }

  const model = process.env.AI_MODEL ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const systemMessage = messages.find((message) => message.role === "system");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "(Begin the conversation in character.)" }] });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage.content }] } } : {}),
      }),
    });
  } catch {
    throw new AiProviderError("Failed to reach the AI provider.", "provider_error");
  }

  if (response.status === 429) {
    throw new AiProviderError("The AI provider rate limit was hit.", "rate_limited");
  }

  if (!response.ok) {
    throw new AiProviderError(`The AI provider responded with status ${response.status}.`, "provider_error");
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new AiProviderError("The AI provider returned an unexpected response shape.", "provider_error");
  }

  return { content: text };
}
