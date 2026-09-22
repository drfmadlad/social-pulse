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
    // The History id is minted here, as the conversation ends, so the Feedback screen can save the
    // conversation before any feedback exists and find that same entry again if it's revisited.
    navigate(`/practice/${category!.id}/feedback`, { state: { transcript, entryId: crypto.randomUUID() } });
  }

  return <ChatScreen category={category} onBack={() => navigate("/practice")} onEnd={handleEnd} />;
}
