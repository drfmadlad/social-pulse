import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hangingFetch, mockFeedbackSummary } from "../test/apiMocks";
import { AI_REPLY_TIMEOUT_MS } from "./aiProxyClient";
import { SavedFeedbackSummary } from "./SavedFeedbackSummary";
import { scenarioCategories } from "./scenarioCategories";

const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
const transcript = [
  { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("SavedFeedbackSummary", () => {
  it("shows a visible timeout error with a retry action when the AI never responds, and recovers on retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementationOnce(hangingFetch()).mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SavedFeedbackSummary
        entryId="entry-1"
        category={category}
        transcript={transcript}
        savedSummary={null}
        generateOnMount
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AI_REPLY_TIMEOUT_MS);
    });

    expect(screen.getByText("The request timed out. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Real timers from here: the retry resolves without another fake-timer advance, and RTL's
    // findBy* polling needs real timers to ever re-check.
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
