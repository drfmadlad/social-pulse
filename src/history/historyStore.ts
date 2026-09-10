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

const DB_NAME = "social-pulse";
const DB_VERSION = 1;
const STORE_NAME = "historyEntries";

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
  };
  return promisifyRequest(request);
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

/** Test-only: clears the store between tests, awaiting deletion so it can't race the next test's open. */
export function resetHistoryStoreForTests(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
