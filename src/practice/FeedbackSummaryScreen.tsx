import { useEffect, useState } from "react";
import { saveEndedConversation } from "../history/historyStore";
import { HistorySaveNotice } from "../history/HistorySaveNotice";
import type { ChatMessage } from "./aiProxyClient";
import type { FeedbackSummary } from "./feedbackSummary";
import type { ScenarioCategory } from "./scenarioCategories";
import { SavedFeedbackSummary } from "./SavedFeedbackSummary";

interface FeedbackSummaryScreenProps {
  category: ScenarioCategory;
  /** Minted when the conversation ended, so coming back to this screen finds the same History entry. */
  entryId: string;
  transcript: ChatMessage[];
  onDone: () => void;
}

export function FeedbackSummaryScreen({ category, entryId, transcript, onDone }: FeedbackSummaryScreenProps) {
  // Undefined while the conversation saves, then whatever summary the saved entry holds: null for a
  // conversation that just ended, or the one already attached when this screen is revisited.
  const [saved, setSaved] = useState<{ summary: FeedbackSummary | null; saveFailed: boolean }>();

  useEffect(() => {
    let cancelled = false;
    async function save() {
      let summary: FeedbackSummary | null = null;
      let saveFailed = false;
      try {
        summary = (await saveEndedConversation({ id: entryId, category, transcript })).summary;
      } catch (error) {
        // Still worth showing the feedback even if History can't hold it.
        console.error("Failed to save Practice Conversation to History", error);
        saveFailed = true;
      }
      if (!cancelled) setSaved({ summary, saveFailed });
    }
    void save();
    return () => {
      cancelled = true;
    };
  }, [entryId, category, transcript]);

  return (
    <div className="feedback-summary">
      <button type="button" className="back-button" onClick={onDone}>
        Done
      </button>
      <h3>Feedback on your conversation with {category.personaName}</h3>
      {saved?.saveFailed && (
        <HistorySaveNotice>
          This conversation couldn't be saved, so it won't show up in History.
        </HistorySaveNotice>
      )}
      {saved ? (
        <SavedFeedbackSummary
          entryId={entryId}
          category={category}
          transcript={transcript}
          savedSummary={saved.summary}
          generateOnMount
        />
      ) : (
        <p role="status">Generating your feedback…</p>
      )}
    </div>
  );
}
