/**
 * The Focuses (CONTEXT.md): optional aims the user can pick on the Scenario brief, which the
 * Feedback Summary then speaks to. The list is fixed here, and this file holds only what the user
 * reads. The server resolves each Focus's prompt wording from its id (`api/_lib/focusPrompts.ts`),
 * so no free text reaches the prompt and none of that wording ships in the browser bundle.
 *
 * Each is worded as something to practise, not a target to hit: the Feedback Summary speaks to it,
 * and never says whether it was achieved (INFORMATION-ARCHITECTURE.md §5).
 *
 * Kept free of imports: `api/_tests/` checks it against the server's Focuses under NodeNext
 * resolution, which rejects `src/`'s extensionless imports.
 */
export interface Focus {
  /**
   * Named in the Conversation's URL, the Feedback Summary request and the History entry, so it must
   * never change once shipped.
   */
  id: string;
  /** The Scenario brief's option, and the line at the top of the Feedback Summary. */
  label: string;
}

/** In the order the Scenario brief lists them, after None. */
export const focuses: Focus[] = [
  { id: "follow-up-questions", label: "Asking follow-up questions" },
  { id: "showing-listening", label: "Showing you're listening" },
  { id: "sharing-yourself", label: "Sharing about yourself" },
  { id: "reading-the-room", label: "Reading the room" },
  { id: "staying-calm", label: "Staying calm" },
  { id: "handling-silences", label: "Handling silences" },
  { id: "wrapping-up", label: "Wrapping up gracefully" },
];

/**
 * The Focus with this id, or undefined for none, or for an id the app doesn't offer (one from a
 * hand-edited URL, say, or a Focus since removed).
 */
export function findFocus(id: string | null | undefined): Focus | undefined {
  return focuses.find((focus) => focus.id === id);
}
