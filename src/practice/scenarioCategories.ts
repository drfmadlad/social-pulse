export interface ScenarioCategory {
  id: string;
  name: string;
  personaName: string;
  blurb: string;
}

export const scenarioCategories: ScenarioCategory[] = [
  {
    id: "dating",
    name: "Dating",
    personaName: "Jordan",
    blurb: "a first date at a coffee shop",
  },
  {
    id: "job-interview",
    name: "Job Interview",
    personaName: "Morgan",
    blurb: "a job interview for an exciting new role",
  },
  {
    id: "small-talk",
    name: "Small Talk",
    personaName: "Sam",
    blurb: "small talk with a coworker in the break room",
  },
  {
    id: "networking",
    name: "Networking",
    personaName: "Alex",
    blurb: "meeting a new contact at a networking event",
  },
  {
    id: "public-speaking",
    name: "Public Speaking",
    personaName: "Riley",
    blurb: "a rehearsal for an upcoming talk",
  },
  {
    id: "conflict-resolution",
    name: "Conflict Resolution",
    personaName: "Casey",
    blurb: "a disagreement with a roommate over chores or a broken plan",
  },
];
