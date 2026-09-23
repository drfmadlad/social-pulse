import { AiProxyError, requestAiProxy } from "../practice/aiProxyClient";
import { stripCodeFences } from "../practice/stripCodeFences";
import type { WrittenReplyStep } from "./lessons";

export type WrittenReplyVerdict = "landed" | "not_yet";

export interface WrittenReplyResult {
  verdict: WrittenReplyVerdict;
  reason: string;
}

function isWrittenReplyResult(value: unknown): value is WrittenReplyResult {
  if (typeof value !== "object" || value === null) return false;
  const { verdict, reason } = value as Record<string, unknown>;
  return (verdict === "landed" || verdict === "not_yet") && typeof reason === "string" && reason.trim().length > 0;
}

export async function requestWrittenReplyVerdict(step: WrittenReplyStep, reply: string): Promise<WrittenReplyResult> {
  const response = await requestAiProxy("/api/written-reply-verdict", {
    movePractised: step.movePractised,
    context: step.context,
    line: step.line,
    reply,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(response.content));
  } catch {
    throw new AiProxyError("Received an unreadable verdict from the AI.", "provider_error");
  }

  if (!isWrittenReplyResult(parsed)) {
    throw new AiProxyError("Received an unexpected verdict shape from the AI.", "provider_error");
  }

  return parsed;
}
