import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getHistoryEntry } from "../history/historyStore";
import type { ChatMessage } from "./aiProxyClient";
import { FeedbackSummaryScreen } from "./FeedbackSummaryScreen";
import { findFocus } from "./focuses";
import { OWN_CATEGORY_ID, ownScenarioAsCategory, ownScenarioAsScenario } from "./ownScenarios";
import { findCategory, type ScenarioCategory } from "./scenarioCategories";
import { scenarioOfEntry, type OwnScenarioText, type Scenario } from "./scenarios";

/** What the Conversation screen hands over as it ends: everything its History entry is saved from. */
export interface EndedConversationState {
  transcript: ChatMessage[];
  scenarioId: string;
  /** Absent when the conversation had no Focus. */
  focusId?: string;
  /** What the user wrote, for a conversation set in an Own Scenario (issue #67). Absent otherwise. */
  ownScenario?: OwnScenarioText;
}

// ConversationScreen.handleEnd navigates here with the transcript, Scenario and Focus in router state,
// since they're already in hand and saving them needs no round trip. A reload loses that state, so
// this screen falls back to reading them off the saved History entry the URL's id names — the
// conversation is always saved to History before this screen can be reached.
type ResolvedConversation =
  | {
      kind: "found";
      transcript: ChatMessage[];
      scenarioId: string | undefined;
      focusId: string | undefined;
      ownScenario: OwnScenarioText | undefined;
    }
  | { kind: "loading" }
  | { kind: "not-found" };

/**
 * The category and Scenario the conversation was set in. A Scenario Category's come from the app's
 * own lists (an entry saved before Scenarios existed gets its category's default Scenario, the one
 * it was set in). An Own Scenario's come from the text kept with the conversation, since the Own
 * Scenario itself may have been edited or deleted since.
 */
function settingOf(
  categoryId: string,
  conversation: { scenarioId: string | undefined; ownScenario: OwnScenarioText | undefined },
): { category: ScenarioCategory; scenario: Scenario } | undefined {
  if (categoryId === OWN_CATEGORY_ID) {
    if (!conversation.ownScenario || !conversation.scenarioId) return undefined;
    return {
      category: ownScenarioAsCategory(conversation.ownScenario),
      scenario: ownScenarioAsScenario({ id: conversation.scenarioId, ...conversation.ownScenario }),
    };
  }
  const category = findCategory(categoryId);
  if (!category) return undefined;
  return { category, scenario: scenarioOfEntry({ categoryId, scenarioId: conversation.scenarioId })! };
}

export function FeedbackSummaryRoute() {
  const { categoryId, entryId } = useParams<{ categoryId: string; entryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isKnownCategory = categoryId === OWN_CATEGORY_ID || findCategory(categoryId) !== undefined;
  const state = location.state as EndedConversationState | null;

  const [resolved, setResolved] = useState<ResolvedConversation>(() =>
    state?.transcript
      ? {
          kind: "found",
          transcript: state.transcript,
          scenarioId: state.scenarioId,
          focusId: state.focusId,
          ownScenario: state.ownScenario,
        }
      : { kind: "loading" },
  );

  useEffect(() => {
    if (state?.transcript || !entryId) return;
    let cancelled = false;
    async function load() {
      const entry = await getHistoryEntry(entryId!);
      if (cancelled) return;
      setResolved(
        entry
          ? {
              kind: "found",
              transcript: entry.transcript,
              scenarioId: entry.scenarioId,
              focusId: entry.focusId,
              ownScenario: entry.ownScenario,
            }
          : { kind: "not-found" },
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entryId, state?.transcript]);

  // Stable across renders: the Feedback Summary screen saves the conversation in an effect that
  // depends on both, so an Own Scenario's stand-ins mustn't be rebuilt each time.
  const setting = useMemo(
    () => (resolved.kind === "found" && categoryId ? settingOf(categoryId, resolved) : undefined),
    [categoryId, resolved],
  );

  if (!isKnownCategory || !entryId || resolved.kind === "not-found") {
    return <Navigate to="/practice" replace />;
  }

  if (resolved.kind === "loading") {
    return null;
  }

  // Only an Own Scenario's entry can lack one, if what it was saved with is missing.
  if (!setting) {
    return <Navigate to="/practice" replace />;
  }

  return (
    <div className="home-section">
      <FeedbackSummaryScreen
        category={setting.category}
        scenario={setting.scenario}
        focus={findFocus(resolved.focusId)}
        entryId={entryId}
        transcript={resolved.transcript}
        onDone={() => navigate("/")}
      />
    </div>
  );
}
