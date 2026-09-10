import { useEffect, useState } from "react";
import { AiProxyError, type ChatMessage } from "./aiProxyClient";
import { requestFeedbackSummary, type FeedbackPoint, type FeedbackSummary } from "./feedbackSummary";
import type { ScenarioCategory } from "./scenarioCategories";
import { useLatestRequestGuard } from "./useLatestRequestGuard";

interface FeedbackSummaryScreenProps {
  category: ScenarioCategory;
  transcript: ChatMessage[];
  onBack: () => void;
}

type Status =
  | { kind: "loading" }
  | { kind: "ready"; summary: FeedbackSummary }
  | { kind: "error"; message: string };

function FeedbackPointList({ points }: { points: FeedbackPoint[] }) {
  return (
    <ul>
      {points.map((point, index) => (
        <li key={index}>
          <blockquote>&ldquo;{point.quote}&rdquo;</blockquote>
          {point.explanation && <p>{point.explanation}</p>}
        </li>
      ))}
    </ul>
  );
}

export function FeedbackSummaryScreen({ category, transcript, onBack }: FeedbackSummaryScreenProps) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const { start, isStale } = useLatestRequestGuard();

  async function generate() {
    const requestId = start();
    setStatus({ kind: "loading" });
    try {
      const summary = await requestFeedbackSummary(category, transcript);
      if (isStale(requestId)) return;
      setStatus({ kind: "ready", summary });
    } catch (error) {
      if (isStale(requestId)) return;
      setStatus({
        kind: "error",
        message: error instanceof AiProxyError ? error.message : "Something went wrong. Please try again.",
      });
    }
  }

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id, transcript]);

  return (
    <div className="feedback-summary">
      <button type="button" className="chat-screen__back" onClick={onBack}>
        ← Back to categories
      </button>
      <h3>Feedback on your conversation with {category.personaName}</h3>
      {status.kind === "loading" && <p role="status">Generating your feedback…</p>}
      {status.kind === "error" && (
        <div role="alert" className="chat-screen__error">
          <p>{status.message}</p>
          <button type="button" onClick={() => void generate()}>
            Try again
          </button>
        </div>
      )}
      {status.kind === "ready" && (
        <>
          <section aria-labelledby="feedback-did-well">
            <h4 id="feedback-did-well">What you did well</h4>
            <FeedbackPointList points={status.summary.didWell} />
          </section>
          <section aria-labelledby="feedback-can-improve">
            <h4 id="feedback-can-improve">What you can do better</h4>
            <FeedbackPointList points={status.summary.canImprove} />
          </section>
        </>
      )}
    </div>
  );
}
