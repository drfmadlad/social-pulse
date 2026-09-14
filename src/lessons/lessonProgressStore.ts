import { LESSON_PROGRESS_STORE as STORE_NAME, openDb, promisifyRequest } from "../db";

interface LessonProgressEntry {
  lessonId: string;
  finishedAt: string;
}

const CHANGE_EVENT = "social-pulse:lesson-progress-changed";

/** Notifies subscribers when a Lesson is finished, so an already-mounted Lessons list can refresh live. */
export function subscribeToLessonProgressChanges(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Marks a Lesson finished on this device. Idempotent: finishing an already-finished Lesson leaves it done. */
export async function markLessonFinished(lessonId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const entry: LessonProgressEntry = { lessonId, finishedAt: new Date().toISOString() };
      transaction.objectStore(STORE_NAME).put(entry);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function getFinishedLessonIds(): Promise<Set<string>> {
  const db = await openDb();
  try {
    const entries = await promisifyRequest(db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
    return new Set((entries as LessonProgressEntry[]).map((entry) => entry.lessonId));
  } finally {
    db.close();
  }
}
