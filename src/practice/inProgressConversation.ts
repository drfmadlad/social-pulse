import { MAX_CONVERSATION_MESSAGES } from "../requestLimits";
import type { ChatMessage, ChatRole } from "./aiProxyClient";

/**
 * A Practice Conversation's on-device safety net (issue #68): its transcript is kept turn by turn,
 * so a reload, a crash or the system closing a backgrounded app doesn't lose it. It isn't History:
 * the copy is cleared when the conversation ends (History saves it then) or the user leaves it.
 *
 * It's kept in localStorage rather than IndexedDB on purpose. The write is synchronous, so a turn is
 * on the device before the system can close the app mid-write, and the read is synchronous too, so a
 * reloaded conversation opens already restored instead of through a loading state. It also needs no
 * IndexedDB store, so no database upgrade. Every storage call is allowed to fail (private browsing,
 * a full device, storage turned off): the conversation then simply runs in memory, as it always did.
 *
 * One copy is kept per Scenario. It holds the transcript, which already contains everything that
 * shapes it: a Rewind removes turns from it, and a Hint the user asked for sits in it.
 */

const KEY_PREFIX = "social-pulse:in-progress-conversation:";

/** Bumped if the record's shape ever changes incompatibly, so an older copy reads as none. */
const RECORD_VERSION = 1;

interface InProgressRecord {
  version: number;
  /** The Focus the conversation was opened with; a URL naming another one is not this conversation. */
  focusId: string | null;
  /** The deliberate start that began it (see `ConversationStart`), if it began with one. */
  startToken: string | null;
  turns: ChatMessage[];
}

/** What identifies the conversation a screen is opening. */
export interface ConversationIdentity {
  /** Names the Scenario, e.g. "dating/coffee-first-date". One copy is kept per value. */
  scenarioKey: string;
  focusId: string | null;
  /**
   * Set when the user deliberately started this conversation (Start on the brief, Try again), and
   * different every time. A copy begun by the same start is a reload of it and is restored; one begun
   * by another start is left over from an earlier conversation and is dropped. It's null when the
   * conversation was opened by URL alone (a bookmark, a reopened tab), which restores any copy.
   */
  startToken: string | null;
}

/** One conversation's place in storage: what it opened with, and how it keeps itself. */
export interface ConversationSlot {
  /** The transcript to carry on from, or null when this is a new conversation. */
  restoredTurns: ChatMessage[] | null;
  /** Called once the conversation is open: drops a copy left by a conversation this one replaced. */
  dropStale: () => void;
  /** Keeps the transcript as it now stands. Does nothing once the conversation was discarded. */
  save: (turns: ChatMessage[]) => void;
  /** The conversation ended or was left: removes the copy for good and stops `save` bringing it back. */
  discard: () => void;
}

const ROLES: readonly string[] = ["system", "user", "assistant"] satisfies ChatRole[];

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return typeof content === "string" && typeof role === "string" && ROLES.includes(role);
}

/** A stored copy is only believed when it has the right shape and a line from the user to carry on from. */
function parseRecord(raw: string): InProgressRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Partial<InProgressRecord>;
  const { turns } = record;
  if (record.version !== RECORD_VERSION) return null;
  if (!Array.isArray(turns) || turns.length > MAX_CONVERSATION_MESSAGES) return null;
  if (!turns.every(isChatMessage) || !turns.some((turn) => turn.role === "user")) return null;
  return {
    version: RECORD_VERSION,
    focusId: typeof record.focusId === "string" ? record.focusId : null,
    startToken: typeof record.startToken === "string" ? record.startToken : null,
    turns,
  };
}

function readRecord(key: string): InProgressRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : parseRecord(raw);
  } catch {
    return null;
  }
}

function removeRecord(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear if storage isn't there.
  }
}

/**
 * Opens a conversation's slot, restoring its copy if it has one: the copy has to be for the same
 * Focus, and, when this open comes from a deliberate start, from that same start.
 */
export function openConversationSlot({ scenarioKey, focusId, startToken }: ConversationIdentity): ConversationSlot {
  const key = KEY_PREFIX + scenarioKey;
  const record = readRecord(key);
  const restored =
    record !== null && record.focusId === focusId && (startToken === null || record.startToken === startToken)
      ? record
      : null;

  let discarded = false;

  return {
    restoredTurns: restored?.turns ?? null,
    dropStale() {
      if (!restored) removeRecord(key);
    },
    save(turns) {
      if (discarded) return;
      // A conversation restored from a bookmark keeps the token of the start that began it, so a
      // later reload of that same start still recognises it.
      const next: InProgressRecord = {
        version: RECORD_VERSION,
        focusId,
        startToken: startToken ?? restored?.startToken ?? null,
        turns,
      };
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // The device can't keep it; the conversation carries on in memory.
      }
    },
    discard() {
      discarded = true;
      removeRecord(key);
    },
  };
}

/**
 * Router state a navigation to a Conversation carries when the user is deliberately starting a new
 * one (Start on the brief, Try again). A reload of the screen it opens keeps the same state, so the
 * token tells the two apart: the conversation that began with this token restores itself on a
 * reload, and any copy left by another conversation in the same Scenario is dropped.
 */
export interface ConversationStart {
  conversationStart: string;
}

export function newConversationStart(): ConversationStart {
  return { conversationStart: crypto.randomUUID() };
}

/** The start token a Conversation was navigated to with, or null when it was opened by URL alone. */
export function startTokenOf(locationState: unknown): string | null {
  if (typeof locationState !== "object" || locationState === null) return null;
  const { conversationStart } = locationState as Partial<ConversationStart>;
  return typeof conversationStart === "string" ? conversationStart : null;
}
