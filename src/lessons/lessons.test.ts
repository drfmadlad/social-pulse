import { describe, expect, it } from "vitest";
import { lessons } from "./lessons";

describe("lessons", () => {
  describe.each(lessons.map((lesson) => [lesson.id, lesson] as const))("%s", (_id, lesson) => {
    it("has 8–12 Lesson Steps", () => {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length).toBeLessThanOrEqual(12);
    });

    it("has exactly one Recap, and it is the last step", () => {
      const recaps = lesson.steps.filter((step) => step.kind === "recap");

      expect(recaps).toHaveLength(1);
      expect(lesson.steps.at(-1)?.kind).toBe("recap");
    });

    it("ends with a Recap of 2–3 takeaways and a non-empty Apply It", () => {
      const recap = lesson.steps.at(-1);
      if (recap?.kind !== "recap") throw new Error("the last step is not a Recap");

      expect(recap.takeaways.length).toBeGreaterThanOrEqual(2);
      expect(recap.takeaways.length).toBeLessThanOrEqual(3);
      expect(recap.applyIt.trim()).not.toBe("");
    });

    it("gives every Check a correct option that exists among its options", () => {
      for (const step of lesson.steps) {
        if (step.kind !== "check") continue;
        expect(step.options.map((option) => option.id)).toContain(step.correctOptionId);
      }
    });
  });
});
