import type { Lesson } from "./lessons";

/**
 * The first unfinished Lesson in list order, optionally skipping one Lesson (the one just
 * finished, on the Recap's Next lesson). Undefined when none remain.
 */
export function findNextUnfinishedLesson(
  lessons: Lesson[],
  finishedLessonIds: ReadonlySet<string>,
  excludeLessonId?: string,
): Lesson | undefined {
  return lessons.find((lesson) => lesson.id !== excludeLessonId && !finishedLessonIds.has(lesson.id));
}
