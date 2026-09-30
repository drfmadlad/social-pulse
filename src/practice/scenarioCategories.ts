export interface ScenarioCategory {
  id: string;
  name: string;
  personaName: string;
  /**
   * What the Persona is like, as the Scenario brief says it: the person, never the situation, since
   * they're the same in every one of the category's Scenarios. Drawn from their server-side sheet.
   */
  personaDescription: string;
  blurb: string;
}

export const scenarioCategories: ScenarioCategory[] = [
  {
    id: "dating",
    name: "Dating",
    personaName: "Jordan",
    personaDescription: "Warm, quick and curious, with a playful streak.",
    blurb: "a first date at a coffee shop",
  },
  {
    id: "job-interview",
    name: "Job Interview",
    personaName: "Morgan",
    personaDescription: "Calm and fair, hard to read at first, and persuaded by specifics.",
    blurb: "a job interview for an exciting new role",
  },
  {
    id: "small-talk",
    name: "Small Talk",
    personaName: "Sam",
    personaDescription: "Easygoing and chatty, and a bit scattered.",
    blurb: "small talk with a coworker in the break room",
  },
  {
    id: "networking",
    name: "Networking",
    personaName: "Alex",
    personaDescription: "Energetic and friendly: a connector, with plenty of people to talk to.",
    blurb: "meeting a new contact at a networking event",
  },
  {
    id: "public-speaking",
    name: "Public Speaking",
    personaName: "Riley",
    personaDescription: "Enthusiastic and honest, and quick to say when they've lost the thread.",
    blurb: "a rehearsal for an upcoming talk",
  },
  {
    id: "conflict-resolution",
    name: "Conflict Resolution",
    personaName: "Casey",
    personaDescription: "Fair-minded and direct, and quick to soften when they feel heard.",
    blurb: "a disagreement with a roommate over chores or a broken plan",
  },
];

export function findCategory(categoryId: string | undefined): ScenarioCategory | undefined {
  return scenarioCategories.find((category) => category.id === categoryId);
}
