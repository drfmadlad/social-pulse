import { useEffect, useState } from "react";
import { HomeLink } from "../HomeLink";
import { useLatestRequestGuard } from "../practice/useLatestRequestGuard";
import { HistoryList } from "./HistoryList";
import { getAllHistoryEntries, subscribeToHistoryChanges, type HistoryEntry } from "./historyStore";

export function HistoryListScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const { start, isStale } = useLatestRequestGuard();

  useEffect(() => {
    async function refresh() {
      const requestId = start();
      const latest = await getAllHistoryEntries();
      if (isStale(requestId)) return;
      setEntries(latest);
    }
    void refresh();
    return subscribeToHistoryChanges(() => void refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section aria-labelledby="history-heading" className="home-section">
      <HomeLink />
      <h2 id="history-heading">History</h2>
      {entries.length === 0 ? (
        <p className="home-section__placeholder">Past Practice Conversations will appear here soon.</p>
      ) : (
        <HistoryList entries={entries} />
      )}
    </section>
  );
}
