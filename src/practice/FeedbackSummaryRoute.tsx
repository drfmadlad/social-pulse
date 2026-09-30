import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getHistoryEntry } from "../history/historyStore";
import type { ChatMessage } from "./aiProxyClient";
import { FeedbackSummaryScreen } from "./FeedbackSummaryScreen";
import { findCategory } from "./scenarioCategories";
import { scenarioOfEntry } from "./scenarios";

/** What the Conversation screen hands over as it ends: everything its History entry is saved from. */
export interface EndedConversationState {
  transcript: ChatMessage[];
  scenarioId: string;
}

// ConversationScreen.handleEnd navigates here with the transcript and Scenario in router state,
// since they're already in hand and saving them needs no round trip. A reload loses that state, so
// this screen falls back to reading them off the saved History entry the URL's id names — the
// conversation is always saved to History before this screen can be reached.
type ResolvedConversation =
  | { kind: "found"; transcript: ChatMessage[]; scenarioId: string | undefined }
  | { kind: "loading" }
  | { kind: "not-found" };

export function FeedbackSummaryRoute() {
  const { categoryId, entryId } = useParams<{ categoryId: string; entryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const category = findCategory(categoryId);
  const state = location.state as EndedConversationState | null;

  const [resolved, setResolved] = useState<ResolvedConversation>(() =>
    state?.transcript
      ? { kind: "found", transcript: state.transcript, scenarioId: state.scenarioId }
      : { kind: "loading" },
  );

  useEffect(() => {
    if (state?.transcript || !entryId) return;
    let cancelled = false;
    async function load() {
      const entry = await getHistoryEntry(entryId!);
      if (cancelled) return;
      setResolved(
        entry ? { kind: "found", transcript: entry.transcript, scenarioId: entry.scenarioId } : { kind: "not-found" },
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entryId, state?.transcript]);

  if (!category || !entryId || resolved.kind === "not-found") {
    return <Navigate to="/practice" replace />;
  }

  if (resolved.kind === "loading") {
    return null;
  }

  // Defined for every known category: an entry saved before Scenarios existed gets its category's
  // default Scenario, the one it was set in.
  const scenario = scenarioOfEntry({ categoryId: category.id, scenarioId: resolved.scenarioId })!;

  return (
    <div className="home-section">
      <FeedbackSummaryScreen
        category={category}
        scenario={scenario}
        entryId={entryId}
        transcript={resolved.transcript}
        onDone={() => navigate("/")}
      />
    </div>
  );
}
