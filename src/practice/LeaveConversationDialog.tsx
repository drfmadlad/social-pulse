import { useEffect, useRef, type KeyboardEvent } from "react";

interface LeaveConversationDialogProps {
  onCancel: () => void;
  onLeave: () => void;
}

/**
 * The in-app design's replacement for `window.confirm` (issue #33): a Practice Conversation is
 * the one place leaving loses something that can't be redone, so it gets its own dialog rather
 * than the browser's native one. `ChatScreen` opens this from both the on-screen back button and
 * the system back gesture, through the one `useBlocker` call, so there's only one place this asks.
 */
export function LeaveConversationDialog({ onCancel, onLeave }: LeaveConversationDialogProps) {
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
      <div className="leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-dialog-message">
        <p id="leave-dialog-message" className="leave-dialog__message">
          Leave this conversation? It won&apos;t be saved.
        </p>
        <div className="leave-dialog__actions">
          <button type="button" ref={cancelButtonRef} className="leave-dialog__cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="button-primary" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
