import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiProviderError } from "../_lib/aiProvider.js";
import { RATE_LIMIT_MAX_REQUESTS, _resetRateLimiterForTests } from "../_lib/rateLimiter.js";
import { APP_HOST, APP_ORIGIN, createMockReq, createMockRes } from "./testHelpers.js";

vi.mock("../_lib/aiProvider.js", async () => {
  const actual = await vi.importActual<typeof import("../_lib/aiProvider.js")>("../_lib/aiProvider.js");
  return { ...actual, callAiProvider: vi.fn() };
});

import { callAiProvider } from "../_lib/aiProvider.js";
import handler from "../written-reply-verdict.js";

const callAiProviderMock = vi.mocked(callAiProvider);

const validBody = {
  movePractised: "Reflecting the gist back before saying anything else",
  context: "A friend is describing a stressful week at work. They say:",
  line: "Honestly it's just been one thing after another, I don't even know where to start.",
  reply: "Sounds like it's been relentless.",
};

beforeEach(() => {
  callAiProviderMock.mockReset();
  _resetRateLimiterForTests();
});

describe("POST /api/written-reply-verdict", () => {
  it("rejects non-POST methods", async () => {
    const req = createMockReq({ method: "GET" });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("rejects a request from a cross-origin caller", async () => {
    const req = createMockReq({
      headers: { origin: "https://evil.example.com", host: APP_HOST },
      body: validBody,
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("rejects a request missing any required field", async () => {
    const req = createMockReq({ body: { movePractised: validBody.movePractised } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "invalid_request" } });
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("rejects an over-length field", async () => {
    const req = createMockReq({ body: { ...validBody, context: "a".repeat(501) } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("rejects an over-length reply", async () => {
    const req = createMockReq({ body: { ...validBody, reply: "a".repeat(2001) } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("builds the system prompt server-side from the given fields and never leaks it in the response", async () => {
    callAiProviderMock.mockResolvedValue({ content: JSON.stringify({ verdict: "landed", reason: "You reflected it back." }) });
    const req = createMockReq({ body: validBody });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const [sentMessages] = callAiProviderMock.mock.calls[0];
    expect(sentMessages[0].role).toBe("system");
    expect(sentMessages[0].content).toContain(validBody.movePractised);
    expect(sentMessages[0].content).toContain(validBody.context);
    expect(sentMessages[0].content).toContain(validBody.line);
    expect(sentMessages[1]).toEqual({ role: "user", content: validBody.reply });
    expect(JSON.stringify(res.body)).not.toContain(sentMessages[0].content);
  });

  it("propagates a provider error as a distinguishable 502 response", async () => {
    callAiProviderMock.mockRejectedValue(new AiProviderError("boom", "provider_error"));
    const req = createMockReq({ body: validBody });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: { code: "provider_error" } });
  });

  it("rate-limits a caller past the per-window request threshold", async () => {
    callAiProviderMock.mockResolvedValue({ content: "{}" });

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const req = createMockReq({
        headers: { origin: APP_ORIGIN, host: APP_HOST, "x-forwarded-for": "4.4.4.4" },
        body: validBody,
      });
      await handler(req, createMockRes());
    }

    const req = createMockReq({
      headers: { origin: APP_ORIGIN, host: APP_HOST, "x-forwarded-for": "4.4.4.4" },
      body: validBody,
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
  });
});
