import type { Focus } from "./focuses";

/**
 * Names a conversation's Focus at the top of its Feedback Summary and on its History entry. Only
 * names it: whether it was achieved is never said (INFORMATION-ARCHITECTURE.md §5), so the line is
 * neutral, with no outcome colour.
 */
export function FocusLine({ focus }: { focus: Focus }) {
  return (
    <p className="focus-line">
      Your focus: <span className="focus-line__name">{focus.label}</span>
    </p>
  );
}
