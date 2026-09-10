import { useEffect, useState, type FormEvent } from "react";
import { AiProxyError, requestPersonaReply, type ChatMessage } from "./aiProxyClient";
import type { ScenarioCategory } from "./scenarioCategories";

type Phase = "loading-opening" | "chatting" | "sending" | "error";

interface ChatScreenProps {
  category: ScenarioCategory;
  onBack: () => void;
  onEnd: (transcript: ChatMessage[]) => void;
}

export function ChatScreen({ category, onBack, onEnd }: ChatScreenProps) {
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("loading-opening");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const isBusy = phase === "loading-opening" || phase === "sending";
  const canSend = !isBusy && draft.trim().length > 0;
  const canEnd = phase === "chatting" || phase === "error";

  async function sendTurns(nextTurns: ChatMessage[]) {
    const isOpeningLine = nextTurns.length === 0;
    setTurns(nextTurns);
    setPhase(isOpeningLine ? "loading-opening" : "sending");
    setErrorMessage(null);

    try {
      const systemMessage: ChatMessage = { role: "system", content: category.systemPrompt };
      const reply = await requestPersonaReply([systemMessage, ...nextTurns]);
      setTurns([...nextTurns, reply]);
      setPhase("chatting");
    } catch (error) {
      setErrorMessage(error instanceof AiProxyError ? error.message : "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  useEffect(() => {
    void sendTurns([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    const content = draft.trim();
    setDraft("");
    void sendTurns([...turns, { role: "user", content }]);
  }

  function handleRetry() {
    void sendTurns(turns);
  }

  return (
    <div className="chat-screen">
      <button type="button" className="chat-screen__back" onClick={onBack}>
        ← Back to categories
      </button>
      <h3>{category.personaName}</h3>
      <ul className="chat-screen__messages">
        {turns.map((turn, index) => (
          <li key={`${turn.role}-${index}`} className={`chat-message chat-message--${turn.role}`}>
            <span className="chat-message__author">{turn.role === "user" ? "You" : category.personaName}</span>
            <p>{turn.content}</p>
          </li>
        ))}
      </ul>
      {isBusy && <p role="status">{category.personaName} is typing…</p>}
      {phase === "error" && errorMessage && (
        <div role="alert" className="chat-screen__error">
          <p>{errorMessage}</p>
          <button type="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}
      <form onSubmit={handleSend}>
        <label htmlFor="chat-draft">Message</label>
        <input
          id="chat-draft"
          value={draft}
          disabled={isBusy}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={!canSend}>
          Send
        </button>
      </form>
      <button type="button" disabled={!canEnd} onClick={() => onEnd(turns)}>
        End &amp; get feedback
      </button>
    </div>
  );
}
