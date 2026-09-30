import { useState, type FormEvent } from "react";
import { useBlocker } from "react-router-dom";
import type { ChatMessage } from "./aiProxyClient";
import { LeaveConversationDialog } from "./LeaveConversationDialog";
import { useScreenDirection } from "../ScreenTransition";
import { screenTransitionClassName } from "../screenDirection";
import type { ScenarioCategory } from "./scenarioCategories";
import { TranscriptView } from "./TranscriptView";
import { usePracticeConversation } from "./usePracticeConversation";

interface ChatScreenProps {
  category: ScenarioCategory;
  onBack: () => void;
  onEnd: (transcript: ChatMessage[]) => void;
}

export function ChatScreen({ category, onBack, onEnd }: ChatScreenProps) {
  const conversation = usePracticeConversation(category.id);
  const [draft, setDraft] = useState("");
  const direction = useScreenDirection();

  const canSend = !conversation.isAwaitingReply && draft.trim().length > 0;

  // Guards every way out of the screen (issue #33) — the on-screen back button below and the
  // system back gesture both attempt navigation through this same router, so one blocker catches
  // both. Ending the conversation navigates to its Feedback Summary (issue #35 put the History
  // entry id on the end of that URL), which isn't leaving, so that path is exempted rather than
  // asked about.
  const feedbackPathPrefix = `/practice/${category.id}/feedback/`;
  const blocker = useBlocker(
    ({ nextLocation }) => conversation.hasSaidSomething && !nextLocation.pathname.startsWith(feedbackPathPrefix),
  );

  function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    conversation.send(draft.trim());
    setDraft("");
  }

  return (
    <div className={`conversation-screen ${screenTransitionClassName(direction)}`}>
      <header className="conversation-screen__header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Practice
        </button>
        <h1>{category.personaName}</h1>
        <button
          type="button"
          className="button-primary conversation-screen__end-button"
          disabled={!conversation.canEnd}
          onClick={() => onEnd(conversation.turns)}
        >
          End &amp; get feedback
        </button>
      </header>

      <div className="conversation-screen__transcript">
        <TranscriptView
          transcript={conversation.turns}
          personaName={category.personaName}
          isTyping={conversation.isAwaitingReply}
        />
        {conversation.errorMessage && (
          <div role="alert" className="chat-screen__error">
            <p>{conversation.errorMessage}</p>
            <button type="button" className="button-primary" onClick={conversation.retry}>
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
          disabled={conversation.isAwaitingReply}
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
