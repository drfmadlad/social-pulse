import { afterEach, describe, expect, it } from "vitest";
import { HISTORY_STORE, LESSON_PROGRESS_STORE, openDb, resetDbForTests } from "./db";
import { getAllHistoryEntries } from "./history/historyStore";

const DB_NAME = "social-pulse";

const version1HistoryEntry = {
  id: "entry-1",
  categoryId: "dating",
  categoryName: "Dating",
  personaName: "Jordan",
  transcript: [],
  summary: { didWell: [], canImprove: [] },
  endedAt: new Date().toISOString(),
};

/** Simulates a device that already has the version-1 database, with one History entry saved. */
function createVersion1DbWithHistoryEntry(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(HISTORY_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(HISTORY_STORE, "readwrite");
      transaction.objectStore(HISTORY_STORE).add(version1HistoryEntry);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
    request.onerror = () => reject(request.error);
  });
}

afterEach(async () => {
  await resetDbForTests();
});

describe("db", () => {
  it("creates every store on a brand-new database", async () => {
    const db = await openDb();

    expect(db.objectStoreNames.contains(HISTORY_STORE)).toBe(true);
    expect(db.objectStoreNames.contains(LESSON_PROGRESS_STORE)).toBe(true);

    db.close();
  });

  it("upgrading an existing version-1 database only adds the stores it's missing, and keeps its History entry", async () => {
    await createVersion1DbWithHistoryEntry();

    const db = await openDb();

    expect(db.objectStoreNames.contains(HISTORY_STORE)).toBe(true);
    expect(db.objectStoreNames.contains(LESSON_PROGRESS_STORE)).toBe(true);

    const entries = await new Promise((resolve, reject) => {
      const request = db.transaction(HISTORY_STORE, "readonly").objectStore(HISTORY_STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(entries).toEqual([version1HistoryEntry]);

    db.close();

    // Also confirm the entry is still listed through the app's own read path, not just raw IndexedDB.
    expect(await getAllHistoryEntries()).toEqual([version1HistoryEntry]);
  });
});
