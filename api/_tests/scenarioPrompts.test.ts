import { describe, expect, it } from "vitest";
import { scenarioCategories } from "../../src/practice/scenarioCategories.js";
import { getScenarioPrompt } from "../_lib/scenarioPrompts.js";

describe("scenarioPrompts", () => {
  it("resolves a non-empty prompt for every Scenario Category id the browser knows about", () => {
    for (const category of scenarioCategories) {
      const prompt = getScenarioPrompt(category.id);
      expect(prompt, `add a server-owned prompt for "${category.id}"`).toBeDefined();
      expect(prompt!.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no prompt for an unknown category id", () => {
    expect(getScenarioPrompt("not-a-real-category")).toBeUndefined();
  });
});
