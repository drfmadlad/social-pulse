import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { resetHistoryStoreForTests } from "./history/historyStore";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockReply(content: string): Response {
  return jsonResponse(200, { message: { role: "assistant", content } });
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

describe("App", () => {
  it("renders a single scrollable home feed with Lessons, Practice, and History sections in order", () => {
    render(<App />);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Lessons",
      "Practice",
      "History",
    ]);
  });

  it("does not render tab navigation", () => {
    render(<App />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("adds a completed Practice Conversation to History, and reopening it shows the correct transcript and Feedback Summary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight."))
      .mockResolvedValueOnce(mockReply("That sounds like a great start!"))
      .mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const practiceSection = screen.getByRole("heading", { name: "Practice" }).closest("section")!;
    const historySection = screen.getByRole("heading", { name: "History" }).closest("section")!;

    expect(within(historySection).getByText("Past Practice Conversations will appear here soon.")).toBeInTheDocument();

    fireEvent.click(within(practiceSection).getByRole("button", { name: "Dating" }));
    expect(await within(practiceSection).findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();

    fireEvent.change(within(practiceSection).getByLabelText("Message"), {
      target: { value: "Hi, nice to meet you!" },
    });
    fireEvent.click(within(practiceSection).getByRole("button", { name: "Send" }));
    expect(await within(practiceSection).findByText("That sounds like a great start!")).toBeInTheDocument();

    fireEvent.click(within(practiceSection).getByRole("button", { name: "End & get feedback" }));
    expect(await within(practiceSection).findByText("What you did well")).toBeInTheDocument();

    const historyEntryButton = await within(historySection).findByRole("button", { name: /Dating/ });
    expect(historyEntryButton).toBeInTheDocument();

    fireEvent.click(historyEntryButton);

    expect(within(historySection).getByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();
    expect(within(historySection).getByText("That sounds like a great start!")).toBeInTheDocument();
    expect(within(historySection).getByText("What you did well")).toBeInTheDocument();
    expect(within(historySection).getByText("What you can do better")).toBeInTheDocument();
    expect(within(historySection).getByText("A warm, direct opener sets a friendly tone.")).toBeInTheDocument();
  });
});
