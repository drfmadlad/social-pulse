import { useState } from "react";
import { findFocus } from "../practice/focuses";
import { FocusLine } from "../practice/FocusLine";
import { SavedFeedbackSummary } from "../practice/SavedFeedbackSummary";
import { categoryOfEntry } from "../practice/ownScenarios";
import { TranscriptView } from "../practice/TranscriptView";
import { TryAgainButton } from "../practice/TryAgainButton";
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
  // Nothing for an entry without a Focus, including one saved before Focuses existed or naming one since removed.
  const focus = findFocus(entry.focusId);

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
      {focus && <FocusLine focus={focus} />}
      <TranscriptView transcript={entry.transcript} personaName={entry.personaName} />
      <SavedFeedbackSummary
        entryId={entry.id}
        category={categoryOfEntry(entry)}
        focus={focus}
        transcript={entry.transcript}
        savedSummary={entry.summary}
      />
      {/* Pushed, so back from the new conversation returns to this entry. */}
      <TryAgainButton conversation={entry} />
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
