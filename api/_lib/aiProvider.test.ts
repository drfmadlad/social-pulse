import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callAiProvider, type AiJob, type ChatMessage } from "./aiProvider.js";

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
  // Covers AI_MODEL and every per-job AI_MODEL_* setting, so a developer's own shell can't leak
  // into which model a test sees.
  for (const name of Object.keys(process.env)) {
    if (name.startsWith("AI_MODEL")) delete process.env[name];
  }
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

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("throws a provider_error for an unsupported AI_PROVIDER value", async () => {
    process.env.AI_PROVIDER = "openai";

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
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

    const result = await callAiProvider(messages, "conversation");

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

    await callAiProvider(messages, "conversation");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain("test-secret-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-secret-key");
  });

  describe("choosing the model per job", () => {
    const jobs: Array<{ job: AiJob; setting: string; defaultModel: string }> = [
      { job: "conversation", setting: "AI_MODEL_CONVERSATION", defaultModel: "gemini-3.5-flash-lite" },
      { job: "hint", setting: "AI_MODEL_HINT", defaultModel: "gemini-3.5-flash-lite" },
      {
        job: "written_reply_verdict",
        setting: "AI_MODEL_WRITTEN_REPLY_VERDICT",
        defaultModel: "gemini-3.5-flash-lite",
      },
      { job: "transcription", setting: "AI_MODEL_TRANSCRIPTION", defaultModel: "gemini-3.5-flash-lite" },
      { job: "feedback_summary", setting: "AI_MODEL_FEEDBACK_SUMMARY", defaultModel: "gemini-3.5-flash" },
      { job: "insight", setting: "AI_MODEL_INSIGHT", defaultModel: "gemini-3.5-flash" },
    ];

    async function modelRequestedFor(job: AiJob): Promise<string> {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(200, { candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
      );
      vi.stubGlobal("fetch", fetchMock);

      await callAiProvider(messages, job);

      const [url] = fetchMock.mock.calls[0] as [string];
      return url.match(/\/models\/([^:]+):generateContent$/)?.[1] ?? url;
    }

    it.each(jobs)("uses $setting for the $job job when it is set", async ({ job, setting }) => {
      process.env.AI_MODEL = "shared-model";
      process.env[setting] = "job-specific-model";

      expect(await modelRequestedFor(job)).toBe("job-specific-model");
    });

    it.each(jobs)("falls back to AI_MODEL for the $job job when $setting is unset", async ({ job }) => {
      process.env.AI_MODEL = "shared-model";

      expect(await modelRequestedFor(job)).toBe("shared-model");
    });

    it.each(jobs)("treats a blank $setting as unset", async ({ job, setting }) => {
      process.env.AI_MODEL = "shared-model";
      process.env[setting] = "  ";

      expect(await modelRequestedFor(job)).toBe("shared-model");
    });

    it.each(jobs)(
      "defaults the $job job to $defaultModel when neither setting is set",
      async ({ job, defaultModel }) => {
        expect(await modelRequestedFor(job)).toBe(defaultModel);
      },
    );

    it("treats a blank AI_MODEL as unset, as a copied example env file leaves it", async () => {
      process.env.AI_MODEL = "";

      expect(await modelRequestedFor("feedback_summary")).toBe("gemini-3.5-flash");
    });

    it("never lets one job's setting change another job's model", async () => {
      process.env.AI_MODEL_FEEDBACK_SUMMARY = "summary-only-model";

      expect(await modelRequestedFor("conversation")).toBe("gemini-3.5-flash-lite");
    });
  });

  it("sends the system message as systemInstruction and other turns as contents", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "hi" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await callAiProvider(
      [
        { role: "system", content: "Be nice." },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" },
      ],
      "conversation",
    );

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

    await callAiProvider([{ role: "system", content: "Be nice." }], "conversation");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.contents).toHaveLength(1);
    expect(body.contents[0].role).toBe("user");
  });

  it("never includes the API key in the returned content or a thrown error message", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toSatisfy((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return !message.includes("test-secret-key");
    });
  });

  it("maps a 429 provider response to a rate_limited error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(429, { error: "rate limit" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "rate_limited",
    });
  });

  it("maps any other non-OK provider response to a provider_error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("maps a network failure to a provider_error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("maps an unexpected response shape to a provider_error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { unexpected: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("throws a blocked error when the whole prompt is blocked by the safety filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { promptFeedback: { blockReason: "SAFETY" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "blocked",
    });
  });

  it("throws a blocked error when a candidate's reply is blocked by the safety filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ finishReason: "SAFETY" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "blocked",
    });
  });

  it("gives a blocked error plain, actionable wording with no provider jargon", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { promptFeedback: { blockReason: "SAFETY" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toSatisfy((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return (
        !message.includes("SAFETY") &&
        !message.includes("blockReason") &&
        !/\bgemini\b/i.test(message) &&
        message.toLowerCase().includes("rephras")
      );
    });
  });

  it("throws a provider_error with a clear, actionable message when the reply text is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "" }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "provider_error",
    });
    await expect(callAiProvider(messages, "conversation")).rejects.toSatisfy((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return !message.toLowerCase().includes("unexpected response shape");
    });
  });

  it("throws a provider_error when the reply text is only whitespace", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: "   " }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(callAiProvider(messages, "conversation")).rejects.toMatchObject({
      kind: "provider_error",
    });
  });
});
