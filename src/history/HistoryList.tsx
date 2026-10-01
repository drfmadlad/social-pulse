import { Link } from "react-router-dom";
import { OWN_CATEGORY_ID } from "../practice/ownScenarios";
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
            {/* An Own Scenario belongs to no category, so its entry is listed by who it was with. */}
            <span className="history-list__category">
              {entry.categoryId === OWN_CATEGORY_ID ? `${entry.categoryName}: ${entry.personaName}` : entry.categoryName}
            </span>
            <time dateTime={entry.endedAt}>{formatEntryTimestamp(entry.endedAt)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
