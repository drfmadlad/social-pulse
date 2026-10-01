/**
 * The Scenarios (CONTEXT.md): specific situations within each Scenario Category, all played
 * against that category's one Persona. This file holds only what the user reads. Each Scenario's
 * prompt piece lives server-side (`api/_lib/scenarioPrompts.ts`), keyed by the same category and
 * Scenario ids, so it never ships in the browser bundle.
 *
 * Kept free of imports: `api/_tests/` checks it against the server's Scenarios under NodeNext
 * resolution, which rejects `src/`'s extensionless imports.
 */
/**
 * The text of an Own Scenario (`ownScenarios.ts`). Declared here, not there, because this file has
 * to stay free of imports.
 */
export interface OwnScenarioText {
  /** Who they'll be talking to. */
  name: string;
  /** One line about them. May be empty. */
  about: string;
  /** Where the conversation is set, and who the user is to them. */
  situation: string;
}

export interface Scenario {
  /** Unique within its category. Named in the Conversation's URL, the conversation request and the History entry. */
  id: string;
  categoryId: string;
  /** The Scenario chooser's label. */
  title: string;
  /** What's going on, in second person. */
  situation: string;
  /** Who the user is in it. */
  role: string;
  /**
   * Set only on an Own Scenario (`ownScenarios.ts`), which has no server-side prompt piece: the
   * user's text is what each reply request sends, in place of a Scenario id the server would look up.
   */
  own?: OwnScenarioText;
}

/** Every category's Scenarios, in the order the Scenario brief's chooser lists them. */
export const scenarios: Scenario[] = [
  {
    id: "coffee-first-date",
    categoryId: "dating",
    title: "A first date over coffee",
    situation:
      "You matched with Jordan on a dating app, and you're meeting in person for the first time at a casual coffee shop.",
    role: "Yourself, on the date. Get to know Jordan, and let them get to know you.",
  },
  {
    id: "first-interview",
    categoryId: "job-interview",
    title: "An interview for a role you want",
    situation: "You're interviewing in person for a role you're excited about. Morgan is the hiring manager, and leads with the questions.",
    role: "The candidate. Answer Morgan's questions, and ask your own.",
  },
  {
    id: "break-room",
    categoryId: "small-talk",
    title: "A chat in the break room",
    situation:
      "You run into Sam, a coworker you know to say hello to, in the break room while you're both waiting on the coffee machine.",
    role: "Yourself. Keep it easy, and see where the conversation goes.",
  },
  {
    id: "networking-event",
    categoryId: "networking",
    title: "Meeting someone at an event",
    situation: "You've just met Alex at an industry networking event, in the mingling after the talks.",
    role: "Yourself, there to meet people. Find out about Alex's work, and share a bit about yours.",
  },
  {
    id: "talk-rehearsal",
    categoryId: "public-speaking",
    title: "Rehearsing a talk",
    situation:
      "You've got a talk or presentation coming up, and your friend Riley has agreed to be your practice audience while you run it out loud.",
    role: "The speaker. Say what the talk is and who it's for, then run through it and take Riley's questions.",
  },
  {
    id: "roommate-disagreement",
    categoryId: "conflict-resolution",
    title: "A disagreement at home",
    situation:
      "You and your roommate Casey disagree about something like shared chores or a plan that fell through, and it's come to a head.",
    role: "Casey's roommate. Talk it through with them and find a way forward.",
  },
];

/**
 * Each category's default Scenario, named explicitly: the situation every Practice Conversation in
 * the category was set in before Scenarios existed. A History entry saved then has no Scenario of
 * its own, and was set in this one (see `scenarioOfEntry`). Must match the server's
 * `defaultScenarioId`s (`api/_tests/scenarioPrompts.test.ts` checks).
 */
const defaultScenarioIds: Readonly<Record<string, string>> = {
  dating: "coffee-first-date",
  "job-interview": "first-interview",
  "small-talk": "break-room",
  networking: "networking-event",
  "public-speaking": "talk-rehearsal",
  "conflict-resolution": "roommate-disagreement",
};

/** A category's Scenarios, in chooser order. */
export function scenariosIn(categoryId: string): Scenario[] {
  return scenarios.filter((scenario) => scenario.categoryId === categoryId);
}

export function findScenario(categoryId: string, scenarioId: string | undefined): Scenario | undefined {
  return scenarios.find((scenario) => scenario.categoryId === categoryId && scenario.id === scenarioId);
}

/** The category's default Scenario. Undefined only for an unknown category. */
export function defaultScenarioOf(categoryId: string): Scenario | undefined {
  return Object.hasOwn(defaultScenarioIds, categoryId)
    ? findScenario(categoryId, defaultScenarioIds[categoryId])
    : undefined;
}

/**
 * The Scenario a History entry was set in. An entry saved before Scenarios existed has no
 * `scenarioId`, and was set in its category's default Scenario, so that's the one it gets. So does
 * an entry naming a Scenario that's since been removed. Undefined only for an unknown category.
 */
export function scenarioOfEntry(entry: { categoryId: string; scenarioId?: string }): Scenario | undefined {
  return findScenario(entry.categoryId, entry.scenarioId) ?? defaultScenarioOf(entry.categoryId);
}

/** Surprise me: one of the category's Scenarios, picked at random. `random` is `Math.random` outside tests. */
export function pickSurpriseScenario(categoryId: string, random: () => number = Math.random): Scenario | undefined {
  const candidates = scenariosIn(categoryId);
  return candidates[Math.floor(random() * candidates.length)];
}
