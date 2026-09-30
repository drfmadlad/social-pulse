/**
 * The limits the app and the server share (issue #58), in the one place both read them from, so
 * the app can never build a request the server would reject for its size.
 *
 * It lives under `api/_lib/` because the serverless functions deploy as native Node ESM and can
 * only rely on what's inside `api/`, while the Vite app can import from anywhere in the repo. Keep
 * this file free of imports so it stays safe to load on both sides.
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
