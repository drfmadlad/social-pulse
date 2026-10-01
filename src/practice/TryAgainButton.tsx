import { useNavigate } from "react-router-dom";
import { findFocus } from "./focuses";
import { newConversationStart } from "./inProgressConversation";
import { conversationPath } from "./practicePaths";
import { scenarioOfEntry } from "./scenarios";

/** A finished conversation as its History entry records it: all Try again carries over. */
export interface FinishedConversation {
  categoryId: string;
  /** Absent on an entry saved before Scenarios existed. */
  scenarioId?: string;
  /** Absent when it had no Focus. */
  focusId?: string;
}

interface TryAgainButtonProps {
  conversation: FinishedConversation;
  /**
   * Replace the current screen in history rather than push onto it. The Feedback Summary does, so
   * back from the new conversation leaves Practice the way a conversation started from the brief
   * does, and attempts never pile up in the back stack. A History entry doesn't: it's a place the
   * user browsed to, and back returns there.
   */
  replace?: boolean;
}

/**
 * Try again (INFORMATION-ARCHITECTURE.md, Scenario brief): a fresh Practice Conversation in the same
 * Scenario with the same Focus, skipping the brief. It carries nothing of the finished conversation
 * but those two, so the new one isn't linked to it (INFORMATION-ARCHITECTURE.md §5).
 *
 * An entry saved before Scenarios existed tries again in its category's default Scenario, and one
 * naming a Focus the app no longer offers tries again without one. A category the app no longer has
 * leaves nothing to start, so there's no button.
 */
export function TryAgainButton({ conversation, replace = false }: TryAgainButtonProps) {
  const navigate = useNavigate();
  const scenario = scenarioOfEntry(conversation);
  if (!scenario) return null;
  const path = conversationPath(scenario.categoryId, scenario.id, findFocus(conversation.focusId)?.id);

  function tryAgain() {
    // A fresh transcript: a conversation left in progress in this Scenario isn't resumed (issue #68).
    navigate(path, { replace, state: newConversationStart() });
  }

  // The accessible name says what it starts, since a failed Feedback Summary's own retry also reads
  // "Try again" and asks for the feedback again instead. It begins with the visible label, so voice
  // control still finds it by what's on screen.
  return (
    <button
      type="button"
      className="button-secondary try-again-button"
      aria-label="Try again in a new conversation"
      onClick={tryAgain}
    >
      Try again
    </button>
  );
}
