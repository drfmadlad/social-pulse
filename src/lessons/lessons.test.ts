import { describe, expect, it } from "vitest";
import { compositions } from "./artwork/compositions";
import { isChoiceStep, lessons, type ExplainerArtwork, type ExplainerStep, type Lesson } from "./lessons";

/** The Lesson's Explainers that carry artwork, in step order, whatever steps sit between them. */
function explainersWithArtwork(lesson: Lesson) {
  return lesson.steps.filter(
    (step): step is ExplainerStep & { artwork: ExplainerArtwork } =>
      step.kind === "explainer" && step.artwork !== undefined,
  );
}

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

    it("gives every Check and Reply Choice a correct option that exists among its options", () => {
      for (const step of lesson.steps) {
        if (!isChoiceStep(step)) continue;
        expect(step.options.map((option) => option.id)).toContain(step.correctOptionId);
      }
    });

    it("gives most of its Explainers artwork", () => {
      const explainers = lesson.steps.filter((step) => step.kind === "explainer");

      expect(explainersWithArtwork(lesson).length).toBeGreaterThan(explainers.length / 2);
    });

    it("points every artwork reference at a registered composition", () => {
      for (const step of explainersWithArtwork(lesson)) {
        expect(Object.keys(compositions)).toContain(step.artwork.composition);
      }
    });

    it("never gives two consecutive Explainers with artwork the same placement", () => {
      const placements = explainersWithArtwork(lesson).map((step) => step.artwork.placement);

      placements.slice(1).forEach((placement, index) => {
        expect(placement, `artwork ${index + 2} repeats the placement before it`).not.toBe(placements[index]);
      });
    });

    it("only places artwork beside the key line on an Explainer that has one", () => {
      for (const step of explainersWithArtwork(lesson)) {
        if (step.artwork.placement === "beside-key-line") expect(step.keyLine).toBeTruthy();
      }
    });

    it("has at least one Reply Choice", () => {
      expect(lesson.steps.some((step) => step.kind === "reply-choice")).toBe(true);
    });
  });
});
