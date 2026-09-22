import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import type { ChatMessage } from "./aiProxyClient";
import { FeedbackSummaryScreen } from "./FeedbackSummaryScreen";
import { scenarioCategories } from "./scenarioCategories";

interface FeedbackLocationState {
  transcript: ChatMessage[];
  entryId: string;
}

export function FeedbackSummaryRoute() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const category = scenarioCategories.find((candidate) => candidate.id === categoryId);
  // Only ConversationScreen.handleEnd navigates here, always with a transcript and entry id in state;
  // a bookmarked or manually-typed URL has no state, which the missing-transcript check below catches.
  const state = location.state as FeedbackLocationState | null;

  if (!category || !state?.transcript || !state.entryId) {
    return <Navigate to="/practice" replace />;
  }

  return (
    <div className="home-section">
      <FeedbackSummaryScreen
        category={category}
        entryId={state.entryId}
        transcript={state.transcript}
        onDone={() => navigate("/")}
      />
    </div>
  );
}
