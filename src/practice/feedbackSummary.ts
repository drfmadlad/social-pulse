import { AiProxyError, requestAiReply, type ChatMessage } from "./aiProxyClient";
import type { ScenarioCategory } from "./scenarioCategories";
import { stripCodeFences } from "./stripCodeFences";

export interface FeedbackPoint {
  quote: string;
  explanation?: string;
}

export interface FeedbackSummary {
  didWell: FeedbackPoint[];
  canImprove: FeedbackPoint[];
}

function buildFeedbackSystemPrompt(category: ScenarioCategory): string {
  return (
    `You are an expert, encouraging communication coach. The user just finished rehearsing a ${category.name} ` +
    `scenario in a practice conversation with an AI persona named ${category.personaName}. Review only the ` +
    "user's own messages in the transcript above and produce a Feedback Summary.\n\n" +
    "Reply with ONLY strict JSON matching this exact shape, no markdown code fences and no extra commentary:\n" +
    '{"didWell":[{"quote":"<short exact quote from the user\'s messages>","explanation":"<short explanation, ' +
    'omit or leave empty if the point is self-evident>"}],"canImprove":[{"quote":"...","explanation":"..."}]}\n\n' +
    "Include 2-4 points in each of didWell and canImprove. Every point's quote must be copied verbatim from one " +
    "of the user's messages above. Only include an explanation when the reason the point matters isn't obvious " +
    "from the quote alone."
  );
}

function isFeedbackPoint(value: unknown): value is FeedbackPoint {
  if (typeof value !== "object" || value === null) return false;
  const { quote, explanation } = value as Record<string, unknown>;
  return (
    typeof quote === "string" &&
    quote.length > 0 &&
    (explanation === undefined || typeof explanation === "string")
  );
}

function isFeedbackSummary(value: unknown): value is FeedbackSummary {
  if (typeof value !== "object" || value === null) return false;
  const { didWell, canImprove } = value as Record<string, unknown>;
  return (
    Array.isArray(didWell) &&
    didWell.length > 0 &&
    didWell.every(isFeedbackPoint) &&
    Array.isArray(canImprove) &&
    canImprove.length > 0 &&
    canImprove.every(isFeedbackPoint)
  );
}

/**
 * Prompt-following alone can't guarantee the AI quoted the user verbatim
 * rather than paraphrasing or inventing a point, so every quote is checked
 * against the user's actual messages before the summary is trusted.
 */
function isGroundedInTranscript(summary: FeedbackSummary, transcript: ChatMessage[]): boolean {
  const userText = transcript
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");

  return [...summary.didWell, ...summary.canImprove].every((point) => userText.includes(point.quote));
}

export async function requestFeedbackSummary(
  category: ScenarioCategory,
  transcript: ChatMessage[],
): Promise<FeedbackSummary> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildFeedbackSystemPrompt(category) },
    ...transcript,
    {
      role: "user",
      content: "The conversation has ended. Provide your Feedback Summary now as JSON, following the exact schema and rules above.",
    },
  ];

  const reply = await requestAiReply(messages);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(reply.content));
  } catch {
    throw new AiProxyError("Received an unreadable Feedback Summary from the AI. Please try again.", "provider_error");
  }

  if (!isFeedbackSummary(parsed)) {
    throw new AiProxyError(
      "Received an unexpected Feedback Summary shape from the AI. Please try again.",
      "provider_error",
    );
  }

  if (!isGroundedInTranscript(parsed, transcript)) {
    throw new AiProxyError(
      "The AI's feedback didn't cite your actual messages. Please try again.",
      "provider_error",
    );
  }

  return parsed;
}
