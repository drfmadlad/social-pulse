import { describe, expect, it } from "vitest";
import { findLessonStepProblems } from "./lessonAuthoring";
import type { Lesson, LessonStep } from "./lessons";

const explainer: LessonStep = { kind: "explainer", title: "An idea", paragraphs: [[{ text: "Something." }]] };
const recap: LessonStep = { kind: "recap", takeaways: ["One", "Two"], applyIt: "Try it." };

/** A Lesson of `count` steps: explainers, then one Recap last unless the test says otherwise. */
function lessonOf(count: number, overrides: Partial<Lesson> = {}): Pick<Lesson, "steps" | "isPlaceholder"> {
  return { steps: [...Array.from({ length: count - 1 }, () => explainer), recap], isPlaceholder: false, ...overrides };
}

describe("findLessonStepProblems", () => {
  it.each([18, 20, 24])("accepts an authored Lesson of %i steps", (count) => {
    expect(findLessonStepProblems(lessonOf(count))).toEqual([]);
  });

  it.each([12, 17, 25])("rejects an authored Lesson of %i steps", (count) => {
    expect(findLessonStepProblems(lessonOf(count))).toHaveLength(1);
  });

  it("lets a placeholder Lesson stay as short as its stubs, but no longer than 24", () => {
    expect(findLessonStepProblems(lessonOf(10, { isPlaceholder: true }))).toEqual([]);
    expect(findLessonStepProblems(lessonOf(7, { isPlaceholder: true }))).toHaveLength(1);
    expect(findLessonStepProblems(lessonOf(25, { isPlaceholder: true }))).toHaveLength(1);
  });

  it("requires exactly one Recap", () => {
    const none = { steps: Array.from({ length: 20 }, () => explainer), isPlaceholder: false };
    const two = { steps: [...lessonOf(20).steps.slice(0, -2), recap, recap], isPlaceholder: false };

    expect(findLessonStepProblems(none).length).toBeGreaterThan(0);
    expect(findLessonStepProblems(two).length).toBeGreaterThan(0);
  });

  it("requires the Recap to be last", () => {
    const steps = [...lessonOf(20).steps];
    [steps[0], steps[19]] = [steps[19], steps[0]];

    expect(findLessonStepProblems({ steps, isPlaceholder: false })).toEqual(["does not end with its Recap"]);
  });
});
