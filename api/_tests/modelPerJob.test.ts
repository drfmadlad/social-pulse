import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "../_lib/vercelTypes.js";
import { _resetRateLimiterForTests } from "../_lib/rateLimiter.js";
import { createMockReq, createMockRes } from "./testHelpers.js";
import conversationHandler from "../conversation.js";
import feedbackSummaryHandler from "../feedback-summary.js";
import writtenReplyVerdictHandler from "../written-reply-verdict.js";

// Each endpoint is driven through its real HTTP contract with only the provider's network call
// stubbed, so these tests see the model name exactly as it would leave the server. They pin down
// which job each endpoint runs as; the full precedence rules (job setting, then AI_MODEL, then
// the job's default) are covered once, in api/_lib/aiProvider.test.ts.

const originalEnv = { ...process.env };

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

const endpoints: Array<{
  name: string;
  handler: Handler;
  body: unknown;
  setting: string;
  defaultModel: string;
}> = [
  {
    name: "/api/conversation",
    handler: conversationHandler,
    body: { messages: [{ role: "user", content: "Hi!" }], categoryId: "dating" },
    setting: "AI_MODEL_CONVERSATION",
    defaultModel: "gemini-3.5-flash-lite",
  },
  {
    name: "/api/feedback-summary",
    handler: feedbackSummaryHandler,
    body: {
      categoryName: "Dating",
      personaName: "Jordan",
      transcript: [
        { role: "assistant", content: "Hey! Thanks for coming out tonight." },
        { role: "user", content: "Hi, nice to meet you!" },
      ],
    },
    setting: "AI_MODEL_FEEDBACK_SUMMARY",
    defaultModel: "gemini-3.5-flash",
  },
  {
    name: "/api/written-reply-verdict",
    handler: writtenReplyVerdictHandler,
    body: {
      movePractised: "Reflecting the gist back before saying anything else",
      context: "A friend is describing a stressful week at work. They say:",
      line: "Honestly it's just been one thing after another.",
      reply: "Sounds like it's been relentless.",
    },
    setting: "AI_MODEL_WRITTEN_REPLY_VERDICT",
    defaultModel: "gemini-3.5-flash-lite",
  },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.GEMINI_API_KEY = "test-secret-key";
  delete process.env.AI_PROVIDER;
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("AI_MODEL")) delete process.env[name];
  }
  _resetRateLimiterForTests();
  fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Reply." }] } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

async function modelRequestedBy(handler: Handler, body: unknown): Promise<string> {
  const res = createMockRes();
  await handler(createMockReq({ body }), res);

  expect(res.statusCode).toBe(200);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url] = fetchMock.mock.calls[0] as [string];
  return url.match(/\/models\/([^:]+):generateContent$/)?.[1] ?? url;
}

describe.each(endpoints)("POST $name model choice", ({ handler, body, setting, defaultModel }) => {
  it(`uses ${setting} when it is set`, async () => {
    process.env.AI_MODEL = "shared-model";
    process.env[setting] = "job-specific-model";

    expect(await modelRequestedBy(handler, body)).toBe("job-specific-model");
  });

  it(`defaults to ${defaultModel} when neither setting is set`, async () => {
    expect(await modelRequestedBy(handler, body)).toBe(defaultModel);
  });

  it("ignores the other jobs' settings", async () => {
    for (const other of endpoints) {
      if (other.setting !== setting) process.env[other.setting] = "another-jobs-model";
    }

    expect(await modelRequestedBy(handler, body)).toBe(defaultModel);
  });

  it("never sends the model name back to the browser", async () => {
    process.env[setting] = "job-specific-model";
    const res = createMockRes();

    await handler(createMockReq({ body }), res);

    expect(JSON.stringify(res.body)).not.toContain("job-specific-model");
  });
});
