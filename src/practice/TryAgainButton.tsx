import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { findFocus } from "./focuses";
import { getOwnScenario } from "./ownScenarioStore";
import { OWN_CATEGORY_ID } from "./ownScenarios";
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
 * leaves nothing to start, so there's no button. An Own Scenario's entry tries again in the Own
 * Scenario as it's saved now (edited, if it was), and has no button once it's been deleted.
 */
export function TryAgainButton({ conversation, replace = false }: TryAgainButtonProps) {
  if (conversation.categoryId === OWN_CATEGORY_ID) {
    return conversation.scenarioId ? (
      <OwnTryAgainButton ownScenarioId={conversation.scenarioId} focusId={conversation.focusId} replace={replace} />
    ) : null;
  }

  const scenario = scenarioOfEntry(conversation);
  if (!scenario) return null;
  const path = conversationPath(scenario.categoryId, scenario.id, findFocus(conversation.focusId)?.id);
  return <TryAgainLink path={path} replace={replace} />;
}

/** Offered only once the Own Scenario is known to still be saved, so it never opens onto a missing one. */
function OwnTryAgainButton({
  ownScenarioId,
  focusId,
  replace,
}: {
  ownScenarioId: string;
  focusId: string | undefined;
  replace: boolean;
}) {
  const [stillSaved, setStillSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      let found = false;
      try {
        found = (await getOwnScenario(ownScenarioId)) !== undefined;
      } catch (error) {
        console.error("Failed to read the Own Scenario", error);
      }
      if (!cancelled) setStillSaved(found);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [ownScenarioId]);

  if (!stillSaved) return null;
  return <TryAgainLink path={conversationPath(OWN_CATEGORY_ID, ownScenarioId, findFocus(focusId)?.id)} replace={replace} />;
}

function TryAgainLink({ path, replace }: { path: string; replace: boolean }) {
  const navigate = useNavigate();

  function tryAgain() {
    navigate(path, { replace });
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
