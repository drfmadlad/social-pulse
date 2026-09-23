import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getHistoryEntry } from "../history/historyStore";
import type { ChatMessage } from "./aiProxyClient";
import { FeedbackSummaryScreen } from "./FeedbackSummaryScreen";
import { scenarioCategories } from "./scenarioCategories";

interface FeedbackLocationState {
  transcript: ChatMessage[];
}

// ConversationScreen.handleEnd navigates here with the transcript in router state, since it's
// already in hand and saving it needs no round trip. A reload loses that state, so this screen
// falls back to reading the transcript off the saved History entry the URL's id names — the
// conversation is always saved to History before this screen can be reached.
type ResolvedTranscript =
  | { kind: "found"; transcript: ChatMessage[] }
  | { kind: "loading" }
  | { kind: "not-found" };

export function FeedbackSummaryRoute() {
  const { categoryId, entryId } = useParams<{ categoryId: string; entryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const category = scenarioCategories.find((candidate) => candidate.id === categoryId);
  const state = location.state as FeedbackLocationState | null;

  const [resolved, setResolved] = useState<ResolvedTranscript>(() =>
    state?.transcript ? { kind: "found", transcript: state.transcript } : { kind: "loading" },
  );

  useEffect(() => {
    if (state?.transcript || !entryId) return;
    let cancelled = false;
    async function load() {
      const entry = await getHistoryEntry(entryId!);
      if (cancelled) return;
      setResolved(entry ? { kind: "found", transcript: entry.transcript } : { kind: "not-found" });
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

  return (
    <div className="home-section">
      <FeedbackSummaryScreen
        category={category}
        entryId={entryId}
        transcript={resolved.transcript}
        onDone={() => navigate("/")}
      />
    </div>
  );
}
