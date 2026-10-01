import { useId, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import type { Focus } from "./focuses";
import { FocusPicker } from "./FocusPicker";
import { conversationPath } from "./practicePaths";
import { findCategory } from "./scenarioCategories";
import { findScenario, pickSurpriseScenario, scenariosIn } from "./scenarios";

/** What the chooser holds: Surprise me (the default, which picks only when Start is tapped), or one Scenario. */
type ScenarioChoice = { kind: "surprise" } | { kind: "chosen"; scenarioId: string };

const SURPRISE_ME: ScenarioChoice = { kind: "surprise" };

/**
 * Sets up one Practice Conversation before it starts (INFORMATION-ARCHITECTURE.md, Scenario brief):
 * the Persona and what they're like, a Scenario chooser defaulting to Surprise me, the chosen
 * Scenario's situation and the user's role in it, an optional Focus defaulting to none, and Start.
 */
export function ScenarioBriefScreen() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const chooserName = useId();
  const [choice, setChoice] = useState<ScenarioChoice>(SURPRISE_ME);
  const [focus, setFocus] = useState<Focus | undefined>(undefined);
  const category = findCategory(categoryId);

  if (!category) {
    return <Navigate to="/practice" replace />;
  }

  const chosen = choice.kind === "chosen" ? findScenario(category.id, choice.scenarioId) : undefined;
  const options: { key: string; label: string; choice: ScenarioChoice; checked: boolean }[] = [
    { key: "surprise", label: "Surprise me", choice: SURPRISE_ME, checked: choice.kind === "surprise" },
    ...scenariosIn(category.id).map((scenario) => ({
      key: scenario.id,
      label: scenario.title,
      choice: { kind: "chosen", scenarioId: scenario.id } as const,
      checked: scenario === chosen,
    })),
  ];

  function start() {
    // Every category has at least one Scenario (scenarios.test.ts), so Surprise me always finds one.
    const scenario = chosen ?? pickSurpriseScenario(category!.id)!;
    // Replaced, not pushed: once the conversation starts, back from it leads to the Practice picker
    // (INFORMATION-ARCHITECTURE.md, Conversation), the system back gesture included.
    navigate(conversationPath(category!.id, scenario.id, focus?.id), { replace: true });
  }

  return (
    <section aria-labelledby="scenario-brief-heading" className="home-section scenario-brief">
      <Link className="back-button" to="/practice">
        ← Practice
      </Link>
      <p className="scenario-brief__label scenario-brief__category">{category.name}</p>
      <h1 id="scenario-brief-heading" className="screen-title">
        {category.personaName}
      </h1>
      <p className="scenario-brief__persona">{category.personaDescription}</p>

      <fieldset className="scenario-brief__chooser">
        <legend>Situation</legend>
        <div className="scenario-brief__options">
          {options.map((option) => (
            <label key={option.key} className={option.checked ? "check-option check-option--selected" : "check-option"}>
              <input
                type="radio"
                name={chooserName}
                value={option.key}
                checked={option.checked}
                onChange={() => setChoice(option.choice)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="scenario-brief__situation">
        {chosen ? (
          <dl>
            <dt className="scenario-brief__label">The situation</dt>
            <dd>{chosen.situation}</dd>
            <dt className="scenario-brief__label">Your role</dt>
            <dd>{chosen.role}</dd>
          </dl>
        ) : (
          <p>
            One of {category.personaName}&apos;s situations, picked when you start. You&apos;ll see it at the top
            of the conversation.
          </p>
        )}
      </div>

      <FocusPicker focus={focus} onChange={setFocus} />

      <button type="button" className="button-primary scenario-brief__start" onClick={start}>
        Start
      </button>
    </section>
  );
}
