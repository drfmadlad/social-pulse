import { useEffect, useState } from "react";
import { HistoryEntryDetail } from "../history/HistoryEntryDetail";
import { HistoryList } from "../history/HistoryList";
import { getAllHistoryEntries, subscribeToHistoryChanges, type HistoryEntry } from "../history/historyStore";
import { useLatestRequestGuard } from "../practice/useLatestRequestGuard";

type HistoryView = { kind: "list" } | { kind: "detail"; entry: HistoryEntry };

export function HistorySection() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [view, setView] = useState<HistoryView>({ kind: "list" });
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
      <h2 id="history-heading">History</h2>
      {view.kind === "list" &&
        (entries.length === 0 ? (
          <p className="home-section__placeholder">Past Practice Conversations will appear here soon.</p>
        ) : (
          <HistoryList entries={entries} onSelect={(entry) => setView({ kind: "detail", entry })} />
        ))}
      {view.kind === "detail" && <HistoryEntryDetail entry={view.entry} onBack={() => setView({ kind: "list" })} />}
    </section>
  );
}
