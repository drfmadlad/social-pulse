/**
 * The limits the app and the server share (issue #58), so the app can never build a request the
 * server would reject for its size.
 *
 * This is the server's copy; the app's is `src/requestLimits.ts`, and the contract tests fail if
 * the two disagree. There are two because neither side can load the other's: the serverless
 * functions deploy as native Node ESM and rely only on what's inside `api/`, and the browser can't
 * load a module from `api/` under `vercel dev` (`_tests/appImportBoundary.test.ts`).
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
