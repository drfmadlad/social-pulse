import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getHistoryEntry, resetHistoryStoreForTests, saveEndedConversation } from "../history/historyStore";
import { advancePastAiRequestTimeout, hangingFetch, mockFeedbackSummary } from "../test/apiMocks";
import { SavedFeedbackSummary } from "./SavedFeedbackSummary";
import { scenarioCategories } from "./scenarioCategories";

const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
const transcript = [
  { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  await resetHistoryStoreForTests();
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
    await advancePastAiRequestTimeout();

    expect(screen.getByText("The request timed out. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("tells the user their feedback couldn't be saved when attaching it throws, without losing the feedback on screen", async () => {
    await saveEndedConversation({ id: "entry-1", category, transcript });
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockFeedbackSummary()));

    render(
      <SavedFeedbackSummary entryId="entry-1" category={category} transcript={transcript} savedSummary={null} generateOnMount />,
    );

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText(/couldn't be saved/i)).toBeInTheDocument();

    expect((await getHistoryEntry("entry-1"))?.summary).toBeNull();
  });
});
