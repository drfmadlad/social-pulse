import type { Lesson } from "./lessons";

/** How many Lesson Steps an authored Lesson has: about 20, weighted toward practice (Reply Choice, Written Reply). */
export const LESSON_STEP_COUNT = { min: 18, max: 24 } as const;

/**
 * A Lesson still carrying placeholder stubs (`isPlaceholder`) may be shorter, down to the length
 * the stubs were first written at. The allowance ends when its real content lands and the flag
 * is cleared: from then on it needs the full range.
 */
export const PLACEHOLDER_LESSON_MIN_STEPS = 8;

/** What's wrong with a Lesson's step count and Recap placement, or an empty list when it's fine. */
export function findLessonStepProblems(lesson: Pick<Lesson, "steps" | "isPlaceholder">): string[] {
  const problems: string[] = [];
  const count = lesson.steps.length;
  const min = lesson.isPlaceholder ? PLACEHOLDER_LESSON_MIN_STEPS : LESSON_STEP_COUNT.min;

  if (count < min || count > LESSON_STEP_COUNT.max) {
    problems.push(`has ${count} Lesson Steps, expected ${min}–${LESSON_STEP_COUNT.max}`);
  }

  const recaps = lesson.steps.filter((step) => step.kind === "recap").length;
  if (recaps !== 1) problems.push(`has ${recaps} Recaps, expected exactly one`);
  if (lesson.steps.at(-1)?.kind !== "recap") problems.push("does not end with its Recap");

  return problems;
}
