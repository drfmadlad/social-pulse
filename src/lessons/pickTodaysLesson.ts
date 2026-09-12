import type { Lesson } from "./lessons";

/**
 * Rotates the homepage's "Today's idea" card by calendar date, like a word-of-the-day —
 * not a streak: nothing here is stored, counted, or shown to the user as a day number.
 */
export function pickTodaysLesson(lessons: Lesson[], now: Date = new Date()): Lesson {
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - startOfYear) / 86_400_000);
  return lessons[dayOfYear % lessons.length];
}
