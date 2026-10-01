import { describe, expect, it } from "vitest";
import { scenarioCategories } from "../../src/practice/scenarioCategories.js";
import { defaultScenarioOf, scenarios } from "../../src/practice/scenarios.js";
import {
  getDefaultScenarioId,
  getScenarioPrompt,
  personaRules,
  personaSheets,
  scenariosByCategory,
} from "../_lib/scenarioPrompts.js";

// The places and set-ups the Scenarios use. A Persona is the same person in every Scenario of its
// category, so none of these belongs in a sheet: they go in the Scenario's situation instead.
const SITUATION_WORDS = [
  "coffee shop",
  "café",
  "first date",
  "break room",
  "coffee machine",
  "networking event",
  "mixer",
  "scanning the room",
  "roommate",
  "chores",
  "rehearsal",
  "practice audience",
  "interviewing the user",
];

const BUILT_IN_OBJECT_NAMES = ["constructor", "toString", "__proto__", "hasOwnProperty"];

describe("scenarioPrompts", () => {
  it("resolves a non-empty prompt for every Scenario the browser offers", () => {
    for (const scenario of scenarios) {
      const prompt = getScenarioPrompt(scenario.categoryId, scenario.id);
      expect(prompt, `add a server-owned situation for "${scenario.categoryId}/${scenario.id}"`).toBeDefined();
      expect(prompt!.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no prompt or default Scenario for an unknown category id", () => {
    expect(getScenarioPrompt("not-a-real-category", "coffee-first-date")).toBeUndefined();
    expect(getDefaultScenarioId("not-a-real-category")).toBeUndefined();
  });

  it("has no prompt for a Scenario its category doesn't have, including another category's", () => {
    expect(getScenarioPrompt("dating", "not-a-real-scenario")).toBeUndefined();
    expect(getScenarioPrompt("networking", "coffee-first-date")).toBeUndefined();
  });

  it("has nothing for a category or Scenario id that only exists on Object.prototype", () => {
    for (const inheritedKey of BUILT_IN_OBJECT_NAMES) {
      expect(getScenarioPrompt(inheritedKey, "coffee-first-date")).toBeUndefined();
      expect(getScenarioPrompt("dating", inheritedKey)).toBeUndefined();
      expect(getDefaultScenarioId(inheritedKey)).toBeUndefined();
    }
  });

  it("gives every Scenario Category a Persona sheet for the Persona the browser names", () => {
    for (const category of scenarioCategories) {
      const sheet = personaSheets[category.id];
      expect(sheet, `add a Persona sheet for "${category.id}"`).toBeDefined();
      expect(sheet.name).toBe(category.personaName);
    }
  });

  it("fills in every part of every Persona sheet", () => {
    for (const [categoryId, sheet] of Object.entries(personaSheets)) {
      for (const [part, text] of Object.entries(sheet)) {
        expect(text.trim().length, `"${categoryId}" sheet's ${part} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it("gives every Scenario a situation, and has none the browser doesn't offer", () => {
    const serverScenarios = Object.entries(scenariosByCategory).flatMap(([categoryId, { situations }]) =>
      Object.entries(situations).map(([scenarioId, situation]) => {
        expect(situation.trim().length, `"${categoryId}/${scenarioId}" situation is empty`).toBeGreaterThan(0);
        return `${categoryId}/${scenarioId}`;
      }),
    );
    expect(serverScenarios.sort()).toEqual(scenarios.map((scenario) => `${scenario.categoryId}/${scenario.id}`).sort());
  });

  it("agrees with the browser on each category's default Scenario, which is one of its own", () => {
    for (const category of scenarioCategories) {
      const defaultScenarioId = getDefaultScenarioId(category.id);
      expect(defaultScenarioId, category.id).toBe(defaultScenarioOf(category.id)?.id);
      expect(getScenarioPrompt(category.id, defaultScenarioId!)).toBeDefined();
    }
  });

  it("keeps situations out of the Persona sheets", () => {
    for (const [categoryId, sheet] of Object.entries(personaSheets)) {
      const sheetText = Object.values(sheet).join(" ").toLowerCase();
      for (const word of SITUATION_WORDS) {
        expect(sheetText, `"${categoryId}" sheet mentions "${word}"`).not.toContain(word);
      }
    }
  });

  it("builds every prompt from its Persona sheet, then its Scenario's situation, then the shared rules", () => {
    for (const scenario of scenarios) {
      const prompt = getScenarioPrompt(scenario.categoryId, scenario.id)!;
      const sheet = personaSheets[scenario.categoryId];
      const situation = scenariosByCategory[scenario.categoryId].situations[scenario.id];

      expect(prompt).toContain(`You are ${sheet.name}`);
      for (const text of Object.values(sheet)) expect(prompt).toContain(text);
      expect(prompt.indexOf(situation)).toBeGreaterThan(prompt.indexOf(sheet.whenItGoesBadly));
      expect(prompt.indexOf(personaRules)).toBeGreaterThan(prompt.indexOf(situation));
    }
  });

  it("states the situation once: only the chosen Scenario's, never another's", () => {
    for (const scenario of scenarios) {
      const prompt = getScenarioPrompt(scenario.categoryId, scenario.id)!;
      const situation = scenariosByCategory[scenario.categoryId].situations[scenario.id];

      expect(prompt.split(situation)).toHaveLength(2);
      for (const other of scenarios.filter((candidate) => candidate !== scenario)) {
        expect(prompt).not.toContain(scenariosByCategory[other.categoryId].situations[other.id]);
      }
    }
  });
});
