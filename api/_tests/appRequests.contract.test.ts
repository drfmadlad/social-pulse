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
 *
 * LIMITS (issue #58): `contractCases` also holds the shared limits' boundaries (the longest
 * conversation, the longest line). What the client functions can't show is that the app never goes
 * past them, so the last block runs the Conversation screen's own conversation model against the
 * real handlers until it stops offering the composer.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimiterForTests } from "../_lib/rateLimiter.js";
import { MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_LENGTH } from "../_lib/requestLimits.js";
import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes.js";
import { createMockReq, createMockRes } from "./testHelpers.js";
import { lessons, type WrittenReplyStep } from "../../src/lessons/lessons.js";
import { requestWrittenReplyVerdict } from "../../src/lessons/writtenReplyVerdict.js";
import { requestAiProxy, requestAiReply, type ChatMessage } from "../../src/practice/aiProxyClient.js";
import { requestFeedbackSummary } from "../../src/practice/feedbackSummary.js";
import { scenarioCategories } from "../../src/practice/scenarioCategories.js";
import { usePracticeConversation } from "../../src/practice/usePracticeConversation.js";

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

/**
 * A conversation `length` messages long, shaped the way the Conversation screen builds one: the
 * Persona speaks first, then turns alternate.
 */
function conversationOfLength(length: number): ChatMessage[] {
  return Array.from({ length }, (_, index): ChatMessage =>
    index % 2 === 0 ? { role: "assistant", content: `Persona line ${index / 2 + 1}.` } : userTurn,
  );
}

/** The longest line the app lets the user type (issue #58). */
const lineAtTheLengthLimit = "a".repeat(MAX_MESSAGE_LENGTH);

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

  // The shared limits' boundaries (issue #58): the longest conversation and the longest line the
  // app allows. The app can't go past them; see "a conversation run to its length limit" below.
  {
    name: `conversation at the length limit: a reply to ${MAX_CONVERSATION_MESSAGES} messages`,
    aiReply: "No worries at all.",
    send: () => requestAiReply(conversationOfLength(MAX_CONVERSATION_MESSAGES), scenarioCategories[0].id),
  },
  {
    name: `feedback summary at the length limit: a transcript of ${MAX_CONVERSATION_MESSAGES} messages`,
    aiReply: feedbackSummaryReply,
    send: () => requestFeedbackSummary(scenarioCategories[0], conversationOfLength(MAX_CONVERSATION_MESSAGES)),
  },
  {
    name: `conversation: a line of ${MAX_MESSAGE_LENGTH} characters`,
    aiReply: "No worries at all.",
    send: () =>
      requestAiReply([...conversationOfLength(1), { role: "user", content: lineAtTheLengthLimit }], scenarioCategories[0].id),
  },
  {
    name: `feedback summary: a transcript with a line of ${MAX_MESSAGE_LENGTH} characters`,
    aiReply: feedbackSummaryReply,
    send: () =>
      requestFeedbackSummary(scenarioCategories[0], [
        ...conversationOfLength(2),
        { role: "assistant", content: "Go on." },
        { role: "user", content: lineAtTheLengthLimit },
      ]),
  },
  {
    name: `written reply verdict: a reply of ${MAX_MESSAGE_LENGTH} characters`,
    aiReply: JSON.stringify({ verdict: "landed", reason: "You reflected what they said first." }),
    send: () => requestWrittenReplyVerdict(writtenReplySteps[0].step, lineAtTheLengthLimit),
  },
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

/**
 * The app's side of the length limit (issue #58): the Conversation screen's own conversation model,
 * run against the real handlers until it stops offering the composer. Every request it makes on the
 * way has to pass, its transcript has to pass as a Feedback Summary, and past the limit (or past
 * the per-line length) it must not send at all.
 */
describe("a conversation run to its length limit through the app's conversation model", () => {
  const category = scenarioCategories[0];

  beforeEach(() => {
    // A real user spreads these requests over far longer than the rate limiter's window; this
    // test sends them back to back, so each one starts with a fresh window.
    vi.stubGlobal("fetch", (endpoint: string, init?: RequestInit) => {
      _resetRateLimiterForTests();
      return fetchThroughRealHandler(endpoint, init);
    });
    callAiProviderMock.mockResolvedValue({ content: "No worries at all." });
  });

  async function openConversation() {
    const view = renderHook(() => usePracticeConversation(category.id));
    await waitFor(() => expect(view.result.current.isAwaitingReply).toBe(false));
    expect(view.result.current.errorMessage).toBeNull();
    return view;
  }

  async function say(view: Awaited<ReturnType<typeof openConversation>>, line: string) {
    act(() => view.result.current.send(line));
    await waitFor(() => expect(view.result.current.isAwaitingReply).toBe(false));
  }

  it("passes the server at every turn up to the limit, then won't send another line", async () => {
    const view = await openConversation();

    while (view.result.current.lengthLimit !== "reached") {
      expect(callAiProviderMock.mock.calls.length).toBeLessThanOrEqual(MAX_CONVERSATION_MESSAGES); // never loop forever
      await say(view, userTurn.content);
      expect(view.result.current.errorMessage).toBeNull();
    }

    const { turns } = view.result.current;
    const requestsSoFar = callAiProviderMock.mock.calls.length;
    await say(view, "One more thing…");
    expect(callAiProviderMock).toHaveBeenCalledTimes(requestsSoFar);
    expect(view.result.current.turns).toEqual(turns);

    callAiProviderMock.mockResolvedValue({ content: feedbackSummaryReply });
    await expect(requestFeedbackSummary(category, turns)).resolves.toBeDefined();
  });

  it("sends a line at the per-line length limit, and won't send a longer one", async () => {
    const view = await openConversation();

    await say(view, lineAtTheLengthLimit);
    expect(view.result.current.errorMessage).toBeNull();
    expect(view.result.current.turns.at(-2)).toEqual({ role: "user", content: lineAtTheLengthLimit });

    const requestsSoFar = callAiProviderMock.mock.calls.length;
    await say(view, `${lineAtTheLengthLimit}a`);
    expect(callAiProviderMock).toHaveBeenCalledTimes(requestsSoFar);
  });
});
