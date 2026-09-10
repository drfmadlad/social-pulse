import { useState } from "react";
import { ChatScreen } from "../practice/ChatScreen";
import type { ChatMessage } from "../practice/aiProxyClient";
import { scenarioCategories, type ScenarioCategory } from "../practice/scenarioCategories";

type PracticeView =
  | { kind: "categories" }
  | { kind: "chat"; category: ScenarioCategory }
  | { kind: "ended"; category: ScenarioCategory; transcript: ChatMessage[] };

export function PracticeSection() {
  const [view, setView] = useState<PracticeView>({ kind: "categories" });

  return (
    <section aria-labelledby="practice-heading" className="home-section">
      <h2 id="practice-heading">Practice</h2>
      {view.kind === "categories" && (
        <ul className="scenario-list">
          {scenarioCategories.map((category) => (
            <li key={category.id}>
              <button type="button" onClick={() => setView({ kind: "chat", category })}>
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {view.kind === "chat" && (
        <ChatScreen
          category={view.category}
          onBack={() => setView({ kind: "categories" })}
          onEnd={(transcript) => setView({ kind: "ended", category: view.category, transcript })}
        />
      )}
      {view.kind === "ended" && (
        <div className="practice-ended" role="status">
          <p>
            Conversation with {view.category.personaName} ended — {view.transcript.length} messages captured.
          </p>
          <p className="practice-ended__note">Feedback is coming in a future update.</p>
          <button type="button" onClick={() => setView({ kind: "categories" })}>
            Back to categories
          </button>
        </div>
      )}
    </section>
  );
}
