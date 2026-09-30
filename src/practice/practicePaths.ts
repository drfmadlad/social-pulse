/**
 * The Practice screens' URLs, deepening one level per push (INFORMATION-ARCHITECTURE.md, Navigation
 * model), so the screen-push direction reads straight off them. App.tsx's routes match these.
 *
 * - `/practice/:categoryId`: the category's Scenario brief
 * - `/practice/:categoryId/:scenarioId`: a Conversation set in that Scenario
 * - `/practice/:categoryId/feedback/:entryId`: a finished conversation's Feedback Summary
 */
export function scenarioBriefPath(categoryId: string): string {
  return `/practice/${categoryId}`;
}

export function conversationPath(categoryId: string, scenarioId: string): string {
  return `/practice/${categoryId}/${scenarioId}`;
}

/** What every Feedback Summary URL in a category starts with, whatever its entry id. */
export function feedbackSummaryPathPrefix(categoryId: string): string {
  return `/practice/${categoryId}/feedback/`;
}

export function feedbackSummaryPath(categoryId: string, entryId: string): string {
  return `${feedbackSummaryPathPrefix(categoryId)}${entryId}`;
}
