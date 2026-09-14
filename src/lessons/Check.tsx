import { useId, type AnimationEvent } from "react";
import type { CheckStep } from "./lessons";

export interface CheckAnswer {
  selectedOptionId: string;
  committed: boolean;
}

interface CheckProps {
  step: CheckStep;
  answer: CheckAnswer | undefined;
  onSelect: (optionId: string) => void;
}

/** Once the result has unfolded, scroll just enough that it isn't left below the fold on a short screen. */
function bringResultIntoView(event: AnimationEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget) return;
  event.currentTarget.scrollIntoView({ block: "nearest" });
}

/** The chosen option stays filled; after committing, the better option is edged and the rest recede. */
function optionModifier(option: { isSelected: boolean; isBetterOption: boolean; committed: boolean }) {
  if (option.isSelected) return "selected";
  if (option.isBetterOption) return "better";
  if (option.committed) return "receded";
  return null;
}

export function Check({ step, answer, onSelect }: CheckProps) {
  const groupName = useId();
  const committed = answer?.committed ?? false;
  const pickedRight = answer?.selectedOptionId === step.correctOptionId;

  return (
    <fieldset className="check" disabled={committed}>
      <legend className="check__prompt">
        <h2>{step.prompt}</h2>
      </legend>
      <div className="check__options">
        {step.options.map((option) => {
          const isSelected = option.id === answer?.selectedOptionId;
          const isBetterOption = committed && !pickedRight && option.id === step.correctOptionId;
          const betterOptionNoteId = `${groupName}-${option.id}-better`;
          const modifier = optionModifier({ isSelected, isBetterOption, committed });
          return (
            <div key={option.id} className="check__option-item">
              <label className={modifier ? `check-option check-option--${modifier}` : "check-option"}>
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={isSelected}
                  aria-describedby={isBetterOption ? betterOptionNoteId : undefined}
                  onChange={() => onSelect(option.id)}
                />
                <span>{option.text}</span>
              </label>
              {isBetterOption && (
                <span id={betterOptionNoteId} className="visually-hidden">
                  Better option
                </span>
              )}
              {/* Rendered while selected so the live region exists before the result is added to it. */}
              {isSelected && (
                <div role="status">
                  {committed && (
                    <div
                      className={`check-result check-result--${pickedRight ? "right" : "not-quite"}`}
                      onAnimationEnd={bringResultIntoView}
                    >
                      <div className="check-result__clip">
                        <div className="check-result__block">
                          <p className="check-result__verdict">{pickedRight ? "That's it." : "Not quite."}</p>
                          <p>{step.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
