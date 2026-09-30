import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScenarioCategory } from "../practice/scenarioCategories";
import { defaultScenarioOf } from "../practice/scenarios";
import { putStoredHistoryEntry } from "../test/storedHistory";
import {
  attachFeedbackSummary,
  deleteHistoryEntry,
  getAllHistoryEntries,
  getHistoryEntry,
  resetHistoryStoreForTests,
  saveEndedConversation,
  subscribeToHistoryChanges,
} from "./historyStore";

const category: ScenarioCategory = {
  id: "dating",
  name: "Dating",
  personaName: "Jordan",
  personaDescription: "Warm and witty, and curious about you.",
  blurb: "a first date at a coffee shop",
};

const transcript = [
  { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
  { role: "user" as const, content: "Hi, nice to meet you!" },
];

const summary = {
  didWell: [{ quote: "Hi, nice to meet you!", explanation: "A warm, direct opener." }],
  canImprove: [{ quote: "Hi, nice to meet you!" }],
};

afterEach(async () => {
  vi.restoreAllMocks();
  await resetHistoryStoreForTests();
});

describe("historyStore", () => {
  it("saves an ended conversation before its Feedback Summary exists", async () => {
    const entry = await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });

    expect(entry.id).toBe("entry-1");
    expect(entry.categoryId).toBe("dating");
    expect(entry.personaName).toBe("Jordan");
    expect(entry.transcript).toEqual(transcript);
    expect(entry.summary).toBeNull();
    expect(entry.endedAt).toBeTruthy();
  });

  it("records the Scenario the conversation was set in, surviving a fresh database connection", async () => {
    const scenario = defaultScenarioOf(category.id)!;
    await saveEndedConversation({ id: "entry-1", category, scenario, transcript });

    expect((await getHistoryEntry("entry-1"))?.scenarioId).toBe(scenario.id);
  });

  it("reads back an entry saved before Scenarios existed as it was stored, with no Scenario of its own", async () => {
    const storedBeforeScenarios = {
      id: "entry-1",
      categoryId: "dating",
      categoryName: "Dating",
      personaName: "Jordan",
      transcript,
      summary,
      endedAt: new Date().toISOString(),
    };
    await putStoredHistoryEntry(storedBeforeScenarios);

    expect(await getHistoryEntry("entry-1")).toEqual(storedBeforeScenarios);
    expect(await getAllHistoryEntries()).toEqual([storedBeforeScenarios]);
    // Saving the same conversation again keeps it as it was, rather than stamping today's Scenario on it.
    const again = await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    expect(again).toEqual(storedBeforeScenarios);
  });

  it("attaches a Feedback Summary to a saved conversation, surviving a fresh database connection", async () => {
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    await attachFeedbackSummary("entry-1", summary);

    const entries = await getAllHistoryEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0].transcript).toEqual(transcript);
    expect(entries[0].summary).toEqual(summary);
  });

  it("keeps the first save when the same conversation is saved again, so a re-save never wipes its summary", async () => {
    const first = await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    await attachFeedbackSummary("entry-1", summary);

    const again = await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });

    expect(again.summary).toEqual(summary);
    expect(again.endedAt).toBe(first.endedAt);
    expect(await getAllHistoryEntries()).toHaveLength(1);
  });

  it("reads a single entry by id", async () => {
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    await attachFeedbackSummary("entry-1", summary);

    const entry = await getHistoryEntry("entry-1");

    expect(entry?.transcript).toEqual(transcript);
    expect(entry?.summary).toEqual(summary);
  });

  it("resolves with undefined when no entry has that id", async () => {
    expect(await getHistoryEntry("never-saved")).toBeUndefined();
  });

  it("does nothing when attaching a summary to a conversation that was never saved", async () => {
    await attachFeedbackSummary("never-saved", summary);

    expect(await getAllHistoryEntries()).toHaveLength(0);
  });

  it("deletes a saved entry", async () => {
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });

    await deleteHistoryEntry("entry-1");

    expect(await getHistoryEntry("entry-1")).toBeUndefined();
    expect(await getAllHistoryEntries()).toHaveLength(0);
  });

  it("leaves other entries alone when deleting one", async () => {
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    await saveEndedConversation({ id: "entry-2", category, scenario: defaultScenarioOf(category.id)!, transcript });

    await deleteHistoryEntry("entry-1");

    expect(await getHistoryEntry("entry-2")).toBeDefined();
  });

  it("does nothing when deleting an id that was never saved", async () => {
    await expect(deleteHistoryEntry("never-saved")).resolves.toBeUndefined();
  });

  it("notifies subscribers when an entry is deleted", async () => {
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    const callback = vi.fn();
    const unsubscribe = subscribeToHistoryChanges(callback);

    await deleteHistoryEntry("entry-1");

    expect(callback).toHaveBeenCalled();
    unsubscribe();
  });

  it("does not notify subscribers when deleting an id that was never saved", async () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToHistoryChanges(callback);

    await deleteHistoryEntry("never-saved");

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("rejects instead of swallowing the failure when the underlying IndexedDB write throws (e.g. quota exceeded)", async () => {
    vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });

    await expect(saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript })).rejects.toThrow();
    expect(await getAllHistoryEntries()).toHaveLength(0);
  });

  it("rejects instead of swallowing the failure when attaching a summary throws", async () => {
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });

    await expect(attachFeedbackSummary("entry-1", summary)).rejects.toThrow();
    expect((await getHistoryEntry("entry-1"))?.summary).toBeNull();
  });

  it("does not make any network call while persisting", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    await attachFeedbackSummary("entry-1", summary);
    await getAllHistoryEntries();

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
