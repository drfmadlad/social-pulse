import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes.js";
import { rejectDisallowedRequest, sendAiProviderReply } from "./_lib/aiProxyHandler.js";
import type { ChatMessage } from "./_lib/aiProvider.js";
import { buildFeedbackSummaryPrompt, FEEDBACK_SUMMARY_CLOSING_MESSAGE } from "./_lib/feedbackSummaryPrompt.js";
import { isBoundedString } from "./_lib/validation.js";

const MAX_NAME_LENGTH = 100;
const MAX_TRANSCRIPT_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;

function isValidTranscriptMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === "user" || role === "assistant") && isBoundedString(content, MAX_MESSAGE_LENGTH);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectDisallowedRequest(req, res)) return;

  const { categoryName, personaName, transcript } = (req.body ?? {}) as Record<string, unknown>;

  if (!isBoundedString(categoryName, MAX_NAME_LENGTH) || !isBoundedString(personaName, MAX_NAME_LENGTH)) {
    res.status(400).json({
      error: {
        code: "invalid_request",
        message: `Request body must include non-empty \`categoryName\` and \`personaName\` strings of at most ${MAX_NAME_LENGTH} characters.`,
      },
    });
    return;
  }

  if (
    !Array.isArray(transcript) ||
    transcript.length === 0 ||
    transcript.length > MAX_TRANSCRIPT_MESSAGES ||
    !transcript.every(isValidTranscriptMessage)
  ) {
    res.status(400).json({
      error: {
        code: "invalid_request",
        message:
          `Request body must include a non-empty \`transcript\` array of { role: "user" | "assistant", content }, ` +
          `with at most ${MAX_TRANSCRIPT_MESSAGES} messages and ${MAX_MESSAGE_LENGTH} characters per message.`,
      },
    });
    return;
  }

  const finalMessages: ChatMessage[] = [
    { role: "system", content: buildFeedbackSummaryPrompt(categoryName, personaName) },
    ...transcript,
    { role: "user", content: FEEDBACK_SUMMARY_CLOSING_MESSAGE },
  ];

  await sendAiProviderReply(res, finalMessages);
}
