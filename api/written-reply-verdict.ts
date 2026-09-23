import type { VercelRequest, VercelResponse } from "./_lib/vercelTypes.js";
import { rejectDisallowedRequest, sendAiProviderReply } from "./_lib/aiProxyHandler.js";
import type { ChatMessage } from "./_lib/aiProvider.js";
import { isBoundedString } from "./_lib/validation.js";
import { buildWrittenReplyPrompt } from "./_lib/writtenReplyPrompt.js";

const MAX_FIELD_LENGTH = 500;
const MAX_REPLY_LENGTH = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectDisallowedRequest(req, res)) return;

  const { movePractised, context, line, reply } = (req.body ?? {}) as Record<string, unknown>;

  if (
    !isBoundedString(movePractised, MAX_FIELD_LENGTH) ||
    !isBoundedString(context, MAX_FIELD_LENGTH) ||
    !isBoundedString(line, MAX_FIELD_LENGTH) ||
    !isBoundedString(reply, MAX_REPLY_LENGTH)
  ) {
    res.status(400).json({
      error: {
        code: "invalid_request",
        message:
          `Request body must include non-empty \`movePractised\`, \`context\` and \`line\` strings of at most ` +
          `${MAX_FIELD_LENGTH} characters, and a non-empty \`reply\` string of at most ${MAX_REPLY_LENGTH} characters.`,
      },
    });
    return;
  }

  const finalMessages: ChatMessage[] = [
    { role: "system", content: buildWrittenReplyPrompt(movePractised, context, line) },
    { role: "user", content: reply },
  ];

  await sendAiProviderReply(res, finalMessages);
}
