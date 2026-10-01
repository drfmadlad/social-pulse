/**
 * What each Focus (CONTEXT.md) means to the Feedback Summary's coach. Kept out of `src/` so it never
 * ships in the browser bundle — only the Feedback Summary function reads it. The app holds only
 * each Focus's id and label (`src/practice/focuses.ts`) and sends the id; this is where its wording
 * is resolved, so no caller-supplied text about the Focus ever reaches the prompt.
 */
export interface FocusPrompt {
  /** Must match the Focus's `label` in `src/practice/focuses.ts`, the name the user saw. */
  name: string;
  /** What practising it looks like in a conversation, for the coach to look for. */
  guidance: string;
}

export const focusPrompts: Readonly<Record<string, FocusPrompt>> = {
  "follow-up-questions": {
    name: "Asking follow-up questions",
    guidance:
      "Picking up on something the other person said and asking more about it, rather than moving on to " +
      "a new topic or back to themselves.",
  },
  "showing-listening": {
    name: "Showing you're listening",
    guidance:
      "Letting the other person know they were heard: reflecting back what they said or how they seem to " +
      "feel, or building on it, before adding their own view.",
  },
  "sharing-yourself": {
    name: "Sharing about yourself",
    guidance:
      "Offering something of their own (an experience, an opinion, a detail about their life) so the " +
      "conversation goes both ways instead of being all questions or all answers.",
  },
  "reading-the-room": {
    name: "Reading the room",
    guidance:
      "Noticing how the other person is responding (shorter answers, a change of tone, rising interest, " +
      "discomfort) and adjusting what they say or where they take the conversation.",
  },
  "staying-calm": {
    name: "Staying calm",
    guidance:
      "Keeping a steady, even tone when the conversation gets tense, awkward or challenging, without " +
      "getting defensive, sharp or flustered.",
  },
  "handling-silences": {
    name: "Handling silences",
    guidance:
      "Keeping the conversation going when it stalls, a topic runs dry or an answer falls flat, without " +
      "panicking, over-apologising or filling the gap with anything at all.",
  },
  "wrapping-up": {
    name: "Wrapping up gracefully",
    guidance:
      "Bringing the conversation, or a topic within it, to a close warmly and clearly, leaving a good " +
      "last impression rather than trailing off or leaving abruptly.",
  },
};

/** The Focus's wording, or undefined for an id the server doesn't know (own properties only). */
export function getFocusPrompt(focusId: string): FocusPrompt | undefined {
  return Object.hasOwn(focusPrompts, focusId) ? focusPrompts[focusId] : undefined;
}
