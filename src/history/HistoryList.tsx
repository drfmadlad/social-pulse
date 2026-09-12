import { Link } from "react-router-dom";
import { formatEntryTimestamp } from "./formatEntryTimestamp";
import type { HistoryEntry } from "./historyStore";

interface HistoryListProps {
  entries: HistoryEntry[];
}

export function HistoryList({ entries }: HistoryListProps) {
  return (
    <ul className="history-list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link to={`/history/${entry.id}`}>
            <span className="history-list__category">{entry.categoryName}</span>
            <time dateTime={entry.endedAt}>{formatEntryTimestamp(entry.endedAt)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
