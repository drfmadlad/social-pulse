import { matchPath } from "react-router-dom";

// The full-viewport screens, where a reload would still cost the user something: a Practice
// Conversation comes back from its on-device copy but breaks the exchange mid-thought, and a
// Lesson keeps its step position but not its answers. The paths
// mirror App.tsx's routes (a test fails if a full-viewport route is missing here). The Feedback
// Summary sits under /practice/:categoryId/feedback/..., one level deeper, so it doesn't match: its
// conversation is already saved. Nor does the Scenario brief, /practice/:categoryId, where nothing
// has started yet. An Own Scenario's Conversation, /practice/own/:scenarioId, matches the first
// pattern, "own" being a category id as far as the path goes.
const HOLD_BACK_PATTERNS = ["/practice/:categoryId/:scenarioId", "/lessons/:lessonId"];

export function holdsBackUpdateOffer(pathname: string): boolean {
  return HOLD_BACK_PATTERNS.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
}
