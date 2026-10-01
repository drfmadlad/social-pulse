import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ChatMessage } from "./aiProxyClient";
import { ChatScreen } from "./ChatScreen";
import type { EndedConversationState } from "./FeedbackSummaryRoute";
import { findFocus } from "./focuses";
import { feedbackSummaryPath, FOCUS_PARAM, scenarioBriefPath } from "./practicePaths";
import { findCategory } from "./scenarioCategories";
import { findScenario } from "./scenarios";

export function ConversationScreen() {
  const { categoryId, scenarioId } = useParams<{ categoryId: string; scenarioId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = findCategory(categoryId);
  const scenario = category && findScenario(category.id, scenarioId);
  const focusId = searchParams.get(FOCUS_PARAM);
  const focus = findFocus(focusId);

  if (!category) {
    return <Navigate to="/practice" replace />;
  }

  // A Focus the app doesn't offer is treated like an unknown Scenario: back to the brief to set up
  // again, rather than a conversation whose feedback the server would refuse.
  if (!scenario || (focusId !== null && !focus)) {
    return <Navigate to={scenarioBriefPath(category.id)} replace />;
  }

  function handleEnd(transcript: ChatMessage[]) {
    // The History id is minted here, as the conversation ends, and travels in the URL itself (not
    // just router state) so the Feedback screen can still find this entry after a reload.
    const entryId = crypto.randomUUID();
    // The Focus is only the feedback's business: the Persona never hears about it.
    const state: EndedConversationState = { transcript, scenarioId: scenario!.id, ...(focus && { focusId: focus.id }) };
    // Replaced, not pushed: an ended conversation can't be picked up again, so back from its Feedback
    // Summary goes to what was under the conversation rather than opening a fresh one at its URL.
    navigate(feedbackSummaryPath(category!.id, entryId), { state, replace: true });
  }

  // Keyed by Scenario so a different Scenario's URL starts a fresh conversation rather than
  // carrying this one's turns across.
  return (
    <ChatScreen
      key={`${category.id}/${scenario.id}`}
      category={category}
      scenario={scenario}
      onBack={() => navigate("/practice")}
      onEnd={handleEnd}
    />
  );
}
