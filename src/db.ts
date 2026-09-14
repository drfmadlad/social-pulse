const DB_NAME = "social-pulse";
const DB_VERSION = 2;

export const HISTORY_STORE = "historyEntries";
export const LESSON_PROGRESS_STORE = "lessonProgress";

export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Opens the app's one IndexedDB database. The upgrade only creates stores that don't already
 * exist, so opening an existing database at an older version never touches its data.
 */
export function openDb(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(HISTORY_STORE)) {
      db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(LESSON_PROGRESS_STORE)) {
      db.createObjectStore(LESSON_PROGRESS_STORE, { keyPath: "lessonId" });
    }
  };
  return promisifyRequest(request);
}

/** Test-only: clears the whole database between tests, awaiting deletion so it can't race the next test's open. */
export function resetDbForTests(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
