import { useEffect, useState, type FormEvent } from "react";
import { useBlocker } from "react-router-dom";
import { AiProxyError, requestAiReply, type ChatMessage } from "./aiProxyClient";
import { LeaveConversationDialog } from "./LeaveConversationDialog";
import { useScreenDirection } from "../ScreenTransition";
import { screenTransitionClassName } from "../screenDirection";
import type { ScenarioCategory } from "./scenarioCategories";
import { TranscriptView } from "./TranscriptView";
import { useLatestRequestGuard } from "./useLatestRequestGuard";

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
  const { start, isStale } = useLatestRequestGuard();
  const direction = useScreenDirection();

  const isBusy = phase === "loading-opening" || phase === "sending";
  const canSend = !isBusy && draft.trim().length > 0;
  const hasSaidSomething = turns.some((turn) => turn.role === "user");
  const canEnd = (phase === "chatting" || phase === "error") && hasSaidSomething;

  // Guards every way out of the screen (issue #33) — the on-screen back button below and the
  // system back gesture both attempt navigation through this same router, so one blocker catches
  // both. Ending the conversation navigates to its Feedback Summary (issue #35 put the History
  // entry id on the end of that URL), which isn't leaving, so that path is exempted rather than
  // asked about.
  const feedbackPathPrefix = `/practice/${category.id}/feedback/`;
  const blocker = useBlocker(
    ({ nextLocation }) => hasSaidSomething && !nextLocation.pathname.startsWith(feedbackPathPrefix),
  );

  async function sendTurns(nextTurns: ChatMessage[]) {
    const requestId = start();
    const isOpeningLine = nextTurns.length === 0;
    setTurns(nextTurns);
    setPhase(isOpeningLine ? "loading-opening" : "sending");
    setErrorMessage(null);

    try {
      const reply = await requestAiReply(nextTurns, category.id);
      if (isStale(requestId)) return;
      setTurns([...nextTurns, reply]);
      setPhase("chatting");
    } catch (error) {
      if (isStale(requestId)) return;
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
    <div className={`conversation-screen ${screenTransitionClassName(direction)}`}>
      <header className="conversation-screen__header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Practice
        </button>
        <h3>{category.personaName}</h3>
        <button
          type="button"
          className="button-primary conversation-screen__end-button"
          disabled={!canEnd}
          onClick={() => onEnd(turns)}
        >
          End &amp; get feedback
        </button>
      </header>

      <div className="conversation-screen__transcript">
        <TranscriptView transcript={turns} personaName={category.personaName} isTyping={isBusy} />
        {phase === "error" && errorMessage && (
          <div role="alert" className="chat-screen__error">
            <p>{errorMessage}</p>
            <button type="button" className="button-primary" onClick={handleRetry}>
              Try again
            </button>
          </div>
        )}
      </div>

      <form className="conversation-screen__composer" onSubmit={handleSend}>
        <label htmlFor="chat-draft">Message</label>
        <input
          id="chat-draft"
          value={draft}
          disabled={isBusy}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="button-primary" disabled={!canSend}>
          Send
        </button>
      </form>

      {blocker.state === "blocked" && (
        <LeaveConversationDialog onCancel={() => blocker.reset()} onLeave={() => blocker.proceed()} />
      )}
    </div>
  );
}
