import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { ChatMessage } from "./aiProxyClient";
import { ChatScreen } from "./ChatScreen";
import type { EndedConversationState } from "./FeedbackSummaryRoute";
import { feedbackSummaryPath, scenarioBriefPath } from "./practicePaths";
import { findCategory } from "./scenarioCategories";
import { findScenario } from "./scenarios";

export function ConversationScreen() {
  const { categoryId, scenarioId } = useParams<{ categoryId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const category = findCategory(categoryId);
  const scenario = category && findScenario(category.id, scenarioId);

  if (!category) {
    return <Navigate to="/practice" replace />;
  }

  if (!scenario) {
    return <Navigate to={scenarioBriefPath(category.id)} replace />;
  }

  function handleEnd(transcript: ChatMessage[]) {
    // The History id is minted here, as the conversation ends, and travels in the URL itself (not
    // just router state) so the Feedback screen can still find this entry after a reload.
    const entryId = crypto.randomUUID();
    const state: EndedConversationState = { transcript, scenarioId: scenario!.id };
    navigate(feedbackSummaryPath(category!.id, entryId), { state });
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
