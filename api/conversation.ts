import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AiProviderError, callAiProvider, type ChatMessage } from "./_lib/aiProvider";

function isValidMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (
    (role === "system" || role === "user" || role === "assistant") &&
    typeof content === "string" &&
    content.length > 0
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({
      error: { code: "method_not_allowed", message: "Only POST is supported." },
    });
    return;
  }

  const messages: unknown = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isValidMessage)) {
    res.status(400).json({
      error: {
        code: "invalid_request",
        message: "Request body must include a non-empty `messages` array of { role, content }.",
      },
    });
    return;
  }

  try {
    const result = await callAiProvider(messages);
    res.status(200).json({ message: { role: "assistant", content: result.content } });
  } catch (error) {
    if (error instanceof AiProviderError) {
      const status = error.kind === "rate_limited" ? 429 : 502;
      res.status(status).json({ error: { code: error.kind, message: error.message } });
      return;
    }
    res.status(502).json({
      error: { code: "provider_error", message: "Unexpected error calling the AI provider." },
    });
  }
}
