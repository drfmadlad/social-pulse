import { FeedbackSummaryView } from "../practice/FeedbackSummaryView";
import { TranscriptView } from "../practice/TranscriptView";
import { formatEntryTimestamp } from "./formatEntryTimestamp";
import type { HistoryEntry } from "./historyStore";

interface HistoryEntryDetailProps {
  entry: HistoryEntry;
  onBack: () => void;
}

export function HistoryEntryDetail({ entry, onBack }: HistoryEntryDetailProps) {
  return (
    <div className="history-entry-detail">
      <button type="button" className="back-button" onClick={onBack}>
        ← Back to History
      </button>
      <h3>
        {entry.categoryName} with {entry.personaName}
      </h3>
      <p className="history-entry-detail__meta">
        <time dateTime={entry.endedAt}>{formatEntryTimestamp(entry.endedAt)}</time>
      </p>
      <TranscriptView transcript={entry.transcript} personaName={entry.personaName} />
      <FeedbackSummaryView summary={entry.summary} />
    </div>
  );
}
