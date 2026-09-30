import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes.js";
import { rejectDisallowedRequest, sendAiProviderReply } from "./_lib/aiProxyHandler.js";
import type { ChatMessage } from "./_lib/aiProvider.js";
import { MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_LENGTH } from "./_lib/requestLimits.js";
import { getDefaultScenarioId, getScenarioPrompt } from "./_lib/scenarioPrompts.js";

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
    messages.length > MAX_CONVERSATION_MESSAGES ||
    !messages.every(isValidMessage)
  ) {
    res.status(400).json({
      error: {
        code: "invalid_request",
        message:
          `Request body must include a \`messages\` array of { role, content }, ` +
          `with at most ${MAX_CONVERSATION_MESSAGES} messages and ${MAX_MESSAGE_LENGTH} characters per message.`,
      },
    });
    return;
  }

  // The Conversation screen names its Scenario Category and Scenario instead of sending a system
  // message: the prompt for them lives only here, so this is where it's resolved and prepended. An
  // empty `messages` array is therefore valid: it's how the persona speaks first.
  const categoryId: unknown = req.body?.categoryId;
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    res.status(400).json({
      error: { code: "invalid_request", message: "Request body must include a non-empty `categoryId` string." },
    });
    return;
  }

  // The app always names its Scenario (issue #53). A request without one is a safety net for an
  // installed app still running the version from before Scenarios existed, until it takes the update
  // and reloads (the update offer is held back mid-conversation, so that can take a while). It gets
  // the category's default Scenario: the situation that version's conversations were always set in.
  const requestedScenarioId: unknown = req.body?.scenarioId;
  if (
    requestedScenarioId !== undefined &&
    (typeof requestedScenarioId !== "string" || requestedScenarioId.length === 0)
  ) {
    res.status(400).json({
      error: { code: "invalid_request", message: "`scenarioId`, when given, must be a non-empty string." },
    });
    return;
  }

  const defaultScenarioId = getDefaultScenarioId(categoryId);
  if (defaultScenarioId === undefined) {
    res.status(400).json({
      error: { code: "unknown_category", message: `Unknown Scenario Category "${categoryId}".` },
    });
    return;
  }

  // Rejects a Scenario the category doesn't have, including a real one named under another category.
  const systemPrompt = getScenarioPrompt(categoryId, requestedScenarioId ?? defaultScenarioId);
  if (systemPrompt === undefined) {
    res.status(400).json({
      error: { code: "unknown_scenario", message: "Unknown Scenario for this Scenario Category." },
    });
    return;
  }

  const finalMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...messages];

  await sendAiProviderReply(res, finalMessages, "conversation");
}
