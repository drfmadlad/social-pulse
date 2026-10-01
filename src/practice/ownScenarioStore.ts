import { OWN_SCENARIOS_STORE as STORE_NAME, openDb, promisifyRequest } from "../db";
import { trimmedOwnScenarioText, type OwnScenario, type OwnScenarioText } from "./ownScenarios";

/** The user's Own Scenarios (issue #67), kept on-device in the same database as History. */

const CHANGE_EVENT = "social-pulse:own-scenarios-changed";

/** Notifies subscribers when an Own Scenario is saved or deleted, so a mounted list can refresh live. */
export function subscribeToOwnScenarioChanges(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Runs one read-write transaction on the store, resolving once it commits. */
async function withOwnScenarioWrite<T>(work: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const committed = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    const result = await work(transaction.objectStore(STORE_NAME));
    await committed;
    return result;
  } finally {
    db.close();
  }
}

/**
 * Saves an Own Scenario: a new one, or, given an `id` that's already saved, an edit of it (which
 * keeps its place in the list). The text is saved trimmed. Callers check it first with
 * `findOwnScenarioProblems`.
 */
export async function saveOwnScenario(text: OwnScenarioText, id?: string): Promise<OwnScenario> {
  const saved = await withOwnScenarioWrite(async (store) => {
    const existing = id === undefined ? undefined : ((await promisifyRequest(store.get(id))) as OwnScenario | undefined);
    const own: OwnScenario = {
      ...trimmedOwnScenarioText(text),
      id: existing?.id ?? id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    store.put(own);
    return own;
  });

  window.dispatchEvent(new Event(CHANGE_EVENT));
  return saved;
}

/** Deletes an Own Scenario. Does nothing if there's no such one. History entries made from it are kept. */
export async function deleteOwnScenario(id: string): Promise<void> {
  await withOwnScenarioWrite(async (store) => {
    store.delete(id);
  });

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function getOwnScenario(id: string): Promise<OwnScenario | undefined> {
  const db = await openDb();
  try {
    return (await promisifyRequest(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id))) as
      | OwnScenario
      | undefined;
  } finally {
    db.close();
  }
}

/** Every saved Own Scenario, newest first. */
export async function getAllOwnScenarios(): Promise<OwnScenario[]> {
  const db = await openDb();
  try {
    const all = await promisifyRequest(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
    return (all as OwnScenario[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}
