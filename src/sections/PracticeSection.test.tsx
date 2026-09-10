import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAllHistoryEntries, resetHistoryStoreForTests } from "../history/historyStore";
import { scenarioCategories } from "../practice/scenarioCategories";
import { PracticeSection } from "./PracticeSection";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockReply(content: string): Response {
  return jsonResponse(200, { message: { role: "assistant", content } });
}

function mockError(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

function mockFeedbackSummary(): Response {
  return mockReply(
    JSON.stringify({
      didWell: [{ quote: "Hi, nice to meet you!", explanation: "A warm, direct opener sets a friendly tone." }],
      canImprove: [{ quote: "Hi, nice to meet you!" }],
    }),
  );
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("PracticeSection", () => {
  it("lists all six Scenario Categories", () => {
    render(<PracticeSection />);

    expect(scenarioCategories).toHaveLength(6);
    for (const category of scenarioCategories) {
      expect(screen.getByRole("button", { name: category.name })).toBeInTheDocument();
    }
  });

  it("opens a chat with the category's persona, sends a message, ends the conversation, and shows the Feedback Summary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight."))
      .mockResolvedValueOnce(mockReply("That sounds like a great start!"))
      .mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Dating" }));

    expect(await screen.findByText("Jordan")).toBeInTheDocument();
    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi, nice to meet you!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("That sounds like a great start!")).toBeInTheDocument();
    expect(screen.getByText("Hi, nice to meet you!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText("What you can do better")).toBeInTheDocument();
    expect(screen.getAllByText("“Hi, nice to meet you!”")).toHaveLength(2);
    expect(screen.getByText("A warm, direct opener sets a friendly tone.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await waitFor(async () => {
      const entries = await getAllHistoryEntries();
      expect(entries).toHaveLength(1);
    });
    const [entry] = await getAllHistoryEntries();
    expect(entry.categoryId).toBe("dating");
    expect(entry.personaName).toBe("Jordan");
    expect(entry.transcript).toEqual([
      { role: "assistant", content: "Hey! Thanks for coming out tonight." },
      { role: "user", content: "Hi, nice to meet you!" },
      { role: "assistant", content: "That sounds like a great start!" },
    ]);
    expect(entry.summary.didWell).toHaveLength(1);
    expect(entry.summary.canImprove).toHaveLength(1);
  });

  it("shows a visible error with a retry action when an AI call fails, and recovers on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockError(429, "rate_limited", "Slow down and try again shortly."))
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Job Interview" }));

    expect(await screen.findByText("Slow down and try again shortly.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a visible error with a retry action when Feedback Summary generation fails, and recovers on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"))
      .mockResolvedValueOnce(mockError(500, "provider_error", "Could not generate feedback right now."))
      .mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Networking" }));

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi, nice to meet you!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Likewise!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    expect(await screen.findByText("Could not generate feedback right now.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("shows a visible error when the AI's feedback doesn't cite the user's actual messages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight."))
      .mockResolvedValueOnce(mockReply("That's great to hear!"))
      .mockResolvedValueOnce(mockReply(JSON.stringify({ didWell: [{ quote: "words the user never said" }], canImprove: [{ quote: "another made-up quote" }] })));
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Public Speaking" }));

    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Something I actually said." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("That's great to hear!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("What you did well")).not.toBeInTheDocument();
  });

  it("does not retry automatically after a failure", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Small Talk" }));

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
