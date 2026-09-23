import { useEffect, useRef, type KeyboardEvent } from "react";

interface DeleteHistoryEntryDialogProps {
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * Confirms before removing a History entry for good (issue #37). Reuses the `leave-dialog` visual
 * language `LeaveConversationDialog` (issue #33) established as this app's in-app replacement for
 * `window.confirm` — the same shape for the same kind of moment, an unrecoverable action.
 */
export function DeleteHistoryEntryDialog({ onCancel, onDelete }: DeleteHistoryEntryDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onCancel();
    }
  }

  return (
    <div className="leave-dialog__scrim" onKeyDown={handleKeyDown}>
      <div className="leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-message">
        <p id="delete-dialog-message" className="leave-dialog__message">
          Delete this conversation? It can&apos;t be recovered.
        </p>
        <div className="leave-dialog__actions">
          <button type="button" ref={cancelButtonRef} className="leave-dialog__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="button-primary" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
