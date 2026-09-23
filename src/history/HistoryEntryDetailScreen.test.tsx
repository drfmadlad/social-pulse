import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scenarioCategories } from "../practice/scenarioCategories";
import { mockError, mockFeedbackSummary } from "../test/apiMocks";
import {
  attachFeedbackSummary,
  deleteHistoryEntry,
  getAllHistoryEntries,
  getHistoryEntry,
  resetHistoryStoreForTests,
  saveEndedConversation,
} from "./historyStore";
import { HistoryEntryDetailScreen } from "./HistoryEntryDetailScreen";

vi.mock("./historyStore", async (importOriginal) => {
  const original = await importOriginal<typeof import("./historyStore")>();
  return { ...original, deleteHistoryEntry: vi.fn(original.deleteHistoryEntry) };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/history" element={<div>History list</div>} />
        <Route path="/history/:entryId" element={<HistoryEntryDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;

const transcript = [
  { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

afterEach(async () => {
  vi.mocked(deleteHistoryEntry).mockClear();
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("HistoryEntryDetailScreen", () => {
  it("redirects to the History list when the URL names an unknown entry", async () => {
    renderAt("/history/not-a-real-entry");

    expect(await screen.findByText("History list")).toBeInTheDocument();
  });

  it("shows a saved conversation's transcript and Feedback Summary without asking the AI", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await saveEndedConversation({ id: "entry-1", category, transcript });
    await attachFeedbackSummary("entry-1", {
      didWell: [{ quote: "Hi, nice to meet you!" }],
      canImprove: [{ quote: "Hi, nice to meet you!" }],
    });

    renderAt("/history/entry-1");

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get feedback" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers to get feedback for a conversation whose feedback never arrived, and saves it once it does", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);
    await saveEndedConversation({ id: "entry-1", category, transcript });

    renderAt("/history/entry-1");

    expect(await screen.findByText("Feedback didn't come through for this one.")).toBeInTheDocument();
    expect(screen.getByText("Hi, nice to meet you!")).toBeInTheDocument();
    // Browsing History never calls the AI on its own; only the tap does.
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Get feedback" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    await waitFor(async () => {
      const [entry] = await getAllHistoryEntries();
      expect(entry.summary).not.toBeNull();
    });
  });

  it("asks before deleting, and leaves the entry alone when cancelled", async () => {
    await saveEndedConversation({ id: "entry-1", category, transcript });

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(screen.getByText("Delete this conversation? It can't be recovered.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete this conversation? It can't be recovered.")).not.toBeInTheDocument();
    expect(await getHistoryEntry("entry-1")).toBeDefined();
  });

  it("deletes the entry and returns to the History list once confirmed", async () => {
    await saveEndedConversation({ id: "entry-1", category, transcript });

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("History list")).toBeInTheDocument();
    expect(await getHistoryEntry("entry-1")).toBeUndefined();
  });

  it("says so plainly when the entry couldn't be deleted, leaves it in History, and lets the user try again", async () => {
    await saveEndedConversation({ id: "entry-1", category, transcript });
    vi.mocked(deleteHistoryEntry).mockRejectedValueOnce(new Error("disk full"));

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete this conversation. It's still in History.");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("History list")).not.toBeInTheDocument();
    expect(await getHistoryEntry("entry-1")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("History list")).toBeInTheDocument();
    expect(await getHistoryEntry("entry-1")).toBeUndefined();
  });

  it("deletes once however many times the confirm button is tapped", async () => {
    await saveEndedConversation({ id: "entry-1", category, transcript });

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const confirm = within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(await screen.findByText("History list")).toBeInTheDocument();
    expect(deleteHistoryEntry).toHaveBeenCalledTimes(1);
  });

  it("shows an error with Try again when getting feedback from History fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(mockError(500, "provider_error", "Could not generate feedback right now."))
        .mockResolvedValueOnce(mockFeedbackSummary()),
    );
    await saveEndedConversation({ id: "entry-1", category, transcript });

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Get feedback" }));

    expect(await screen.findByText("Could not generate feedback right now.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("What you did well")).toBeInTheDocument();
  });
});
