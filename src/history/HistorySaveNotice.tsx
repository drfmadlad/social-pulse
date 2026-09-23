interface HistorySaveNoticeProps {
  children: string;
}

/**
 * A visible, calm note that something didn't save to History — used both for a conversation that
 * never made it there and for a Feedback Summary that generated but didn't attach. Neutral
 * styling: DESIGN.md reserves --positive/--growth for feedback verdicts on this same screen, so
 * this borrows the inline-error treatment instead, without the alert role or a retry action,
 * since neither failure is something a tap can fix.
 */
export function HistorySaveNotice({ children }: HistorySaveNoticeProps) {
  return (
    <p role="status" className="history-save-notice">
      {children}
    </p>
  );
}
