import { afterEach, describe, expect, it, vi } from "vitest";
import { mockError, mockReply } from "../test/apiMocks";
import { AiProxyError, requestAiReply } from "./aiProxyClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestAiReply", () => {
  it("resolves the assistant's reply on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockReply("Hi there!")));

    const reply = await requestAiReply([{ role: "user", content: "Hello" }]);

    expect(reply).toEqual({ role: "assistant", content: "Hi there!" });
  });

  it("sends the existing request shape, with no categoryId key at all, when called without one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockReply("Hi there!"));
    vi.stubGlobal("fetch", fetchMock);
    const messages = [
      { role: "system" as const, content: "You are a coach." },
      { role: "user" as const, content: "Hello" },
    ];

    await requestAiReply(messages);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ messages });
    expect(body).not.toHaveProperty("categoryId");
  });

  it("includes categoryId in the request body when given one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockReply("Hi there!"));
    vi.stubGlobal("fetch", fetchMock);

    await requestAiReply([{ role: "user", content: "Hello" }], "dating");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ messages: [{ role: "user", content: "Hello" }], categoryId: "dating" });
  });

  it("maps a rate_limited error to a rate_limited kind", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockError(429, "rate_limited", "slow down")));

    await expect(requestAiReply([{ role: "user", content: "Hi" }])).rejects.toMatchObject({
      kind: "rate_limited",
    });
  });

  it("maps an invalid_request error to an invalid_request kind, distinguishable from a provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockError(400, "invalid_request", "too many messages")));

    await expect(requestAiReply([{ role: "user", content: "Hi" }])).rejects.toMatchObject({
      kind: "invalid_request",
    });
  });

  it("maps an unrecognised error code to a provider_error kind", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockError(502, "provider_error", "boom")));

    await expect(requestAiReply([{ role: "user", content: "Hi" }])).rejects.toMatchObject({
      kind: "provider_error",
    });
  });

  it("maps a fetch failure to a network_error kind", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    await expect(requestAiReply([{ role: "user", content: "Hi" }])).rejects.toBeInstanceOf(AiProxyError);
    await expect(requestAiReply([{ role: "user", content: "Hi" }])).rejects.toMatchObject({
      kind: "network_error",
    });
  });
});
