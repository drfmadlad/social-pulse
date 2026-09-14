import { ChoiceAnswer, type ChoiceAnswerState } from "./ChoiceAnswer";
import type { ChoiceOption, ReplyChoiceStep } from "./lessons";

export type ReplyChoiceAnswer = ChoiceAnswerState;

interface ReplyChoiceProps {
  step: ReplyChoiceStep;
  /** Shuffled once when the Lesson starts, so the order doesn't match `step.options`. */
  options: ChoiceOption[];
  answer: ReplyChoiceAnswer | undefined;
  onSelect: (optionId: string) => void;
}

export function ReplyChoice({ step, options, answer, onSelect }: ReplyChoiceProps) {
  const committed = answer?.committed ?? false;

  return (
    <fieldset className="check reply-choice" disabled={committed}>
      <legend className="reply-choice__setup">
        <p className="reply-choice__context">{step.context}</p>
        {/* Conversation's persona message, with no avatar and no speaker label (DESIGN.md §3). */}
        <ul className="chat-screen__messages reply-choice__transcript">
          <li className="chat-message chat-message--assistant">
            <p>{step.line}</p>
          </li>
        </ul>
      </legend>
      <ChoiceAnswer
        options={options}
        correctOptionId={step.correctOptionId}
        explanation={step.explanation}
        answer={answer}
        onSelect={onSelect}
      />
    </fieldset>
  );
}
