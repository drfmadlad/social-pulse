import { useEffect, useRef, type KeyboardEvent } from "react";

interface DeleteOwnScenarioDialogProps {
  /** Who it's with, so the question names what's being deleted. */
  name: string;
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * Confirms before removing an Own Scenario for good (issue #67). The same `leave-dialog` shape as
 * `DeleteHistoryEntryDialog`, for the same kind of moment: an unrecoverable action. It says that
 * conversations already had in it stay in History.
 */
export function DeleteOwnScenarioDialog({ name, onCancel, onDelete }: DeleteOwnScenarioDialogProps) {
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
      <div className="leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-own-scenario-message">
        <p id="delete-own-scenario-message" className="leave-dialog__message">
          Delete your situation with {name}? It can&apos;t be recovered. Conversations you&apos;ve already had in it
          stay in History.
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
