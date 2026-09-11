import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAiProvider, type ChatMessage } from "./aiProvider";

const originalEnv = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.GEMINI_API_KEY = "test-secret-key";
  delete process.env.AI_PROVIDER;
  delete process.env.AI_MODEL;
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

const messages: ChatMessage[] = [
  { role: "system", content: "You are a helpful persona." },
  { role: "user", content: "Hi there" },
];

describe("callAiProvider", () => {
  it("throws a provider_error when no API key is configured", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(callAiProvider(messages)).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("throws a provider_error for an unsupported AI_PROVIDER value", async () => {
    process.env.AI_PROVIDER = "openai";

    await expect(callAiProvider(messages)).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("calls the Gemini API using the model from AI_MODEL and returns its text", async () => {
    process.env.AI_MODEL = "gemini-2.5-flash";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "Hello back!" }] } }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callAiProvider(messages);

    expect(result).toEqual({ content: "Hello back!" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("gemini-2.5-flash");
  });

  it("sends the API key as a request header, never in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await callAiProvider(messages);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("test-secret-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-secret-key");
  });

  it("defaults to gemini-3.5-flash-lite when AI_MODEL is unset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await callAiProvider(messages);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("gemini-3.5-flash-lite");
  });

  it("sends the system message as systemInstruction and other turns as contents", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await callAiProvider([
      { role: "system", content: "Be nice." },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
    ]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.systemInstruction).toEqual({ parts: [{ text: "Be nice." }] });
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Hello" }] },
      { role: "model", parts: [{ text: "Hi!" }] },
    ]);
  });

  it("sends a synthetic starter turn when there are no user/assistant messages yet", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await callAiProvider([{ role: "system", content: "Be nice." }]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0].role).toBe("user");
  });

  it("never includes the API key in the returned content or a thrown error message", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages)).rejects.toSatisfy((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return !message.includes("test-secret-key");
    });
  });

  it("maps a 429 provider response to a rate_limited error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, { error: "rate limit" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages)).rejects.toMatchObject({
      kind: "rate_limited",
    });
  });

  it("maps any other non-OK provider response to a provider_error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages)).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("maps a network failure to a provider_error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages)).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("maps an unexpected response shape to a provider_error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { unexpected: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages)).rejects.toMatchObject({
      kind: "provider_error",
    });
  });
});
