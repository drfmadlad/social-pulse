interface HistorySaveNoticeProps {
  children: string;
}

/**
 * A visible, calm note that something didn't save to History: a conversation that never made it
 * there, or a Feedback Summary that generated but didn't attach. Neutral --ink/--surface/--line,
 * because DESIGN.md reserves --positive/--growth for feedback verdicts on this same screen. No
 * retry action: neither failure is something a tap can fix.
 */
export function HistorySaveNotice({ children }: HistorySaveNoticeProps) {
  return (
    <p role="status" className="history-save-notice">
      {children}
    </p>
  );
}
