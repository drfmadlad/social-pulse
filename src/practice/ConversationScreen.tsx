import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { ChatMessage } from "./aiProxyClient";
import { ChatScreen } from "./ChatScreen";
import { scenarioCategories } from "./scenarioCategories";

export function ConversationScreen() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const category = scenarioCategories.find((candidate) => candidate.id === categoryId);

  if (!category) {
    return <Navigate to="/practice" replace />;
  }

  function handleEnd(transcript: ChatMessage[]) {
    // The History id is minted here, as the conversation ends, and travels in the URL itself (not
    // just router state) so the Feedback screen can still find this entry after a reload.
    const entryId = crypto.randomUUID();
    navigate(`/practice/${category!.id}/feedback/${entryId}`, { state: { transcript } });
  }

  return <ChatScreen category={category} onBack={() => navigate("/practice")} onEnd={handleEnd} />;
}
