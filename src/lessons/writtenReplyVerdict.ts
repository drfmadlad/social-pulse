import { AiProxyError, requestAiReply, type ChatMessage } from "../practice/aiProxyClient";
import type { WrittenReplyStep } from "./lessons";

export type WrittenReplyVerdict = "landed" | "not_yet";

export interface WrittenReplyResult {
  verdict: WrittenReplyVerdict;
  reason: string;
}

function buildWrittenReplySystemPrompt(step: WrittenReplyStep): string {
  return (
    "You are an expert, encouraging communication coach helping someone practice a specific " +
    `conversational move: ${step.movePractised}.\n\n` +
    `Scene: ${step.context}\n` +
    `The other person says: "${step.line}"\n\n` +
    "The next message is the user's written reply to that line. Judge only whether it successfully " +
    "practises the move, not overall writing quality.\n\n" +
    "Reply with ONLY strict JSON matching this exact shape, no markdown code fences and no extra commentary:\n" +
    '{"verdict":"landed"|"not_yet","reason":"<one short sentence, second person>"}\n\n' +
    'Use "landed" when the reply successfully practises the move, and "not_yet" otherwise. The reason names ' +
    "what the reply did, and for not_yet, what the move would add. Never mention right or wrong, correct, " +
    "pass or fail, a number, stars, a percentage, or rewrite the user's reply."
  );
}

function isWrittenReplyResult(value: unknown): value is WrittenReplyResult {
  if (typeof value !== "object" || value === null) return false;
  const { verdict, reason } = value as Record<string, unknown>;
  return (verdict === "landed" || verdict === "not_yet") && typeof reason === "string" && reason.trim().length > 0;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

export async function requestWrittenReplyVerdict(step: WrittenReplyStep, reply: string): Promise<WrittenReplyResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildWrittenReplySystemPrompt(step) },
    { role: "user", content: reply },
  ];

  const response = await requestAiReply(messages);

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
