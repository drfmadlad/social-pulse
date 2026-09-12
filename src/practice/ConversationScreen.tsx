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
    navigate(`/practice/${category!.id}/feedback`, { state: { transcript } });
  }

  return <ChatScreen category={category} onBack={() => navigate("/practice")} onEnd={handleEnd} />;
}
