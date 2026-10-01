import { describe, expect, it } from "vitest";
import { MAX_OWN_ABOUT_LENGTH, MAX_OWN_NAME_LENGTH, MAX_OWN_SCENARIO_LENGTH } from "../requestLimits";
import {
  categoryOfEntry,
  findOwnScenarioProblems,
  OWN_CATEGORY_ID,
  ownScenarioAsCategory,
  ownScenarioAsScenario,
  ownScenarioCharactersLeft,
  ownScenarioCard,
  type OwnScenarioText,
} from "./ownScenarios";
import { scenarioCategories } from "./scenarioCategories";

const dana: OwnScenarioText = {
  name: "Dana",
  about: "my manager of two years",
  situation: "I want to ask Dana for a raise.",
};

describe("findOwnScenarioProblems", () => {
  it("finds none in a name and a situation, with or without a line about them", () => {
    expect(findOwnScenarioProblems(dana)).toEqual({});
    expect(findOwnScenarioProblems({ ...dana, about: "" })).toEqual({});
  });

  it("asks for a name and a situation, ignoring whitespace", () => {
    expect(findOwnScenarioProblems({ ...dana, name: "  " }).name).toBeDefined();
    expect(findOwnScenarioProblems({ ...dana, situation: "\n " }).situation).toBeDefined();
  });

  it("holds the name and the line about them to their own caps, and all three to the cap together", () => {
    expect(findOwnScenarioProblems({ ...dana, name: "n".repeat(MAX_OWN_NAME_LENGTH) })).toEqual({});
    expect(findOwnScenarioProblems({ ...dana, name: "n".repeat(MAX_OWN_NAME_LENGTH + 1) }).name).toBeDefined();
    expect(findOwnScenarioProblems({ ...dana, about: "a".repeat(MAX_OWN_ABOUT_LENGTH + 1) }).total).toBeDefined();

    const room = MAX_OWN_SCENARIO_LENGTH - dana.name.length - dana.about.length;
    expect(findOwnScenarioProblems({ ...dana, situation: "s".repeat(room) })).toEqual({});
    expect(findOwnScenarioProblems({ ...dana, situation: "s".repeat(room + 1) }).total).toBeDefined();
  });
});

describe("ownScenarioCharactersLeft", () => {
  it("counts the three parts together, trimmed, and goes negative past the cap", () => {
    expect(ownScenarioCharactersLeft({ name: " Dana ", about: "", situation: " ab " })).toBe(MAX_OWN_SCENARIO_LENGTH - 6);
    expect(ownScenarioCharactersLeft({ name: "n", about: "", situation: "s".repeat(MAX_OWN_SCENARIO_LENGTH) })).toBe(-1);
  });
});

describe("the Own Scenario's stand-ins", () => {
  it("is a Scenario in no category's list, carrying the text each reply request sends", () => {
    const scenario = ownScenarioAsScenario({ id: "own-1", ...dana });

    expect(scenario).toMatchObject({ id: "own-1", categoryId: OWN_CATEGORY_ID, title: "Dana", situation: dana.situation });
    expect(scenario.own).toEqual(dana);
    expect(scenario.role).toContain("Dana");
  });

  it("is a category whose Persona is the person described, carrying the text the Feedback Summary request sends", () => {
    const category = ownScenarioAsCategory(dana);

    expect(category).toMatchObject({ id: OWN_CATEGORY_ID, name: "Your own", personaName: "Dana" });
    expect(category.own).toEqual(dana);
  });

  it("never collides with a Scenario Category's id", () => {
    expect(scenarioCategories.map((category) => category.id)).not.toContain(OWN_CATEGORY_ID);
    expect(ownScenarioCard.id).toBe(OWN_CATEGORY_ID);
  });
});

describe("categoryOfEntry", () => {
  it("finds a Scenario Category by id", () => {
    expect(categoryOfEntry({ categoryId: "dating" })?.personaName).toBe("Jordan");
    expect(categoryOfEntry({ categoryId: "not-a-category" })).toBeUndefined();
  });

  it("builds an Own Scenario's from the text saved with the entry, and has none without it", () => {
    expect(categoryOfEntry({ categoryId: OWN_CATEGORY_ID, ownScenario: dana })?.personaName).toBe("Dana");
    expect(categoryOfEntry({ categoryId: OWN_CATEGORY_ID })).toBeUndefined();
  });
});
