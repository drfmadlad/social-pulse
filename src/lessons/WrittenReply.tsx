import type { WrittenReplyStep } from "./lessons";
import type { WrittenReplyVerdict } from "./writtenReplyVerdict";

export type WrittenReplyStatus = "composing" | "sending" | "verdict" | "fallback";

export interface WrittenReplyAnswer {
  draft: string;
  status: WrittenReplyStatus;
  verdict?: WrittenReplyVerdict;
  reason?: string;
  fallbackMessage?: string;
}

interface WrittenReplyProps {
  step: WrittenReplyStep;
  answer: WrittenReplyAnswer | undefined;
  onDraftChange: (draft: string) => void;
  onRetry: () => void;
}

const VERDICT_PHRASES: Record<WrittenReplyVerdict, string> = {
  landed: "That lands.",
  not_yet: "Not quite yet.",
};

/** `movePractised` reads as a gerund phrase ("Reflecting the gist back…"), so lowercasing its
 * first letter lets it drop into "How would you respond, {…}?" as a participial phrase. */
function writtenReplyPrompt(movePractised: string): string {
  return `How would you respond, ${movePractised.charAt(0).toLowerCase()}${movePractised.slice(1)}?`;
}

export function WrittenReply({ step, answer, onDraftChange, onRetry }: WrittenReplyProps) {
  const status = answer?.status ?? "composing";
  const draft = answer?.draft ?? "";

  return (
    <div className="check reply-choice written-reply">
      <div className="reply-choice__setup">
        <p className="reply-choice__context">{step.context}</p>
        {/* Conversation's persona message, with no avatar and no speaker label (DESIGN.md §3). */}
        <ul className="chat-screen__messages reply-choice__transcript">
          <li className="chat-message chat-message--assistant">
            <p>{step.line}</p>
          </li>
        </ul>
      </div>

      <div className="written-reply__body">
        {status === "composing" ? (
          <div className="written-reply__composer">
            <p className="written-reply__prompt">{writtenReplyPrompt(step.movePractised)}</p>
            <label htmlFor="written-reply-draft">Your reply</label>
            <input
              id="written-reply-draft"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
            />
          </div>
        ) : (
          <ul className="chat-screen__messages written-reply__sent">
            <li className="chat-message chat-message--user">
              <p>{draft}</p>
            </li>
            {status === "sending" && (
              <li className="written-reply__waiting" role="status" aria-label="Waiting for a response">
                <span className="typing-indicator" aria-hidden="true">
                  <span className="typing-indicator__dot" />
                  <span className="typing-indicator__dot" />
                  <span className="typing-indicator__dot" />
                </span>
              </li>
            )}
          </ul>
        )}

        {status === "verdict" && answer?.verdict && (
          <div className={`check-result check-result--${answer.verdict === "landed" ? "right" : "not-quite"}`}>
            <div className="check-result__clip">
              <div className="check-result__block" role="status">
                <p className="check-result__verdict">{VERDICT_PHRASES[answer.verdict]}</p>
                <p>{answer.reason}</p>
              </div>
            </div>
          </div>
        )}

        {status === "fallback" && (
          <div className="check-result check-result--fallback">
            <div className="check-result__clip">
              <div className="check-result__block" role="alert">
                <p>{answer?.fallbackMessage}</p>
                <p>{step.exampleReply}</p>
                <button type="button" className="written-reply__retry" onClick={onRetry}>
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
