import { useEffect, useState } from "react";
import { saveHistoryEntry } from "../history/historyStore";
import { AiProxyError, type ChatMessage } from "./aiProxyClient";
import { FeedbackSummaryView } from "./FeedbackSummaryView";
import { requestFeedbackSummary, type FeedbackSummary } from "./feedbackSummary";
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

export function FeedbackSummaryScreen({ category, transcript, onBack }: FeedbackSummaryScreenProps) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const { start, isStale } = useLatestRequestGuard();

  async function generate() {
    const requestId = start();
    setStatus({ kind: "loading" });
    try {
      const summary = await requestFeedbackSummary(category, transcript);
      if (isStale(requestId)) return;
      try {
        await saveHistoryEntry({ category, transcript, summary });
      } catch (error) {
        console.error("Failed to save Practice Conversation to History", error);
      }
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
      <button type="button" className="back-button" onClick={onBack}>
        ← Back to categories
      </button>
      <h3>Feedback on your conversation with {category.personaName}</h3>
      {status.kind === "loading" && <p role="status">Generating your feedback…</p>}
      {status.kind === "error" && (
        <div role="alert" className="chat-screen__error">
          <p>{status.message}</p>
          <button type="button" className="button-primary" onClick={() => void generate()}>
            Try again
          </button>
        </div>
      )}
      {status.kind === "ready" && <FeedbackSummaryView summary={status.summary} />}
    </div>
  );
}
