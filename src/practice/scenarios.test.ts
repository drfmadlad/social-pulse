import { describe, expect, it } from "vitest";
import { scenarioCategories } from "./scenarioCategories";
import { defaultScenarioOf, findScenario, pickSurpriseScenario, scenarioOfEntry, scenarios, scenariosIn } from "./scenarios";

describe("scenarios", () => {
  it("gives every Scenario Category at least one Scenario, each with a title, situation and role", () => {
    for (const category of scenarioCategories) {
      const inCategory = scenariosIn(category.id);
      expect(inCategory.length, category.id).toBeGreaterThan(0);
      for (const scenario of inCategory) {
        expect(scenario.title.trim()).not.toBe("");
        expect(scenario.situation.trim()).not.toBe("");
        expect(scenario.role.trim()).not.toBe("");
      }
    }
  });

  it("belongs every Scenario to a real category, with ids unique within it", () => {
    const categoryIds = scenarioCategories.map((category) => category.id);
    for (const scenario of scenarios) {
      expect(categoryIds).toContain(scenario.categoryId);
    }
    const keys = scenarios.map((scenario) => `${scenario.categoryId}/${scenario.id}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never names a Scenario as a level or difficulty (CONTEXT.md, Scenario)", () => {
    for (const scenario of scenarios) {
      const text = `${scenario.title} ${scenario.situation} ${scenario.role}`.toLowerCase();
      for (const term of ["level", "difficulty", "setup"]) {
        expect(text).not.toContain(term);
      }
    }
  });

  it("finds a Scenario only within its own category", () => {
    const dating = defaultScenarioOf("dating")!;

    expect(findScenario("dating", dating.id)).toBe(dating);
    expect(findScenario("networking", dating.id)).toBeUndefined();
    expect(findScenario("dating", "not-a-real-scenario")).toBeUndefined();
    expect(findScenario("dating", undefined)).toBeUndefined();
  });

  describe("defaultScenarioOf", () => {
    it("names one of each category's own Scenarios", () => {
      for (const category of scenarioCategories) {
        const defaultScenario = defaultScenarioOf(category.id);
        expect(defaultScenario, category.id).toBeDefined();
        expect(scenariosIn(category.id)).toContain(defaultScenario);
      }
    });

    it("is today's situation for each category, the one every conversation had before Scenarios existed", () => {
      expect(defaultScenarioOf("dating")?.id).toBe("coffee-first-date");
      expect(defaultScenarioOf("conflict-resolution")?.id).toBe("roommate-disagreement");
    });

    it("is undefined for an unknown category, or a name only Object.prototype has", () => {
      for (const categoryId of ["not-a-real-category", "constructor", "toString", "__proto__"]) {
        expect(defaultScenarioOf(categoryId), categoryId).toBeUndefined();
      }
    });
  });

  describe("scenarioOfEntry", () => {
    it("is the Scenario the entry names", () => {
      const dating = defaultScenarioOf("dating")!;
      expect(scenarioOfEntry({ categoryId: "dating", scenarioId: dating.id })).toBe(dating);
    });

    it("is the category's default Scenario for an entry saved before Scenarios existed", () => {
      expect(scenarioOfEntry({ categoryId: "networking" })?.id).toBe("networking-event");
    });

    it("is the category's default Scenario for an entry naming one that no longer exists", () => {
      expect(scenarioOfEntry({ categoryId: "dating", scenarioId: "retired" })).toBe(defaultScenarioOf("dating")!);
    });

    it("is undefined for an unknown category", () => {
      expect(scenarioOfEntry({ categoryId: "not-a-real-category" })).toBeUndefined();
    });
  });

  describe("pickSurpriseScenario", () => {
    it("picks from the category's own Scenarios, across the whole range of the random number", () => {
      const inCategory = scenariosIn("dating");

      expect(pickSurpriseScenario("dating", () => 0)).toBe(inCategory[0]);
      expect(pickSurpriseScenario("dating", () => 0.999999)).toBe(inCategory.at(-1));
    });
  });
});
