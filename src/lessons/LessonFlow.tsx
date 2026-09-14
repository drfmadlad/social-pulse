import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScreenDirection } from "../ScreenTransition";
import { screenTransitionClassName, type ScreenDirection } from "../screenDirection";
import { Check, type CheckAnswer } from "./Check";
import { Explainer } from "./Explainer";
import { Recap } from "./Recap";
import type { LeaveDestination } from "./leaveDestination";
import type { Lesson } from "./lessons";

interface LessonFlowProps {
  lesson: Lesson;
  leaveTo: LeaveDestination;
}

interface PrimaryAction {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * One run through a Lesson. Step position and answers live only here, never in the URL or
 * storage, so leaving the route by any means discards them and the next visit starts at step 1.
 */
export function LessonFlow({ lesson, leaveTo }: LessonFlowProps) {
  const direction = useScreenDirection();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  // Null until the first step change, so step 1's content doesn't animate on top of the screen push.
  const [stepDirection, setStepDirection] = useState<ScreenDirection | null>(null);
  // Keyed by step index. Kept across Back so a committed Check stays committed: there is no retry.
  const [checkAnswers, setCheckAnswers] = useState<Record<number, CheckAnswer>>({});
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = lesson.steps[stepIndex];
  const isYourMove = step.kind === "check";

  function goForward() {
    setStepDirection("forward");
    setStepIndex((current) => Math.min(current + 1, lesson.steps.length - 1));
  }

  function goBack() {
    setStepDirection("back");
    setStepIndex(stepIndex - 1);
    // Back leaves the row on step 1; keep keyboard focus in the pinned row rather than dropping it.
    if (stepIndex === 1) primaryRef.current?.focus();
  }

  function selectOption(optionId: string) {
    setCheckAnswers((current) => ({ ...current, [stepIndex]: { selectedOptionId: optionId, committed: false } }));
  }

  function commitAnswer() {
    setCheckAnswers((current) => ({ ...current, [stepIndex]: { ...current[stepIndex], committed: true } }));
  }

  function primaryAction(): PrimaryAction {
    if (step.kind === "check" && !checkAnswers[stepIndex]?.committed) {
      return { label: "Check", disabled: !checkAnswers[stepIndex], onClick: commitAnswer };
    }
    if (step.kind === "recap") {
      return { label: "Finish", onClick: () => navigate(leaveTo.path) };
    }
    return { label: "Continue", onClick: goForward };
  }

  const primary = primaryAction();

  return (
    <div
      className={`lesson-flow ${screenTransitionClassName(direction)}${isYourMove ? " lesson-flow--your-move" : ""}`}
    >
      <header className="lesson-flow__top">
        <h1 className="visually-hidden">{lesson.title}</h1>
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={1}
          aria-valuemax={lesson.steps.length}
          aria-valuenow={stepIndex + 1}
          aria-valuetext={`Step ${stepIndex + 1} of ${lesson.steps.length}`}
          className="lesson-progress"
        >
          {lesson.steps.map((_, index) => (
            <span
              key={index}
              className={`lesson-progress__segment${index <= stepIndex ? " lesson-progress__segment--reached" : ""}`}
            />
          ))}
        </div>
        <div className="lesson-flow__top-row">
          <Link className="back-button" to={leaveTo.path}>
            {leaveTo.label}
          </Link>
          {lesson.isPlaceholder && <span className="draft-chip">Draft</span>}
        </div>
      </header>

      <div
        key={stepIndex}
        className={`lesson-flow__step${stepDirection ? ` lesson-flow__step--enter-${stepDirection}` : ""}`}
      >
        <div className="lesson-flow__content">
          {step.kind === "explainer" && <Explainer step={step} />}
          {step.kind === "check" && <Check step={step} answer={checkAnswers[stepIndex]} onSelect={selectOption} />}
          {step.kind === "recap" && <Recap step={step} />}
        </div>
      </div>

      <footer className="lesson-flow__bottom">
        <div className="lesson-flow__back-slot">
          {stepIndex > 0 && (
            <button type="button" className="lesson-flow__back" onClick={goBack}>
              Back
            </button>
          )}
        </div>
        <button
          ref={primaryRef}
          type="button"
          className="button-primary lesson-flow__primary"
          disabled={primary.disabled}
          onClick={primary.onClick}
        >
          {/* Keyed so a label change fades the new label in. */}
          <span key={primary.label} className="lesson-flow__primary-label">
            {primary.label}
          </span>
        </button>
      </footer>
    </div>
  );
}
