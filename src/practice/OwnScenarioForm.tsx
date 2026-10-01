import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MAX_OWN_ABOUT_LENGTH, MAX_OWN_NAME_LENGTH, MAX_OWN_SCENARIO_LENGTH } from "../requestLimits";
import {
  findOwnScenarioProblems,
  ownScenarioCharactersLeft,
  type OwnScenarioProblems,
  type OwnScenarioText,
} from "./ownScenarios";

interface OwnScenarioFormProps {
  /** The text being edited. Absent when writing a new one. */
  initial?: OwnScenarioText;
  /** Focus the first field as the form opens: it was asked for, so the keyboard should follow. */
  autoFocus?: boolean;
  /** Saves the text. A rejection is shown as a note and leaves the form as it was. */
  onSave: (text: OwnScenarioText) => Promise<void>;
  /** Absent when there's nothing to go back to (the first one is being written). */
  onCancel?: () => void;
}

const EMPTY: OwnScenarioText = { name: "", about: "", situation: "" };

/**
 * Writes or edits one Own Scenario (INFORMATION-ARCHITECTURE.md, Scenario brief): who the user will
 * be talking to (a name and one line about them) and the situation, about 500 characters in all.
 * The inputs hold the user to the same limits the server enforces, so what's saved can always be
 * sent: the name and the line stop at their own caps, and the situation at what the other two
 * leave. A missing name or situation is only said once Save is tried, never while typing; the cap can
 * only be passed by lengthening the name or the line after the situation is written, and says so then.
 */
export function OwnScenarioForm({ initial = EMPTY, autoFocus = false, onSave, onCancel }: OwnScenarioFormProps) {
  const [draft, setDraft] = useState<OwnScenarioText>(initial);
  const [problems, setProblems] = useState<OwnScenarioProblems>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const aboutId = useId();
  const aboutHintId = useId();
  const situationId = useId();
  const countId = useId();
  const nameProblemId = useId();
  const situationProblemId = useId();

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  const charactersLeft = ownScenarioCharactersLeft(draft);
  const situationRoom = Math.max(0, MAX_OWN_SCENARIO_LENGTH - draft.name.length - draft.about.length);
  const totalProblem = problems.total ?? (charactersLeft < 0 ? findOwnScenarioProblems(draft).total : undefined);

  function update(field: keyof OwnScenarioText, value: string) {
    setDraft({ ...draft, [field]: value });
    setProblems({});
    setSaveFailed(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    const found = findOwnScenarioProblems(draft);
    if (found.name || found.situation || found.total) {
      setProblems(found);
      return;
    }
    setIsSaving(true);
    setSaveFailed(false);
    try {
      await onSave(draft);
    } catch (error) {
      console.error("Failed to save the Own Scenario", error);
      setSaveFailed(true);
      setIsSaving(false);
    }
  }

  return (
    <form className="own-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="own-form__field">
        <label htmlFor={nameId}>Who you&apos;ll be talking to</label>
        <input
          id={nameId}
          ref={nameRef}
          value={draft.name}
          maxLength={MAX_OWN_NAME_LENGTH}
          aria-invalid={problems.name ? true : undefined}
          aria-describedby={problems.name ? nameProblemId : undefined}
          onChange={(event) => update("name", event.target.value)}
        />
        {problems.name && (
          <p id={nameProblemId} className="own-form__problem">
            {problems.name}
          </p>
        )}
      </div>

      <div className="own-form__field">
        <label htmlFor={aboutId}>A line about them</label>
        <p id={aboutHintId} className="own-form__hint">
          Optional. Like &ldquo;my manager of two years&rdquo;.
        </p>
        <input
          id={aboutId}
          value={draft.about}
          maxLength={MAX_OWN_ABOUT_LENGTH}
          aria-describedby={aboutHintId}
          onChange={(event) => update("about", event.target.value)}
        />
      </div>

      <div className="own-form__field">
        <label htmlFor={situationId}>The situation</label>
        <textarea
          id={situationId}
          rows={5}
          value={draft.situation}
          maxLength={situationRoom}
          aria-invalid={problems.situation ? true : undefined}
          aria-describedby={[countId, problems.situation ? situationProblemId : undefined].filter(Boolean).join(" ")}
          onChange={(event) => update("situation", event.target.value)}
        />
        {problems.situation && (
          <p id={situationProblemId} className="own-form__problem">
            {problems.situation}
          </p>
        )}
        <p id={countId} className="own-form__hint">
          {charactersLeft >= 0 ? `${charactersLeft} of ${MAX_OWN_SCENARIO_LENGTH} characters left.` : "Over the limit."}
        </p>
        {totalProblem && (
          <p role="alert" className="own-form__problem">
            {totalProblem}
          </p>
        )}
      </div>

      {saveFailed && (
        <p role="alert" className="own-form__problem">
          Couldn&apos;t save that. Try again.
        </p>
      )}

      <div className="own-form__actions">
        <button type="submit" className="button-primary" disabled={isSaving}>
          Save
        </button>
        {onCancel && (
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
