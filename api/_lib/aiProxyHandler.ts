import type { VercelRequest, VercelResponse } from "@vercel/node";
import { AiProviderError, callAiProvider, type ChatMessage } from "./aiProvider.js";
import { isAllowedOrigin } from "./originCheck.js";
import { checkRateLimit, getClientKey } from "./rateLimiter.js";

/**
 * The method/origin/rate-limit checks every AI proxy endpoint shares, run before any
 * endpoint-specific body validation. Writes the rejection response and returns `true` when the
 * caller should stop here.
 */
export function rejectDisallowedRequest(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== "POST") {
    res.status(405).json({ error: { code: "method_not_allowed", message: "Only POST is supported." } });
    return true;
  }

  if (!isAllowedOrigin(req)) {
    res
      .status(403)
      .json({ error: { code: "forbidden_origin", message: "This endpoint only accepts requests from the app." } });
    return true;
  }

  const rateLimit = checkRateLimit(getClientKey(req));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: { code: "rate_limited", message: "Too many requests. Try again shortly." } });
    return true;
  }

  return false;
}

/**
 * Calls the AI provider with the endpoint's fully-resolved messages and writes its reply, mapping
 * a provider failure to the same distinguishable status every AI proxy endpoint uses.
 */
export async function sendAiProviderReply(res: VercelResponse, messages: ChatMessage[]): Promise<void> {
  try {
    const result = await callAiProvider(messages);
    res.status(200).json({ message: { role: "assistant", content: result.content } });
  } catch (error) {
    if (error instanceof AiProviderError) {
      const status = error.kind === "rate_limited" ? 429 : error.kind === "blocked" ? 422 : 502;
      res.status(status).json({ error: { code: error.kind, message: error.message } });
      return;
    }
    res.status(502).json({
      error: { code: "provider_error", message: "Unexpected error calling the AI provider." },
    });
  }
}
