import { describe, expect, it } from "vitest";
import { scenarioCategories } from "./scenarioCategories";

const avoidedTerms = ["roleplay", "simulation", "scenario type", "conversation mode"];

describe("scenarioCategories", () => {
  it("gives every Scenario Category a user-facing persona name and blurb", () => {
    for (const category of scenarioCategories) {
      expect(category.personaName.trim().length).toBeGreaterThan(0);
      expect(category.blurb.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives each Scenario Category a blurb distinct from its bare name", () => {
    for (const category of scenarioCategories) {
      expect(category.blurb.toLowerCase()).not.toBe(category.name.toLowerCase());
    }
  });

  it("carries no system prompt text — that lives server-side only", () => {
    for (const category of scenarioCategories) {
      expect(category).not.toHaveProperty("systemPrompt");
    }
  });

  it("avoids the vocabulary CONTEXT.md flags for Scenario Category and Practice Conversation", () => {
    for (const category of scenarioCategories) {
      const lowerBlurb = category.blurb.toLowerCase();
      for (const term of avoidedTerms) {
        expect(lowerBlurb).not.toContain(term);
      }
    }
  });
});
