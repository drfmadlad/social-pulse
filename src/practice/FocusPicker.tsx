import { useId } from "react";
import { focuses, type Focus } from "./focuses";

/** The Focus picker's options: None (the default, no Focus), then the fixed list. */
const focusOptions: { key: string; label: string; focus: Focus | undefined }[] = [
  { key: "none", label: "None", focus: undefined },
  ...focuses.map((focus) => ({ key: focus.id, label: focus.label, focus })),
];

interface FocusPickerProps {
  focus: Focus | undefined;
  onChange: (focus: Focus | undefined) => void;
}

/**
 * The optional Focus on a Scenario brief (INFORMATION-ARCHITECTURE.md, Scenario brief), shared by a
 * category's brief and the Own Scenario brief: a short list of aims plus None, the default.
 */
export function FocusPicker({ focus, onChange }: FocusPickerProps) {
  const focusName = useId();
  const focusHintId = useId();

  return (
    <fieldset className="scenario-brief__chooser" aria-describedby={focusHintId}>
      <legend>Focus</legend>
      <p id={focusHintId} className="scenario-brief__hint">
        Optional. Pick something to practise, and your feedback will speak to it.
      </p>
      <div className="scenario-brief__focus-options">
        {focusOptions.map((option) => (
          <label
            key={option.key}
            className={option.focus === focus ? "check-option check-option--selected" : "check-option"}
          >
            <input
              type="radio"
              name={focusName}
              value={option.key}
              checked={option.focus === focus}
              onChange={() => onChange(option.focus)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
