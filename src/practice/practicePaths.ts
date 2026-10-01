/**
 * The Practice screens' URLs, deepening one level per push (INFORMATION-ARCHITECTURE.md, Navigation
 * model), so the screen-push direction reads straight off them. App.tsx's routes match these.
 *
 * - `/practice/:categoryId`: the category's Scenario brief
 * - `/practice/:categoryId/:scenarioId`: a Conversation set in that Scenario, with `?focus=<id>`
 *   when it has a Focus
 * - `/practice/:categoryId/feedback/:entryId`: a finished conversation's Feedback Summary
 *
 * An Own Scenario (issue #67) has no category: `own` takes the category's place in all of them, and
 * its id the Scenario's. `/practice/own` is its brief, and `App.tsx` routes it, and its Conversation,
 * ahead of the dynamic routes.
 */
export function scenarioBriefPath(categoryId: string): string {
  return `/practice/${categoryId}`;
}

/**
 * A Focus rides along as `?focus=<id>`: it's part of how the conversation was set up, so it lives in
 * the URL and survives a reload, but it isn't a level of the stack, so it isn't a path segment.
 */
export function conversationPath(categoryId: string, scenarioId: string, focusId?: string): string {
  const path = `/practice/${categoryId}/${scenarioId}`;
  return focusId === undefined ? path : `${path}?${new URLSearchParams({ [FOCUS_PARAM]: focusId })}`;
}

/** The Conversation URL's query parameter naming its Focus, if it has one. */
export const FOCUS_PARAM = "focus";

/** What every Feedback Summary URL in a category starts with, whatever its entry id. */
export function feedbackSummaryPathPrefix(categoryId: string): string {
  return `/practice/${categoryId}/feedback/`;
}

export function feedbackSummaryPath(categoryId: string, entryId: string): string {
  return `${feedbackSummaryPathPrefix(categoryId)}${entryId}`;
}
