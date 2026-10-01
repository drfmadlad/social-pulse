import { LESSON_POSITION_STORE as STORE_NAME, openDb, promisifyRequest, registerUnsentWritesForTests } from "../db";

/** Only where the user got to. Never answers, never a count of anything. */
interface LessonPositionEntry {
  lessonId: string;
  /** Zero-based index of the step the user was on. Always past step 1: step 1 isn't worth resuming. */
  stepIndex: number;
}

// Writes run one after another, so a late "keep step 4" can never land after the "clear" that
// Finish or Start over sent behind it.
let writeQueue: Promise<void> = Promise.resolve();

registerUnsentWritesForTests(() => writeQueue);

function enqueue(write: () => Promise<void>): void {
  // A failed write (storage full, blocked, unavailable) is swallowed: the Lesson works the same
  // without it and simply starts at step 1 next time.
  writeQueue = writeQueue.then(write).catch(() => undefined);
}

async function writeEntry(update: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      update(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Keeps the step the user is on, so leaving the Lesson by any means doesn't lose their place.
 * Step 1 clears instead: there's nothing to pick up. Fire and forget; it never throws.
 */
export function saveLessonPosition(lessonId: string, stepIndex: number): void {
  if (stepIndex <= 0) {
    clearLessonPosition(lessonId);
    return;
  }
  enqueue(() => writeEntry((store) => void store.put({ lessonId, stepIndex } satisfies LessonPositionEntry)));
}

/** Forgets a Lesson's kept position: on Finish, and on Start over. Fire and forget; it never throws. */
export function clearLessonPosition(lessonId: string): void {
  enqueue(() => writeEntry((store) => void store.delete(lessonId)));
}

/**
 * The step a Lesson was left on, as a zero-based index into `stepCount` steps, or null when there's
 * nothing to pick up. Also null when the device can't be read, so the Lesson just starts at step 1.
 */
export async function getLessonPosition(lessonId: string, stepCount: number): Promise<number | null> {
  try {
    // Behind any write already sent, so a position kept a moment ago is the one read back.
    await writeQueue;
    const db = await openDb();
    try {
      const entry = (await promisifyRequest(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(lessonId),
      )) as LessonPositionEntry | undefined;
      const stepIndex = entry?.stepIndex;
      // A Lesson edited since (fewer steps) can leave a position that no longer exists.
      return Number.isInteger(stepIndex) && stepIndex! > 0 && stepIndex! < stepCount ? stepIndex! : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}
