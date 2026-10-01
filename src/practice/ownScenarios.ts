import {
  MAX_OWN_ABOUT_LENGTH,
  MAX_OWN_NAME_LENGTH,
  MAX_OWN_SCENARIO_LENGTH,
} from "../requestLimits";
import { findCategory, type ScenarioCategory } from "./scenarioCategories";
import type { OwnScenarioText, Scenario } from "./scenarios";

export type { OwnScenarioText };

/**
 * Own Scenarios (CONTEXT.md, issue #67): a situation the user writes themselves, with a Persona
 * they describe. It belongs to no Scenario Category, so it has no entry in `scenarioCategories` or
 * `scenarios`. This file is what the rest of the app needs to treat one like a Practice
 * Conversation's setting: the text and its limits, and the stand-ins that let the Conversation,
 * Feedback Summary and History screens work on one unchanged.
 */

/**
 * The category id an Own Scenario's Conversation, Feedback Summary and History entry carry in place
 * of a Scenario Category's. Must match the server's (`api/_lib/ownScenarioPrompts.ts`); a contract
 * test checks.
 */
export const OWN_CATEGORY_ID = "own";

/** An Own Scenario as it's kept on-device. */
export interface OwnScenario extends OwnScenarioText {
  id: string;
  /** When it was first written, for listing the newest first. Editing it doesn't move it. */
  createdAt: string;
}

/** The text with surrounding whitespace dropped, the way it's measured, saved and sent. */
export function trimmedOwnScenarioText(text: OwnScenarioText): OwnScenarioText {
  return { name: text.name.trim(), about: text.about.trim(), situation: text.situation.trim() };
}

/** How many more characters the text has room for, counting all three parts together. Negative when over. */
export function ownScenarioCharactersLeft(text: OwnScenarioText): number {
  const { name, about, situation } = trimmedOwnScenarioText(text);
  return MAX_OWN_SCENARIO_LENGTH - (name.length + about.length + situation.length);
}

export interface OwnScenarioProblems {
  name?: string;
  situation?: string;
  /** Over the cap on all three together. */
  total?: string;
}

/**
 * What's stopping this text from being saved, by field, in words for the form. Empty when it can be.
 * Checks what the server checks, so a saved Own Scenario never makes a request the server rejects.
 */
export function findOwnScenarioProblems(text: OwnScenarioText): OwnScenarioProblems {
  const { name, about, situation } = trimmedOwnScenarioText(text);
  const problems: OwnScenarioProblems = {};
  if (name.length === 0) problems.name = "Say who you'll be talking to.";
  else if (name.length > MAX_OWN_NAME_LENGTH) problems.name = `Keep the name to ${MAX_OWN_NAME_LENGTH} characters.`;
  if (situation.length === 0) problems.situation = "Describe the situation.";
  if (about.length > MAX_OWN_ABOUT_LENGTH) {
    problems.total = `Keep the line about them to ${MAX_OWN_ABOUT_LENGTH} characters.`;
  } else if (ownScenarioCharactersLeft(text) < 0) {
    problems.total = `That's ${-ownScenarioCharactersLeft(text)} over the ${MAX_OWN_SCENARIO_LENGTH} characters in all.`;
  }
  return problems;
}

/** The Practice picker's seventh card, shaped like a category's so the picker renders it the same way. */
export const ownScenarioCard: ScenarioCategory = {
  id: OWN_CATEGORY_ID,
  name: "Your own",
  personaName: "Someone you describe",
  personaDescription: "",
  blurb: "a situation you write yourself",
};

/**
 * The Scenario Category a History entry was set in, or, for an entry made from an Own Scenario, the
 * stand-in built from the text saved with it. Undefined if the app no longer has the category.
 */
export function categoryOfEntry(entry: { categoryId: string; ownScenario?: OwnScenarioText }): ScenarioCategory | undefined {
  if (entry.categoryId === OWN_CATEGORY_ID) return entry.ownScenario && ownScenarioAsCategory(entry.ownScenario);
  return findCategory(entry.categoryId);
}

/**
 * An Own Scenario as the Scenario the Conversation runs in. It carries the text, so each reply
 * request can send it (the server has no copy of an Own Scenario to look up).
 */
export function ownScenarioAsScenario(own: { id: string } & OwnScenarioText): Scenario {
  const { id, ...text } = own;
  return {
    id,
    categoryId: OWN_CATEGORY_ID,
    title: text.name,
    situation: text.situation,
    role: `Yourself, talking with ${text.name}.`,
    own: { name: text.name, about: text.about, situation: text.situation },
  };
}

/**
 * An Own Scenario standing in for the Scenario Category the Conversation, Feedback Summary and
 * History screens expect: the Persona is the person the user described, and the text rides along so
 * the Feedback Summary request can send it too.
 */
export function ownScenarioAsCategory(text: OwnScenarioText): ScenarioCategory {
  return {
    id: OWN_CATEGORY_ID,
    name: ownScenarioCard.name,
    personaName: text.name,
    personaDescription: text.about,
    blurb: text.situation,
    own: { name: text.name, about: text.about, situation: text.situation },
  };
}
