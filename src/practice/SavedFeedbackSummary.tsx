import { useEffect, useState } from "react";
import { attachFeedbackSummary } from "../history/historyStore";
import { HistorySaveNotice } from "../history/HistorySaveNotice";
import { AiProxyError, type ChatMessage } from "./aiProxyClient";
import { FeedbackSummaryView } from "./FeedbackSummaryView";
import { requestFeedbackSummary, type FeedbackSummary } from "./feedbackSummary";
import type { ScenarioCategory } from "./scenarioCategories";
import { useLatestRequestGuard } from "./useLatestRequestGuard";

type Status =
  | { kind: "missing" }
  | { kind: "loading" }
  | { kind: "ready"; summary: FeedbackSummary; attachFailed: boolean }
  | { kind: "error"; message: string };

interface SavedFeedbackSummaryProps {
  entryId: string;
  /** Undefined if the entry's Scenario Category no longer exists, leaving nothing to ask the AI with. */
  category: ScenarioCategory | undefined;
  transcript: ChatMessage[];
  savedSummary: FeedbackSummary | null;
  /** Asks for a missing summary straight away (the Feedback screen) rather than waiting for a tap (History). */
  generateOnMount?: boolean;
}

/**
 * The Feedback Summary of a conversation already saved to History: shown if it's there, and
 * otherwise generated and attached to the entry, so it's there next time.
 */
export function SavedFeedbackSummary({
  entryId,
  category,
  transcript,
  savedSummary,
  generateOnMount = false,
}: SavedFeedbackSummaryProps) {
  const [status, setStatus] = useState<Status>(() => {
    if (savedSummary) return { kind: "ready", summary: savedSummary, attachFailed: false };
    return generateOnMount && category ? { kind: "loading" } : { kind: "missing" };
  });
  const { start, isStale } = useLatestRequestGuard();

  async function generate() {
    if (!category) return;
    const requestId = start();
    setStatus({ kind: "loading" });
    try {
      const summary = await requestFeedbackSummary(category, transcript);
      // Only a newer request supersedes this one. Leaving the screen doesn't, so a user who taps
      // Done while waiting still finds the summary on their History entry later.
      if (isStale(requestId)) return;
      let attachFailed = false;
      try {
        await attachFeedbackSummary(entryId, summary);
      } catch (error) {
        console.error("Failed to save the Feedback Summary to History", error);
        attachFailed = true;
      }
      setStatus({ kind: "ready", summary, attachFailed });
    } catch (error) {
      if (isStale(requestId)) return;
      setStatus({
        kind: "error",
        message: error instanceof AiProxyError ? error.message : "Something went wrong. Please try again.",
      });
    }
  }

  useEffect(() => {
    if (generateOnMount && !savedSummary) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  switch (status.kind) {
    case "missing":
      return (
        <div className="saved-feedback__missing">
          <p>Feedback didn't come through for this one.</p>
          {category && (
            <button type="button" className="button-primary" onClick={() => void generate()}>
              Get feedback
            </button>
          )}
        </div>
      );
    case "loading":
      return <p role="status">Generating your feedback…</p>;
    case "error":
      return (
        <div role="alert" className="chat-screen__error">
          <p>{status.message}</p>
          <button type="button" className="button-primary" onClick={() => void generate()}>
            Try again
          </button>
        </div>
      );
    case "ready":
      return (
        <>
          {status.attachFailed && (
            <HistorySaveNotice>
              This feedback couldn't be saved, so it won't be here if you come back to this conversation later. The conversation itself is still in History.
            </HistorySaveNotice>
          )}
          <FeedbackSummaryView summary={status.summary} />
        </>
      );
  }
}
