import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScenarioCategory } from "../practice/scenarioCategories";
import { getAllHistoryEntries, resetHistoryStoreForTests, saveHistoryEntry } from "./historyStore";

const category: ScenarioCategory = {
  id: "dating",
  name: "Dating",
  personaName: "Jordan",
  systemPrompt: "You are Jordan.",
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
  await resetHistoryStoreForTests();
});

describe("historyStore", () => {
  it("persists a transcript and Feedback Summary together as one History entry", async () => {
    const entry = await saveHistoryEntry({ category, transcript, summary });

    expect(entry.id).toBeTruthy();
    expect(entry.categoryId).toBe("dating");
    expect(entry.personaName).toBe("Jordan");
    expect(entry.transcript).toEqual(transcript);
    expect(entry.summary).toEqual(summary);
    expect(entry.endedAt).toBeTruthy();
  });

  it("survives being read back from a fresh database connection, as after a page reload", async () => {
    await saveHistoryEntry({ category, transcript, summary });

    const entries = await getAllHistoryEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0].transcript).toEqual(transcript);
    expect(entries[0].summary).toEqual(summary);
  });

  it("does not make any network call while persisting", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await saveHistoryEntry({ category, transcript, summary });
    await getAllHistoryEntries();

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
