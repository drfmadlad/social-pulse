import { describe, expect, it } from "vitest";
import { scenarioCategories } from "../../src/practice/scenarioCategories.js";
import { currentSituations, getScenarioPrompt, personaRules, personaSheets } from "../_lib/scenarioPrompts.js";

// The places and set-ups today's situations use. A Persona is the same person in every Scenario of
// its category, so none of these belongs in a sheet: they go in the situation piece instead.
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

  it("has no prompt for an id that only exists on Object.prototype", () => {
    for (const inheritedKey of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(getScenarioPrompt(inheritedKey)).toBeUndefined();
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

  it("gives every Scenario Category a current situation", () => {
    for (const category of scenarioCategories) {
      expect(currentSituations[category.id]?.trim().length ?? 0).toBeGreaterThan(0);
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

  it("builds every prompt from its Persona sheet, its current situation and the shared rules", () => {
    for (const category of scenarioCategories) {
      const prompt = getScenarioPrompt(category.id)!;
      const sheet = personaSheets[category.id];

      expect(prompt).toContain(`You are ${sheet.name}`);
      for (const text of Object.values(sheet)) expect(prompt).toContain(text);
      expect(prompt).toContain(currentSituations[category.id]);
      expect(prompt).toContain(personaRules);
    }
  });
});
