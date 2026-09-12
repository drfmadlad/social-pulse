import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { HistoryEntryDetail } from "./HistoryEntryDetail";
import { getAllHistoryEntries, type HistoryEntry } from "./historyStore";

type Status = { kind: "loading" } | { kind: "found"; entry: HistoryEntry } | { kind: "not-found" };

export function HistoryEntryDetailScreen() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const entries = await getAllHistoryEntries();
      if (cancelled) return;
      const entry = entries.find((candidate) => candidate.id === entryId);
      setStatus(entry ? { kind: "found", entry } : { kind: "not-found" });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  if (status.kind === "loading") {
    return null;
  }

  if (status.kind === "not-found") {
    return <Navigate to="/history" replace />;
  }

  return (
    <div className="home-section">
      <HistoryEntryDetail entry={status.entry} onBack={() => navigate("/history")} />
    </div>
  );
}
