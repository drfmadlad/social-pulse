import type { VercelRequest, VercelResponse } from "@vercel/node";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiProviderError } from "../_lib/aiProvider.js";

vi.mock("../_lib/aiProvider.js", async () => {
  const actual = await vi.importActual<typeof import("../_lib/aiProvider.js")>("../_lib/aiProvider.js");
  return { ...actual, callAiProvider: vi.fn() };
});

import { callAiProvider } from "../_lib/aiProvider.js";
import handler from "../conversation.js";

const callAiProviderMock = vi.mocked(callAiProvider);

function createMockReq(overrides: Partial<VercelRequest>): VercelRequest {
  return { method: "POST", body: {}, ...overrides } as VercelRequest;
}

function chatMessage(content = "hi"): { role: "user"; content: string } {
  return { role: "user", content };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res as unknown as VercelResponse & { statusCode: number; body: unknown };
}

beforeEach(() => {
  callAiProviderMock.mockReset();
});

describe("POST /api/conversation", () => {
  it("rejects non-POST methods", async () => {
    const req = createMockReq({ method: "GET" });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toMatchObject({ error: { code: "method_not_allowed" } });
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no messages array", async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "invalid_request" } });
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("rejects a request with an empty messages array", async () => {
    const req = createMockReq({ body: { messages: [] } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "invalid_request" } });
  });

  it("rejects a request with an invalid message shape", async () => {
    const req = createMockReq({ body: { messages: [{ role: "narrator", content: "hi" }] } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "invalid_request" } });
  });

  it("rejects a request over the max message count", async () => {
    const messages = Array.from({ length: 41 }, () => chatMessage());
    const req = createMockReq({ body: { messages } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "invalid_request" } });
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("accepts a request at the max message count", async () => {
    callAiProviderMock.mockResolvedValue({ content: "ok" });
    const messages = Array.from({ length: 40 }, () => chatMessage());
    const req = createMockReq({ body: { messages } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(callAiProviderMock).toHaveBeenCalledWith(messages);
  });

  it("rejects a message over the max content length", async () => {
    const messages = [chatMessage("a".repeat(2001))];
    const req = createMockReq({ body: { messages } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: "invalid_request" } });
    expect(callAiProviderMock).not.toHaveBeenCalled();
  });

  it("accepts a message at the max content length", async () => {
    callAiProviderMock.mockResolvedValue({ content: "ok" });
    const messages = [chatMessage("a".repeat(2000))];
    const req = createMockReq({ body: { messages } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(callAiProviderMock).toHaveBeenCalledWith(messages);
  });

  it("forwards valid messages to the AI provider and returns its reply", async () => {
    callAiProviderMock.mockResolvedValue({ content: "Nice to meet you!" });
    const messages = [{ role: "user" as const, content: "Hi, I'm nervous about this date." }];
    const req = createMockReq({ body: { messages } });
    const res = createMockRes();

    await handler(req, res);

    expect(callAiProviderMock).toHaveBeenCalledWith(messages);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: { role: "assistant", content: "Nice to meet you!" } });
  });

  it("propagates a rate-limit error as a distinguishable 429 response", async () => {
    callAiProviderMock.mockRejectedValue(new AiProviderError("slow down", "rate_limited"));
    const req = createMockReq({ body: { messages: [{ role: "user", content: "hi" }] } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: { code: "rate_limited" } });
  });

  it("propagates a provider error as a distinguishable 502 response", async () => {
    callAiProviderMock.mockRejectedValue(new AiProviderError("boom", "provider_error"));
    const req = createMockReq({ body: { messages: [{ role: "user", content: "hi" }] } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: { code: "provider_error" } });
  });

  it("never includes any API key or env var value in the response body", async () => {
    process.env.GEMINI_API_KEY = "super-secret-value";
    callAiProviderMock.mockResolvedValue({ content: "hello" });
    const req = createMockReq({ body: { messages: [{ role: "user", content: "hi" }] } });
    const res = createMockRes();

    await handler(req, res);

    expect(JSON.stringify(res.body)).not.toContain("super-secret-value");
    delete process.env.GEMINI_API_KEY;
  });
});
