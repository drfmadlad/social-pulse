import { HomeLink } from "../HomeLink";
import { HistoryList } from "./HistoryList";
import { useHistoryEntries } from "./useHistoryEntries";

export function HistoryListScreen() {
  const entries = useHistoryEntries();

  return (
    <section aria-labelledby="history-heading" className="home-section">
      <HomeLink />
      <h1 id="history-heading" className="home-section__heading">
        History
      </h1>
      {entries.length === 0 ? (
        <p className="home-section__placeholder">Your finished conversations will show up here.</p>
      ) : (
        <HistoryList entries={entries} />
      )}
    </section>
  );
}
