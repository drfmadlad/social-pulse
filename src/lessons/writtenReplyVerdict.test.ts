import { afterEach, describe, expect, it, vi } from "vitest";
import { mockError, mockReply, mockWrittenReplyVerdict } from "../test/apiMocks";
import { AiProxyError } from "../practice/aiProxyClient";
import type { WrittenReplyStep } from "./lessons";
import { requestWrittenReplyVerdict } from "./writtenReplyVerdict";

const step: WrittenReplyStep = {
  kind: "written-reply",
  context: "A friend is describing a stressful week at work. They say:",
  line: "Honestly it's just been one thing after another, I don't even know where to start.",
  movePractised: "Reflecting the gist back before saying anything else",
  exampleReply: "Sounds like it's been relentless.",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestWrittenReplyVerdict", () => {
  it("posts only structured fields to /api/written-reply-verdict, never prompt text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockWrittenReplyVerdict("landed", "You reflected it back well."));
    vi.stubGlobal("fetch", fetchMock);

    await requestWrittenReplyVerdict(step, "Sounds like a lot has piled up at once.");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/written-reply-verdict");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      movePractised: step.movePractised,
      context: step.context,
      line: step.line,
      reply: "Sounds like a lot has piled up at once.",
    });
  });

  it("resolves the parsed verdict on a well-formed reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockWrittenReplyVerdict("landed", "You reflected it back well.")));

    const result = await requestWrittenReplyVerdict(step, "Sounds like a lot has piled up at once.");

    expect(result).toEqual({ verdict: "landed", reason: "You reflected it back well." });
  });

  it("rejects unparsable JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockReply("not json")));

    await expect(requestWrittenReplyVerdict(step, "reply")).rejects.toBeInstanceOf(AiProxyError);
  });

  it("propagates a server error as an AiProxyError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockError(502, "provider_error", "boom")));

    await expect(requestWrittenReplyVerdict(step, "reply")).rejects.toMatchObject({ kind: "provider_error" });
  });
});
