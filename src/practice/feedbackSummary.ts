import { AiProxyError, requestAiProxy, type ChatMessage } from "./aiProxyClient";
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
  const reply = await requestAiProxy("/api/feedback-summary", {
    categoryName: category.name,
    personaName: category.personaName,
    transcript,
  });

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
