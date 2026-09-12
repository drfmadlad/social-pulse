import { describe, expect, it } from "vitest";
import { scenarioCategories } from "./scenarioCategories";

const avoidedTerms = ["roleplay", "simulation", "scenario type", "conversation mode"];

const expectedSystemPromptKeywords: Record<string, string> = {
  dating: "coffee shop",
  "job-interview": "role",
  "small-talk": "break room",
  networking: "networking event",
  "public-speaking": "talk",
  "conflict-resolution": "chores",
};

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

  it("keeps blurbs consistent with the setting each persona's system prompt establishes", () => {
    for (const category of scenarioCategories) {
      const keyword = expectedSystemPromptKeywords[category.id];
      expect(keyword, `add an expected setting keyword for "${category.id}"`).toBeDefined();
      expect(category.systemPrompt.toLowerCase()).toEqual(expect.stringContaining(keyword));
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
