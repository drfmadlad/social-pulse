import { useEffect, useReducer } from "react";
import { MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_LENGTH } from "../../api/_lib/requestLimits";
import { describeAiError, requestAiReply, type ChatMessage } from "./aiProxyClient";

/**
 * One Practice Conversation's turns and the transitions between them (issue #46). The Conversation
 * screen renders from this and dispatches to it; it owns no turn state of its own. Each later
 * change to how a conversation behaves (Rewind, Hints, streamed replies, the length limit, keeping
 * it across a reload…) adds a transition here rather than rewriting the screen.
 */

/** What's sent to the Persona for one reply: the conversation as it stood when the request began. */
interface ReplyRequest {
  messages: ChatMessage[];
}

type Phase =
  | { kind: "awaiting-reply"; request: ReplyRequest }
  | { kind: "ready" }
  | { kind: "failed"; errorMessage: string };

interface ConversationState {
  /** Fixed for the conversation's life: every reply is asked for in the category it opened in. */
  categoryId: string;
  turns: ChatMessage[];
  phase: Phase;
}

type ConversationEvent =
  | { type: "sent"; content: string }
  | { type: "replyArrived"; request: ReplyRequest; reply: ChatMessage }
  | { type: "replyFailed"; request: ReplyRequest; errorMessage: string }
  | { type: "retried" };

function awaitingReplyTo(categoryId: string, turns: ChatMessage[]): ConversationState {
  return { categoryId, turns, phase: { kind: "awaiting-reply", request: { messages: turns } } };
}

/** A conversation opens on the Persona's first line, so it starts out waiting for it. */
function opening(categoryId: string): ConversationState {
  return awaitingReplyTo(categoryId, []);
}

/**
 * How many more of the user's lines fit, each with the Persona's reply to it (issue #58). The
 * server takes at most MAX_CONVERSATION_MESSAGES in a reply request and in the Feedback Summary's
 * transcript, so a line is only offered while it and its reply would both still fit. Counting turns
 * rather than exchanges keeps that true however the turns got there, a failed reply included.
 */
function linesLeft(turns: ChatMessage[]): number {
  return Math.max(0, Math.floor((MAX_CONVERSATION_MESSAGES - turns.length) / 2));
}

/** From this many lines left, the Conversation screen says the conversation is nearly at its length. */
const NEARLY_FULL_LINES_LEFT = 3;

/** Whether the user's line can go in the conversation: something to say, short enough, and room for it. */
function canAdd(turns: ChatMessage[], content: string): boolean {
  return content.length > 0 && content.length <= MAX_MESSAGE_LENGTH && linesLeft(turns) > 0;
}

function conversationReducer(state: ConversationState, event: ConversationEvent): ConversationState {
  switch (event.type) {
    case "sent":
      // One reply at a time: the composer is locked while one is on its way.
      if (state.phase.kind === "awaiting-reply") return state;
      // The screen never offers a line the server would reject; this makes sure one can't be sent.
      if (!canAdd(state.turns, event.content)) return state;
      return awaitingReplyTo(state.categoryId, [...state.turns, { role: "user", content: event.content }]);

    case "replyArrived":
      if (!isAwaiting(state, event.request)) return state;
      return { ...state, turns: [...state.turns, event.reply], phase: { kind: "ready" } };

    case "replyFailed":
      if (!isAwaiting(state, event.request)) return state;
      return { ...state, phase: { kind: "failed", errorMessage: event.errorMessage } };

    case "retried":
      if (state.phase.kind !== "failed") return state;
      return awaitingReplyTo(state.categoryId, state.turns);
  }
}

/** A reply only lands if it answers the request the conversation is still waiting on. */
function isAwaiting(state: ConversationState, request: ReplyRequest): boolean {
  return state.phase.kind === "awaiting-reply" && state.phase.request === request;
}

export type LengthLimit = "not-near" | "near" | "reached";

function lengthLimitOf(turns: ChatMessage[]): LengthLimit {
  const left = linesLeft(turns);
  if (left === 0) return "reached";
  return left <= NEARLY_FULL_LINES_LEFT ? "near" : "not-near";
}

export interface PracticeConversation {
  turns: ChatMessage[];
  /** The Persona's reply (or opening line) is on its way; the user can't send until it lands. */
  isAwaitingReply: boolean;
  /** Set when the last request failed, until the user retries or sends another line. */
  errorMessage: string | null;
  /** The user has said at least one thing, so leaving would lose something. */
  hasSaidSomething: boolean;
  /** End & get feedback is available: the user has spoken, and no reply is pending. */
  canEnd: boolean;
  /**
   * Where the conversation stands against its length limit (issue #58): "near" a few lines before
   * it, and "reached" once there's no room for another line and its reply, so the composer gives
   * way to End & get feedback. A Try again for a failed reply still fits after the limit is reached.
   */
  lengthLimit: LengthLimit;
  send: (content: string) => void;
  retry: () => void;
}

/**
 * Runs one Practice Conversation, opened in `categoryId` when the calling component mounts. The
 * conversation keeps that category for its life, so a later change to the argument never sends
 * its turns under another category's Persona; to start over in a different category, remount the
 * caller (the Conversation screen is keyed by category for exactly this).
 */
export function usePracticeConversation(categoryId: string): PracticeConversation {
  const [state, dispatch] = useReducer(conversationReducer, categoryId, opening);
  const pendingRequest = state.phase.kind === "awaiting-reply" ? state.phase.request : null;
  const conversationCategoryId = state.categoryId;

  // Every transition that needs a reply puts a new request in the state; this sends it. A request
  // torn down before it settles (React StrictMode's dev-only double mount, or leaving the screen)
  // is dropped, so a stale reply never overwrites a newer one.
  useEffect(() => {
    if (!pendingRequest) return;
    let superseded = false;

    requestAiReply(pendingRequest.messages, conversationCategoryId).then(
      (reply) => {
        if (!superseded) dispatch({ type: "replyArrived", request: pendingRequest, reply });
      },
      (error: unknown) => {
        if (!superseded) dispatch({ type: "replyFailed", request: pendingRequest, errorMessage: describeAiError(error) });
      },
    );

    return () => {
      superseded = true;
    };
  }, [pendingRequest, conversationCategoryId]);

  const isAwaitingReply = pendingRequest !== null;
  const hasSaidSomething = state.turns.some((turn) => turn.role === "user");

  return {
    turns: state.turns,
    isAwaitingReply,
    errorMessage: state.phase.kind === "failed" ? state.phase.errorMessage : null,
    hasSaidSomething,
    canEnd: !isAwaitingReply && hasSaidSomething,
    lengthLimit: lengthLimitOf(state.turns),
    send: (content) => dispatch({ type: "sent", content }),
    retry: () => dispatch({ type: "retried" }),
  };
}
