import { useEffect, useReducer } from "react";
import { AiProxyError, requestAiReply, type ChatMessage } from "./aiProxyClient";

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
  turns: ChatMessage[];
  phase: Phase;
}

type ConversationEvent =
  | { type: "sent"; content: string }
  | { type: "replyArrived"; request: ReplyRequest; reply: ChatMessage }
  | { type: "replyFailed"; request: ReplyRequest; errorMessage: string }
  | { type: "retried" };

function awaitingReplyTo(turns: ChatMessage[]): ConversationState {
  return { turns, phase: { kind: "awaiting-reply", request: { messages: turns } } };
}

/** A conversation opens on the Persona's first line, so it starts out waiting for it. */
function opening(): ConversationState {
  return awaitingReplyTo([]);
}

function conversationReducer(state: ConversationState, event: ConversationEvent): ConversationState {
  switch (event.type) {
    case "sent":
      // One reply at a time: the composer is locked while one is on its way.
      if (state.phase.kind === "awaiting-reply") return state;
      return awaitingReplyTo([...state.turns, { role: "user", content: event.content }]);

    case "replyArrived":
      if (!isAwaiting(state, event.request)) return state;
      return { turns: [...state.turns, event.reply], phase: { kind: "ready" } };

    case "replyFailed":
      if (!isAwaiting(state, event.request)) return state;
      return { turns: state.turns, phase: { kind: "failed", errorMessage: event.errorMessage } };

    case "retried":
      if (state.phase.kind !== "failed") return state;
      return awaitingReplyTo(state.turns);
  }
}

/** A reply only lands if it answers the request the conversation is still waiting on. */
function isAwaiting(state: ConversationState, request: ReplyRequest): boolean {
  return state.phase.kind === "awaiting-reply" && state.phase.request === request;
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
  send: (content: string) => void;
  retry: () => void;
}

/**
 * Runs one Practice Conversation in `categoryId`. A fresh conversation per mount: the screen that
 * uses this is keyed by category, so a different category starts over.
 */
export function usePracticeConversation(categoryId: string): PracticeConversation {
  const [state, dispatch] = useReducer(conversationReducer, undefined, opening);
  const pendingRequest = state.phase.kind === "awaiting-reply" ? state.phase.request : null;

  // Every transition that needs a reply puts a new request in the state; this sends it. A request
  // torn down before it settles (React StrictMode's dev-only double mount, or leaving the screen)
  // is dropped, so a stale reply never overwrites a newer one.
  useEffect(() => {
    if (!pendingRequest) return;
    let superseded = false;

    requestAiReply(pendingRequest.messages, categoryId).then(
      (reply) => {
        if (!superseded) dispatch({ type: "replyArrived", request: pendingRequest, reply });
      },
      (error: unknown) => {
        if (superseded) return;
        const errorMessage = error instanceof AiProxyError ? error.message : "Something went wrong. Please try again.";
        dispatch({ type: "replyFailed", request: pendingRequest, errorMessage });
      },
    );

    return () => {
      superseded = true;
    };
  }, [pendingRequest, categoryId]);

  const isAwaitingReply = pendingRequest !== null;
  const hasSaidSomething = state.turns.some((turn) => turn.role === "user");

  return {
    turns: state.turns,
    isAwaitingReply,
    errorMessage: state.phase.kind === "failed" ? state.phase.errorMessage : null,
    hasSaidSomething,
    canEnd: !isAwaitingReply && hasSaidSomething,
    send: (content) => dispatch({ type: "sent", content }),
    retry: () => dispatch({ type: "retried" }),
  };
}
