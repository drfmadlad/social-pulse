/**
 * The limits the app shares with the server (issue #58), so the app can never build a request the
 * server would reject for its size.
 *
 * This is the app's copy; the server's is `api/_lib/requestLimits.ts`, and the contract tests fail
 * if the two disagree. It can't simply import the server's: `vercel dev` routes every `/api/*` URL
 * to the serverless functions, so the browser can't load a module from `api/` and the app renders
 * blank locally (`api/_tests/appImportBoundary.test.ts`).
 */

/**
 * The most messages a Practice Conversation may hold: the turns sent with each Persona reply, and
 * the transcript sent for its Feedback Summary. The Conversation screen stops offering the composer
 * once another line and its reply would go past it.
 */
export const MAX_CONVERSATION_MESSAGES = 80;

/**
 * The longest single message the user can send: a line in a Practice Conversation, or a Lesson's
 * Written Reply. The app caps both inputs at this length.
 */
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * What an Own Scenario's text may hold (issue #67): the Persona's name, one line about them and the
 * situation. The three together are capped, and the name and the line get a cap of their own so the
 * situation always keeps most of the room. The form stops at these, and the server rejects anything
 * over them.
 */
export const MAX_OWN_SCENARIO_LENGTH = 500;
export const MAX_OWN_NAME_LENGTH = 40;
export const MAX_OWN_ABOUT_LENGTH = 160;
