import { ChoiceAnswer, type ChoiceAnswerState } from "./ChoiceAnswer";
import type { CheckStep } from "./lessons";

export type CheckAnswer = ChoiceAnswerState;

interface CheckProps {
  step: CheckStep;
  answer: CheckAnswer | undefined;
  onSelect: (optionId: string) => void;
}

export function Check({ step, answer, onSelect }: CheckProps) {
  const committed = answer?.committed ?? false;

  return (
    <fieldset className="check" disabled={committed}>
      <legend className="check__prompt">
        <h2>{step.prompt}</h2>
      </legend>
      <ChoiceAnswer
        options={step.options}
        correctOptionId={step.correctOptionId}
        explanation={step.explanation}
        answer={answer}
        onSelect={onSelect}
      />
    </fieldset>
  );
}
