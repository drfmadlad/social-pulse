import { afterEach, describe, expect, it, vi } from "vitest";
import { mockError, mockFeedbackSummary, mockReply } from "../test/apiMocks";
import { AiProxyError } from "./aiProxyClient";
import { requestFeedbackSummary } from "./feedbackSummary";
import { scenarioCategories } from "./scenarioCategories";

const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
const transcript = [
  { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestFeedbackSummary", () => {
  it("posts only structured fields to /api/feedback-summary, never prompt text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    await requestFeedbackSummary(category, transcript);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/feedback-summary");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      categoryName: category.name,
      personaName: category.personaName,
      transcript,
    });
  });

  it("resolves the parsed Feedback Summary on a well-formed, grounded reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFeedbackSummary()));

    const summary = await requestFeedbackSummary(category, transcript);

    expect(summary.didWell).not.toHaveLength(0);
    expect(summary.canImprove).not.toHaveLength(0);
  });

  it("rejects a reply whose quotes aren't grounded in the transcript", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockReply(
          JSON.stringify({
            didWell: [{ quote: "Something the user never said" }],
            canImprove: [{ quote: "Also never said" }],
          }),
        ),
      ),
    );

    await expect(requestFeedbackSummary(category, transcript)).rejects.toMatchObject({
      kind: "provider_error",
      message: "The AI's feedback didn't cite your actual messages. Please try again.",
    });
  });

  it("rejects unparsable JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockReply("not json")));

    await expect(requestFeedbackSummary(category, transcript)).rejects.toBeInstanceOf(AiProxyError);
  });

  it("propagates a server error as an AiProxyError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockError(429, "rate_limited", "slow down")));

    await expect(requestFeedbackSummary(category, transcript)).rejects.toMatchObject({ kind: "rate_limited" });
  });
});
