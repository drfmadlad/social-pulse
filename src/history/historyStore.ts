import { HISTORY_STORE as STORE_NAME, openDb, promisifyRequest, resetDbForTests } from "../db";
import type { ChatMessage } from "../practice/aiProxyClient";
import type { FeedbackSummary } from "../practice/feedbackSummary";
import type { Focus } from "../practice/focuses";
import type { ScenarioCategory } from "../practice/scenarioCategories";
import type { OwnScenarioText, Scenario } from "../practice/scenarios";

export interface HistoryEntry {
  id: string;
  categoryId: string;
  categoryName: string;
  personaName: string;
  /**
   * The Scenario the conversation was set in, by id within its category. Absent on entries saved
   * before Scenarios existed (issue #53), which were all set in their category's default Scenario:
   * read it through `scenarioOfEntry` rather than directly. Stored entries are never rewritten to
   * add it, so there's no database upgrade for it, and an older backup can't be missing anything.
   */
  scenarioId?: string;
  /**
   * The Focus the user picked on the Scenario brief (issue #65), by id. Absent when they left it at
   * none, and on every entry saved before Focuses existed, so those read exactly as they were stored;
   * like `scenarioId`, adding it needed no database upgrade. Read it through `findFocus`, which also
   * gives nothing for a Focus since removed.
   */
  focusId?: string;
  /**
   * What the user wrote, for a conversation set in an Own Scenario (issue #67), whose `categoryId` is
   * "own" and whose `scenarioId` is the Own Scenario's. A copy, so the entry still reads the way it
   * did, and its Feedback Summary can still be asked for, once the Own Scenario is edited or deleted.
   * Absent on every other entry; like `scenarioId` and `focusId`, it needed no database upgrade.
   */
  ownScenario?: OwnScenarioText;
  transcript: ChatMessage[];
  /** Null until the Feedback Summary arrives, and for good if it never did. */
  summary: FeedbackSummary | null;
  endedAt: string;
}

const CHANGE_EVENT = "social-pulse:history-changed";

/** Notifies subscribers when a History entry is saved, so an already-mounted list can refresh live. */
export function subscribeToHistoryChanges(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/**
 * Runs one read-write transaction on the History store, resolving with `work`'s result once it
 * commits. `work` may await its own requests on the store — those continuations run as microtasks
 * while the transaction is still active — but awaiting anything else (a fetch, a timer) would let
 * the transaction auto-commit underneath it.
 */
async function withHistoryWrite<T>(work: (store: IDBObjectStore) => Promise<T>): Promise<T> {
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
 * Saves a Practice Conversation the moment it ends, before its Feedback Summary exists, so a
 * summary that fails or that the user walks away from never takes the transcript with it.
 *
 * The id is minted by the caller, so saving the same conversation again (a re-mount, or coming
 * back to the Feedback screen) keeps the first save — including any summary already attached —
 * and resolves with it instead.
 */
export async function saveEndedConversation(conversation: {
  id: string;
  category: ScenarioCategory;
  scenario: Scenario;
  /** Undefined when the conversation had no Focus. */
  focus?: Focus;
  transcript: ChatMessage[];
}): Promise<HistoryEntry> {
  const saved = await withHistoryWrite(async (store) => {
    const existing = (await promisifyRequest(store.get(conversation.id))) as HistoryEntry | undefined;
    if (existing) return { entry: existing, created: false };

    const entry: HistoryEntry = {
      id: conversation.id,
      categoryId: conversation.category.id,
      categoryName: conversation.category.name,
      personaName: conversation.category.personaName,
      scenarioId: conversation.scenario.id,
      ...(conversation.focus && { focusId: conversation.focus.id }),
      ...(conversation.category.own && { ownScenario: conversation.category.own }),
      transcript: conversation.transcript,
      summary: null,
      endedAt: new Date().toISOString(),
    };
    store.add(entry);
    return { entry, created: true };
  });

  if (saved.created) window.dispatchEvent(new Event(CHANGE_EVENT));
  return saved.entry;
}

/** Attaches a Feedback Summary to a saved conversation. Does nothing if there's no such entry. */
export async function attachFeedbackSummary(id: string, summary: FeedbackSummary): Promise<void> {
  const attached = await withHistoryWrite(async (store) => {
    const existing = (await promisifyRequest(store.get(id))) as HistoryEntry | undefined;
    if (!existing) return false;
    store.put({ ...existing, summary });
    return true;
  });

  if (attached) window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Deletes a saved conversation, its transcript and its Feedback Summary together. Does nothing if there's no such entry. */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const deleted = await withHistoryWrite(async (store) => {
    const existing = (await promisifyRequest(store.get(id))) as HistoryEntry | undefined;
    if (!existing) return false;
    store.delete(id);
    return true;
  });

  if (deleted) window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Reads one History entry by id, for a screen addressed by id rather than handed its content. */
export async function getHistoryEntry(id: string): Promise<HistoryEntry | undefined> {
  const db = await openDb();
  try {
    return (await promisifyRequest(
      db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id),
    )) as HistoryEntry | undefined;
  } finally {
    db.close();
  }
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
