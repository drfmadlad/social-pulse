import { HISTORY_STORE, openDb, promisifyRequest } from "../db";

/**
 * Writes a History entry straight into IndexedDB, bypassing the app's save path: for a test that
 * needs an entry in a shape an earlier version of the app stored, which today's save can't make.
 */
export async function putStoredHistoryEntry(entry: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  try {
    await promisifyRequest(db.transaction(HISTORY_STORE, "readwrite").objectStore(HISTORY_STORE).put(entry));
  } finally {
    db.close();
  }
}
