import { formatEntryTimestamp } from "./formatEntryTimestamp";
import type { HistoryEntry } from "./historyStore";

interface HistoryListProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
}

export function HistoryList({ entries, onSelect }: HistoryListProps) {
  return (
    <ul className="history-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button type="button" onClick={() => onSelect(entry)}>
            <span className="history-list__category">{entry.categoryName}</span>
            <time dateTime={entry.endedAt}>{formatEntryTimestamp(entry.endedAt)}</time>
          </button>
        </li>
      ))}
    </ul>
  );
}
