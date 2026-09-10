export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AiProxyErrorKind = "rate_limited" | "provider_error" | "network_error";

export class AiProxyError extends Error {
  readonly kind: AiProxyErrorKind;

  constructor(message: string, kind: AiProxyErrorKind) {
    super(message);
    this.name = "AiProxyError";
    this.kind = kind;
  }
}

export async function requestAiReply(messages: ChatMessage[]): Promise<ChatMessage> {
  let response: Response;
  try {
    response = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch {
    throw new AiProxyError("Could not reach the server. Check your connection and try again.", "network_error");
  }

  const data = (await response.json().catch(() => null)) as {
    message?: { content?: string };
    error?: { code?: string; message?: string };
  } | null;

  if (!response.ok) {
    const kind: AiProxyErrorKind = data?.error?.code === "rate_limited" ? "rate_limited" : "provider_error";
    throw new AiProxyError(data?.error?.message ?? "The AI service failed to respond.", kind);
  }

  if (typeof data?.message?.content !== "string") {
    throw new AiProxyError("Received an unexpected response from the server.", "provider_error");
  }

  return { role: "assistant", content: data.message.content };
}
