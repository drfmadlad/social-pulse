import { matchPath } from "react-router-dom";

// The full-viewport screens, where a reload would throw away something that can't be redone: a
// Practice Conversation lives only in memory, and a Lesson's step position isn't saved. The paths
// mirror App.tsx's routes (a test fails if a full-viewport route is missing here). The Feedback
// Summary sits under /practice/:categoryId/feedback/..., one level deeper, so it doesn't match: its
// conversation is already saved. Nor does the Scenario brief, /practice/:categoryId, where nothing
// has started yet.
const HOLD_BACK_PATTERNS = ["/practice/:categoryId/:scenarioId", "/lessons/:lessonId"];

export function holdsBackUpdateOffer(pathname: string): boolean {
  return HOLD_BACK_PATTERNS.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
}
