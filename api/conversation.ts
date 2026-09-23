import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes.js";
import { rejectDisallowedRequest, sendAiProviderReply } from "./_lib/aiProxyHandler.js";
import type { ChatMessage } from "./_lib/aiProvider.js";
import { getScenarioPrompt } from "./_lib/scenarioPrompts.js";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;

function isValidMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (
    (role === "user" || role === "assistant") &&
    typeof content === "string" &&
    content.length > 0 &&
    content.length <= MAX_MESSAGE_LENGTH
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectDisallowedRequest(req, res)) return;

  const messages: unknown = req.body?.messages;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    !messages.every(isValidMessage)
  ) {
    res.status(400).json({
      error: {
        code: "invalid_request",
        message:
          `Request body must include a non-empty \`messages\` array of { role, content }, ` +
          `with at most ${MAX_MESSAGES} messages and ${MAX_MESSAGE_LENGTH} characters per message.`,
      },
    });
    return;
  }

  // The Conversation screen names its Scenario Category instead of sending a system message: the
  // prompt for that category lives only here, so this is where it's resolved and prepended.
  const categoryId: unknown = req.body?.categoryId;
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    res.status(400).json({
      error: { code: "invalid_request", message: "Request body must include a non-empty `categoryId` string." },
    });
    return;
  }

  const systemPrompt = getScenarioPrompt(categoryId);
  if (systemPrompt === undefined) {
    res.status(400).json({
      error: { code: "unknown_category", message: `Unknown Scenario Category "${categoryId}".` },
    });
    return;
  }

  const finalMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages];

  await sendAiProviderReply(res, finalMessages);
}
