import { HISTORY_STORE as STORE_NAME, openDb, promisifyRequest, resetDbForTests } from "../db";
import type { ChatMessage } from "../practice/aiProxyClient";
import type { FeedbackSummary } from "../practice/feedbackSummary";
import type { ScenarioCategory } from "../practice/scenarioCategories";

export interface HistoryEntry {
  id: string;
  categoryId: string;
  categoryName: string;
  personaName: string;
  transcript: ChatMessage[];
  summary: FeedbackSummary;
  endedAt: string;
}

const CHANGE_EVENT = "social-pulse:history-changed";

/** Notifies subscribers when a History entry is saved, so an already-mounted list can refresh live. */
export function subscribeToHistoryChanges(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export async function saveHistoryEntry(entry: {
  category: ScenarioCategory;
  transcript: ChatMessage[];
  summary: FeedbackSummary;
}): Promise<HistoryEntry> {
  const fullEntry: HistoryEntry = {
    id: crypto.randomUUID(),
    categoryId: entry.category.id,
    categoryName: entry.category.name,
    personaName: entry.category.personaName,
    transcript: entry.transcript,
    summary: entry.summary,
    endedAt: new Date().toISOString(),
  };

  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).add(fullEntry);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
  return fullEntry;
}

export async function getAllHistoryEntries(): Promise<HistoryEntry[]> {
  const db = await openDb();
  try {
    const entries = await promisifyRequest(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
    return (entries as HistoryEntry[]).sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  } finally {
    db.close();
  }
}

/** Test-only: clears the whole database between tests, awaiting deletion so it can't race the next test's open. */
export const resetHistoryStoreForTests = resetDbForTests;
