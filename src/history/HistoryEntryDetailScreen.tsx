import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { HistoryEntryDetail } from "./HistoryEntryDetail";
import { deleteHistoryEntry, getAllHistoryEntries, type HistoryEntry } from "./historyStore";

type Status = { kind: "loading" } | { kind: "found"; entry: HistoryEntry } | { kind: "not-found" };

export function HistoryEntryDetailScreen() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [deleteFailed, setDeleteFailed] = useState(false);
  const isDeletingRef = useRef(false);

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

  const { entry } = status;

  async function handleDelete() {
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setDeleteFailed(false);
    try {
      await deleteHistoryEntry(entry.id);
    } catch (error) {
      console.error("Failed to delete the History entry", error);
      isDeletingRef.current = false;
      setDeleteFailed(true);
      return;
    }
    // Replaced, not pushed, so system back from the list doesn't land on the deleted entry's URL.
    navigate("/history", { replace: true });
  }

  return (
    <div className="home-section">
      <HistoryEntryDetail
        entry={entry}
        deleteFailed={deleteFailed}
        onBack={() => navigate("/history")}
        onDelete={() => void handleDelete()}
      />
    </div>
  );
}
