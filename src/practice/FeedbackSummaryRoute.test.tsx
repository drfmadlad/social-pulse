import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  attachFeedbackSummary,
  getAllHistoryEntries,
  resetHistoryStoreForTests,
  saveEndedConversation,
} from "../history/historyStore";
import { mockError, mockFeedbackSummary, mockReply } from "../test/apiMocks";
import { FeedbackSummaryRoute } from "./FeedbackSummaryRoute";
import { scenarioCategories } from "./scenarioCategories";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <LocationDisplay />
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/practice" element={<div>Practice picker</div>} />
        <Route path="/practice/:categoryId/feedback" element={<FeedbackSummaryRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

const transcript = [
  { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

const endedConversation = { transcript, entryId: "entry-1" };

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("FeedbackSummaryRoute", () => {
  it("redirects to the Practice picker when the URL names an unknown category", () => {
    renderAt("/practice/not-a-real-category/feedback", endedConversation);

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("redirects to the Practice picker when there is no conversation state", () => {
    renderAt("/practice/dating/feedback");

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("shows the Feedback Summary and saves it to History, and Done navigates to Home", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/feedback", endedConversation);

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText("What you can do better")).toBeInTheDocument();

    await waitFor(async () => {
      const entries = await getAllHistoryEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].categoryId).toBe("dating");
      expect(entries[0].summary).not.toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("keeps the conversation in History when feedback fails and the user leaves anyway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Could not generate feedback right now.")),
    );

    renderAt("/practice/dating/feedback", endedConversation);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    const entries = await getAllHistoryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].transcript).toEqual(transcript);
    expect(entries[0].summary).toBeNull();
  });

  it("still attaches the summary to History when the user leaves while it's generating", async () => {
    let respond: (response: Response) => void = () => {};
    const fetchMock = vi.fn().mockReturnValueOnce(new Promise<Response>((resolve) => (respond = resolve)));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/feedback", endedConversation);
    // Waiting on the request itself, not on the waiting copy: that same copy also covers the
    // moment before it, while the conversation is still being saved.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("Home")).toBeInTheDocument();

    respond(mockFeedbackSummary());

    await waitFor(async () => {
      const entries = await getAllHistoryEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].summary).not.toBeNull();
    });
  });

  it("shows an already-saved summary without asking the AI again when the screen is reopened", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
    await saveEndedConversation({ id: "entry-1", category, transcript });
    await attachFeedbackSummary("entry-1", {
      didWell: [{ quote: "Hi, nice to meet you!" }],
      canImprove: [{ quote: "Hi, nice to meet you!" }],
    });

    renderAt("/practice/dating/feedback", endedConversation);

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getAllHistoryEntries()).toHaveLength(1);
  });

  it("shows a visible error with a retry action when Feedback Summary generation fails, and recovers on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockError(500, "provider_error", "Could not generate feedback right now."))
      .mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/networking/feedback", endedConversation);

    expect(await screen.findByText("Could not generate feedback right now.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a visible error when the AI's feedback doesn't cite the user's actual messages", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      mockReply(JSON.stringify({ didWell: [{ quote: "words the user never said" }], canImprove: [{ quote: "another made-up quote" }] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/public-speaking/feedback", endedConversation);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("What you did well")).not.toBeInTheDocument();
  });
});
