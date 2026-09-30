/**
 * Contract tests: a request the app can send must never be rejected by the server as invalid
 * (issue #47).
 *
 * App tests fake the network and handler tests build their own request bodies, so neither side
 * notices when the two drift apart. That's how every Practice Conversation's opening line
 * (`{ messages: [], categoryId }`) was rejected for days. Here the app's own client functions
 * build each request, and a stubbed `fetch` hands it to the real serverless handler in-process,
 * the way Vercel would. Only the AI provider call is stubbed: nothing reaches the network or an AI.
 *
 * ADDING AN ENDPOINT (Hints, transcription, Insights, ...): register its handler in
 * `handlersByEndpoint`, then add its cases to `contractCases`, each calling the app's client
 * function with the inputs its screen passes (including edge shapes like an empty list) and an
 * AI reply that client accepts. Nothing else in this file needs to change.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimiterForTests } from "../_lib/rateLimiter.js";
import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes.js";
import { createMockReq, createMockRes } from "./testHelpers.js";
import { lessons, type WrittenReplyStep } from "../../src/lessons/lessons.js";
import { requestWrittenReplyVerdict } from "../../src/lessons/writtenReplyVerdict.js";
import { requestAiProxy, requestAiReply, type ChatMessage } from "../../src/practice/aiProxyClient.js";
import { requestFeedbackSummary } from "../../src/practice/feedbackSummary.js";
import { scenarioCategories } from "../../src/practice/scenarioCategories.js";

vi.mock("../_lib/aiProvider.js", async () => {
  const actual = await vi.importActual<typeof import("../_lib/aiProvider.js")>("../_lib/aiProvider.js");
  return { ...actual, callAiProvider: vi.fn() };
});

import { callAiProvider } from "../_lib/aiProvider.js";
import conversationHandler from "../conversation.js";
import feedbackSummaryHandler from "../feedback-summary.js";
import writtenReplyVerdictHandler from "../written-reply-verdict.js";

const callAiProviderMock = vi.mocked(callAiProvider);

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

/** The path the app fetches → the serverless function Vercel routes it to. */
const handlersByEndpoint: Record<string, Handler> = {
  "/api/conversation": conversationHandler,
  "/api/feedback-summary": feedbackSummaryHandler,
  "/api/written-reply-verdict": writtenReplyVerdictHandler,
};

/**
 * Stands in for `fetch`: runs the request through the real handler and answers with what it
 * wrote. Like Vercel, it only parses the body as JSON when the app says it's JSON.
 */
async function fetchThroughRealHandler(endpoint: string, init?: RequestInit): Promise<Response> {
  const handler = handlersByEndpoint[endpoint];
  if (!handler) {
    // A response rather than a throw: the client turns a thrown fetch into a generic "could not
    // reach the server" error, which would hide this message.
    return Response.json(
      { error: { code: "not_found", message: `No handler registered for ${endpoint} in handlersByEndpoint.` } },
      { status: 404 },
    );
  }

  const isJson = new Headers(init?.headers).get("Content-Type") === "application/json";
  const rawBody = String(init?.body ?? "");
  const req = createMockReq({ method: init?.method, body: isJson ? JSON.parse(rawBody) : rawBody });
  const res = createMockRes();

  await handler(req, res);

  return Response.json(res.body, { status: res.statusCode });
}

interface ContractCase {
  /** Which request this is, as it appears in the test name. */
  name: string;
  /** What the stubbed AI provider answers, shaped so the app's client accepts it. */
  aiReply: string;
  /** Sends the request the way the app does: through its own client function. */
  send: () => Promise<unknown>;
}

const userTurn: ChatMessage = { role: "user", content: "Hi! Sorry I'm a little late, the traffic was awful." };

/** A Conversation screen's turns: the Persona always speaks first, then turns alternate. */
function conversationSoFar(personaName: string): ChatMessage[] {
  return [{ role: "assistant", content: `Hey, I'm ${personaName}. Good to finally meet you.` }, userTurn];
}

/** A Feedback Summary the client accepts: every quote must be one of the user's own messages. */
const feedbackSummaryReply = JSON.stringify({
  didWell: [{ quote: userTurn.content, explanation: "Owning the delay straight away sets an easy tone." }],
  canImprove: [{ quote: userTurn.content }],
});

const writtenReplySteps = lessons.flatMap((lesson) =>
  lesson.steps
    .filter((step): step is WrittenReplyStep => step.kind === "written-reply")
    .map((step, index) => ({ label: `${lesson.title} #${index + 1}`, step })),
);

const contractCases: ContractCase[] = [
  ...scenarioCategories.flatMap((category): ContractCase[] => [
    {
      name: `conversation, ${category.name}: the Persona's opening line (no messages yet)`,
      aiReply: `Hey, I'm ${category.personaName}.`,
      send: () => requestAiReply([], category.id),
    },
    {
      name: `conversation, ${category.name}: a reply to the user`,
      aiReply: "No worries at all.",
      send: () => requestAiReply(conversationSoFar(category.personaName), category.id),
    },
    {
      name: `feedback summary, ${category.name}: an ended conversation`,
      aiReply: feedbackSummaryReply,
      send: () =>
        requestFeedbackSummary(category, [
          ...conversationSoFar(category.personaName),
          { role: "assistant", content: "No worries at all." },
        ]),
    },
    {
      // Ending is allowed while the Persona's reply has failed, so the transcript ends on the user.
      name: `feedback summary, ${category.name}: ended while the Persona's reply had failed`,
      aiReply: feedbackSummaryReply,
      send: () => requestFeedbackSummary(category, conversationSoFar(category.personaName)),
    },
  ]),
  ...writtenReplySteps.map(
    ({ label, step }): ContractCase => ({
      name: `written reply verdict, ${label}`,
      aiReply: JSON.stringify({ verdict: "landed", reason: "You reflected what they said first." }),
      send: () => requestWrittenReplyVerdict(step, "Sounds like a lot has piled up at once."),
    }),
  ),
];

beforeEach(() => {
  callAiProviderMock.mockReset();
  _resetRateLimiterForTests();
  vi.stubGlobal("fetch", fetchThroughRealHandler);
  return () => vi.unstubAllGlobals();
});

describe("the app's AI requests pass the server's real validation", () => {
  it.each(contractCases)("$name", async ({ aiReply, send }) => {
    callAiProviderMock.mockResolvedValue({ content: aiReply });

    await expect(send()).resolves.toBeDefined();
    expect(callAiProviderMock).toHaveBeenCalledTimes(1);
  });

  it("fails a request the server rejects, so a drifted body can't pass unnoticed", async () => {
    await expect(requestAiProxy("/api/conversation", { messages: [] })).rejects.toMatchObject({
      kind: "invalid_request",
    });
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });
});
