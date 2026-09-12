import { useEffect, useState } from "react";
import { useLatestRequestGuard } from "../practice/useLatestRequestGuard";
import { getAllHistoryEntries, subscribeToHistoryChanges, type HistoryEntry } from "./historyStore";

/** Fetches all History entries and keeps them live as new ones are saved elsewhere on the page. */
export function useHistoryEntries(): HistoryEntry[] {
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

  return entries;
}
