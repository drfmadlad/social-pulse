import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryEntryDetailScreen } from "../history/HistoryEntryDetailScreen";
import {
  getAllHistoryEntries,
  getHistoryEntry,
  resetHistoryStoreForTests,
  saveEndedConversation,
} from "../history/historyStore";
import { HistoryListScreen } from "../history/HistoryListScreen";
import { mockFeedbackSummary } from "../test/apiMocks";
import { LocationDisplay } from "../test/LocationDisplay";
import { putStoredHistoryEntry } from "../test/storedHistory";
import { settleDeviceReads } from "../test/settleDeviceReads";
import { FeedbackSummaryRoute, type EndedConversationState } from "./FeedbackSummaryRoute";
import { deleteOwnScenario, getOwnScenario, saveOwnScenario } from "./ownScenarioStore";
import { ownScenarioAsCategory, ownScenarioAsScenario } from "./ownScenarios";

/**
 * What an Own Scenario's conversation leaves behind (issue #67): its History entry, listed and shown
 * under the person's name, and its Feedback Summary, which is asked for with what the user wrote.
 */

const dana = { name: "Dana", about: "my manager of two years", situation: "I want to ask Dana for a raise." };

const transcript = [
  { role: "assistant" as const, content: "Come in. What's on your mind?" },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <LocationDisplay />
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/practice" element={<div>Practice picker</div>} />
        <Route path="/practice/:categoryId/feedback/:entryId" element={<FeedbackSummaryRoute />} />
        <Route path="/practice/own/:scenarioId" element={<div>Own conversation stub</div>} />
        <Route path="/history" element={<HistoryListScreen />} />
        <Route path="/history/:entryId" element={<HistoryEntryDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0) {
  return JSON.parse(fetchMock.mock.calls[callIndex][1].body as string);
}

/** An Own Scenario's conversation saved to History, the way the Feedback Summary screen saves one. */
async function saveOwnEntry(id: string, ownScenarioId: string, focusId?: string) {
  await saveEndedConversation({
    id,
    category: ownScenarioAsCategory(dana),
    scenario: ownScenarioAsScenario({ id: ownScenarioId, ...dana }),
    focus: focusId ? { id: focusId, label: "Staying calm" } : undefined,
    transcript,
  });
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("a Feedback Summary for an Own Scenario's conversation", () => {
  const endedConversation = (ownScenarioId: string): EndedConversationState => ({
    transcript,
    scenarioId: ownScenarioId,
    ownScenario: dana,
  });

  it("is asked for with what the user wrote, and saves the conversation to History under the person's name", async () => {
    const own = await saveOwnScenario(dana);
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/own/feedback/entry-1", endedConversation(own.id));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Feedback on your conversation with Dana");
    expect(requestBody(fetchMock)).toMatchObject({ categoryName: "Your own", personaName: "Dana", ownScenario: dana });
    await waitFor(async () => {
      const [entry] = await getAllHistoryEntries();
      expect(entry).toMatchObject({
        id: "entry-1",
        categoryId: "own",
        categoryName: "Your own",
        personaName: "Dana",
        scenarioId: own.id,
        ownScenario: dana,
      });
      expect(entry.summary).not.toBeNull();
    });
  });

  it("is found again after a reload from the saved entry, with no state handed over", async () => {
    await saveOwnEntry("entry-1", "own-1");
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/own/feedback/entry-1");

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(requestBody(fetchMock).ownScenario).toEqual(dana);
  });

  it("goes to the Practice picker when its entry was saved without what the user wrote", async () => {
    await putStoredHistoryEntry({
      id: "entry-1",
      categoryId: "own",
      categoryName: "Your own",
      personaName: "Dana",
      transcript,
      summary: null,
      endedAt: new Date().toISOString(),
    });

    renderAt("/practice/own/feedback/entry-1");

    expect(await screen.findByText("Practice picker")).toBeInTheDocument();
  });

  it("offers Try again while the Own Scenario is saved, which opens a new conversation with it", async () => {
    const own = await saveOwnScenario(dana);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockFeedbackSummary()));

    renderAt("/practice/own/feedback/entry-1", endedConversation(own.id));
    fireEvent.click(await screen.findByRole("button", { name: "Try again in a new conversation" }));

    expect(screen.getByText("Own conversation stub")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`/practice/own/${own.id}`);
  });
});

describe("History for an Own Scenario's conversation", () => {
  it("lists it by the person it was with, next to the categories' entries", async () => {
    await saveOwnEntry("entry-1", "own-1");

    renderAt("/history");
    await settleDeviceReads();

    const link = await screen.findByRole("link", { name: /Your own: Dana/ });
    expect(link).toHaveAttribute("href", "/history/entry-1");
  });

  it("shows it under the person's name, with its transcript", async () => {
    await saveOwnEntry("entry-1", "own-1");
    vi.stubGlobal("fetch", vi.fn());

    renderAt("/history/entry-1");

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Your own with Dana");
    expect(screen.getByText("Come in. What's on your mind?")).toBeInTheDocument();
    expect(screen.getByText("Hi, nice to meet you!")).toBeInTheDocument();
  });

  it("generates its Feedback Summary on request, with what the user wrote, even once the Own Scenario was deleted", async () => {
    const own = await saveOwnScenario(dana);
    await saveOwnEntry("entry-1", own.id);
    await deleteOwnScenario(own.id);
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Get feedback" }));

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(requestBody(fetchMock)).toMatchObject({ personaName: "Dana", ownScenario: dana });
    await waitFor(async () => expect((await getHistoryEntry("entry-1"))?.summary).not.toBeNull());
  });

  it("offers Try again while the Own Scenario is saved, with its Focus, and not once it's deleted", async () => {
    const own = await saveOwnScenario(dana);
    await saveOwnEntry("entry-1", own.id, "staying-calm");
    vi.stubGlobal("fetch", vi.fn());

    const firstView = renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Try again in a new conversation" }));

    expect(screen.getByText("Own conversation stub")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`/practice/own/${own.id}?focus=staying-calm`);

    await deleteOwnScenario(own.id);
    // A fresh view of the entry: the button looks for the Own Scenario as it opens.
    firstView.unmount();
    renderAt("/history/entry-1");
    await screen.findByRole("button", { name: "Delete" });
    await settleDeviceReads();

    expect(screen.queryByRole("button", { name: "Try again in a new conversation" })).not.toBeInTheDocument();
  });

  it("deletes the entry like any other, and nothing of the Own Scenario with it", async () => {
    const own = await saveOwnScenario(dana);
    await saveOwnEntry("entry-1", own.id);
    vi.stubGlobal("fetch", vi.fn());

    renderAt("/history/entry-1");
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(async () => expect(await getHistoryEntry("entry-1")).toBeUndefined());
    expect(await getOwnScenario(own.id)).toBeDefined();
  });
});
