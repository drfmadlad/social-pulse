import { useState, type FormEvent } from "react";
import { useBlocker } from "react-router-dom";
import { MAX_MESSAGE_LENGTH } from "../../api/_lib/requestLimits";
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
  const { turns, isAwaitingReply, errorMessage, hasSaidSomething, canEnd, lengthLimit, send, retry } =
    usePracticeConversation(category.id);
  const [draft, setDraft] = useState("");
  const direction = useScreenDirection();

  const canSend = !isAwaitingReply && draft.trim().length > 0;

  // Guards every way out of the screen (issue #33) — the on-screen back button below and the
  // system back gesture both attempt navigation through this same router, so one blocker catches
  // both. Ending the conversation navigates to its Feedback Summary (issue #35 put the History
  // entry id on the end of that URL), which isn't leaving, so that path is exempted rather than
  // asked about.
  const feedbackPathPrefix = `/practice/${category.id}/feedback/`;
  const blocker = useBlocker(
    ({ nextLocation }) => hasSaidSomething && !nextLocation.pathname.startsWith(feedbackPathPrefix),
  );

  function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    send(draft.trim());
    setDraft("");
  }

  // The top bar always has it; at the length limit it also takes the composer's place.
  function endButton(className: string) {
    return (
      <button type="button" className={className} disabled={!canEnd} onClick={() => onEnd(turns)}>
        End &amp; get feedback
      </button>
    );
  }

  return (
    <div className={`conversation-screen ${screenTransitionClassName(direction)}`}>
      <header className="conversation-screen__header">
        <button type="button" className="back-button" onClick={onBack}>
          ← Practice
        </button>
        <h1>{category.personaName}</h1>
        {endButton("button-primary conversation-screen__end-button")}
      </header>

      <div className="conversation-screen__transcript">
        <TranscriptView transcript={turns} personaName={category.personaName} isTyping={isAwaitingReply} />
        {lengthLimit === "near" && (
          <p role="status" className="conversation-screen__length-note">
            This conversation is nearly as long as it can go. You&apos;ve got a few more lines.
          </p>
        )}
        {errorMessage && (
          <div role="alert" className="chat-screen__error">
            <p>{errorMessage}</p>
            <button type="button" className="button-primary" onClick={retry}>
              Try again
            </button>
          </div>
        )}
      </div>

      {lengthLimit === "reached" ? (
        // At the length limit the composer gives way to ending (issue #58), so the user is never
        // left facing the server's validation error.
        <div className="conversation-screen__composer conversation-screen__composer--full">
          <p role="status" className="conversation-screen__full-note">
            This conversation is as long as it can go.
          </p>
          {endButton("button-primary")}
        </div>
      ) : (
        <form className="conversation-screen__composer" onSubmit={handleSend}>
          <label htmlFor="chat-draft">Message</label>
          <input
            id="chat-draft"
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isAwaitingReply}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="button-primary" disabled={!canSend}>
            Send
          </button>
        </form>
      )}

      {blocker.state === "blocked" && (
        <LeaveConversationDialog onCancel={() => blocker.reset()} onLeave={() => blocker.proceed()} />
      )}
    </div>
  );
}
