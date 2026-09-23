import { useState } from "react";
import { SavedFeedbackSummary } from "../practice/SavedFeedbackSummary";
import { scenarioCategories } from "../practice/scenarioCategories";
import { TranscriptView } from "../practice/TranscriptView";
import { DeleteHistoryEntryDialog } from "./DeleteHistoryEntryDialog";
import { formatEntryTimestamp } from "./formatEntryTimestamp";
import type { HistoryEntry } from "./historyStore";

interface HistoryEntryDetailProps {
  entry: HistoryEntry;
  /** True after a delete attempt failed, so the entry is known to still be saved. */
  deleteFailed: boolean;
  onBack: () => void;
  onDelete: () => void;
}

export function HistoryEntryDetail({ entry, deleteFailed, onBack, onDelete }: HistoryEntryDetailProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className="history-entry-detail">
      <button type="button" className="back-button" onClick={onBack}>
        ← Back to History
      </button>
      <h1 className="screen-title">
        {entry.categoryName} with {entry.personaName}
      </h1>
      <p className="history-entry-detail__meta">
        <time dateTime={entry.endedAt}>{formatEntryTimestamp(entry.endedAt)}</time>
      </p>
      <TranscriptView transcript={entry.transcript} personaName={entry.personaName} />
      <SavedFeedbackSummary
        entryId={entry.id}
        category={scenarioCategories.find((category) => category.id === entry.categoryId)}
        transcript={entry.transcript}
        savedSummary={entry.summary}
      />
      {deleteFailed && (
        <div role="alert" className="chat-screen__error history-entry-detail__delete-error">
          <p>Couldn&apos;t delete this conversation. It&apos;s still in History.</p>
        </div>
      )}
      <button
        type="button"
        className="history-entry-detail__delete-button"
        onClick={() => setIsConfirmingDelete(true)}
      >
        Delete
      </button>
      {isConfirmingDelete && (
        <DeleteHistoryEntryDialog
          onCancel={() => setIsConfirmingDelete(false)}
          onDelete={() => {
            setIsConfirmingDelete(false);
            onDelete();
          }}
        />
      )}
    </div>
  );
}
