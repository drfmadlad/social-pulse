export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type AiProxyErrorKind =
  | "rate_limited"
  | "invalid_request"
  | "blocked"
  | "provider_error"
  | "network_error"
  | "timeout";

export class AiProxyError extends Error {
  readonly kind: AiProxyErrorKind;

  constructor(message: string, kind: AiProxyErrorKind) {
    super(message);
    this.name = "AiProxyError";
    this.kind = kind;
  }
}

// Comfortably under the serverless function's own 30s ceiling (vercel.json), so the browser gives
// up before that response could still land, rather than exceeding it silently.
export const AI_REPLY_TIMEOUT_MS = 20_000;

/**
 * Posts a structured body to one of the AI proxy's endpoints and returns its reply. Shared by
 * every caller so the fetch/timeout/error-mapping logic lives in one place — each endpoint
 * resolves its own server-owned prompt from the fields it's given, never a caller-supplied one.
 */
export async function requestAiProxy(endpoint: string, body: unknown): Promise<ChatMessage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_REPLY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new AiProxyError("The request timed out. Please try again.", "timeout");
    }
    throw new AiProxyError("Could not reach the server. Check your connection and try again.", "network_error");
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await response.json().catch(() => null)) as {
    message?: { content?: string };
    error?: { code?: string; message?: string };
  } | null;

  if (!response.ok) {
    const code = data?.error?.code;
    const kind: AiProxyErrorKind =
      code === "rate_limited"
        ? "rate_limited"
        : code === "invalid_request"
          ? "invalid_request"
          : code === "blocked"
            ? "blocked"
            : "provider_error";
    throw new AiProxyError(data?.error?.message ?? "The AI service failed to respond.", kind);
  }

  if (typeof data?.message?.content !== "string") {
    throw new AiProxyError("Received an unexpected response from the server.", "provider_error");
  }

  return { role: "assistant", content: data.message.content };
}

/**
 * `categoryId` names the Practice Conversation's Scenario Category instead of carrying its
 * prompt: the prompt itself lives only in the serverless function, keyed by that id. The server
 * requires it on every request, so it's never optional here either.
 */
export async function requestAiReply(messages: ChatMessage[], categoryId: string): Promise<ChatMessage> {
  return requestAiProxy("/api/conversation", { messages, categoryId });
}
