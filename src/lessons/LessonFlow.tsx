import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiProxyError } from "../practice/aiProxyClient";
import { useLatestRequestGuard } from "../practice/useLatestRequestGuard";
import { useScreenDirection } from "../ScreenTransition";
import { screenTransitionClassName, type ScreenDirection } from "../screenDirection";
import { Check } from "./Check";
import type { ChoiceAnswerState } from "./ChoiceAnswer";
import { Confetti } from "./Confetti";
import { Explainer } from "./Explainer";
import { findNextUnfinishedLesson } from "./findNextUnfinishedLesson";
import { Recap } from "./Recap";
import { ReplyChoice } from "./ReplyChoice";
import { shuffleOptions } from "./shuffleOptions";
import { isChoiceStep, lessons, type ChoiceOption, type Lesson } from "./lessons";
import { markLessonFinished } from "./lessonProgressStore";
import { useFinishedLessonIds } from "./useFinishedLessonIds";
import { WrittenReply, type WrittenReplyAnswer } from "./WrittenReply";
import { requestWrittenReplyVerdict } from "./writtenReplyVerdict";
import type { LeaveDestination } from "./leaveDestination";

/** The generic "couldn't get feedback" copy, used for anything other than being offline (DESIGN.md §7). */
const WRITTEN_REPLY_FALLBACK_MESSAGE = "Couldn't get feedback just now. Here's one way to say it.";
const WRITTEN_REPLY_OFFLINE_MESSAGE = "You're offline, so here's one way to say it.";

interface LessonFlowProps {
  lesson: Lesson;
  leaveTo: LeaveDestination;
  /** The navigation state this Lesson was opened with, forwarded to Next lesson so it keeps the same leave destination. */
  openerState?: unknown;
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
export function LessonFlow({ lesson, leaveTo, openerState }: LessonFlowProps) {
  const direction = useScreenDirection();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  // True once Finish has been tapped on the Recap; reaching the Recap without tapping it doesn't count.
  const [finished, setFinished] = useState(false);
  const finishedLessonIds = useFinishedLessonIds();
  const nextLesson = findNextUnfinishedLesson(lessons, finishedLessonIds, lesson.id);
  // Null until the first step change, so step 1's content doesn't animate on top of the screen push.
  const [stepDirection, setStepDirection] = useState<ScreenDirection | null>(null);
  // Keyed by step index. Shared by Check and Reply Choice, kept across Back so a committed answer
  // stays committed: there is no retry.
  const [answers, setAnswers] = useState<Record<number, ChoiceAnswerState>>({});
  // Keyed by step index, kept across Back like `answers`. Never persisted: leaving the route
  // (by any means) discards it along with everything else this Lesson run holds only here.
  const [writtenReplies, setWrittenReplies] = useState<Record<number, WrittenReplyAnswer>>({});
  const { start: startWrittenReplyRequest, isStale: isWrittenReplyRequestStale } = useLatestRequestGuard();
  // Computed once when the Lesson starts, so each Reply Choice's options keep one order for the run.
  const [shuffledOptions] = useState<Record<number, ChoiceOption[]>>(() => {
    const shuffled: Record<number, ChoiceOption[]> = {};
    lesson.steps.forEach((lessonStep, index) => {
      if (lessonStep.kind === "reply-choice") shuffled[index] = shuffleOptions(lessonStep.options);
    });
    return shuffled;
  });
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = lesson.steps[stepIndex];
  const isYourMove = isChoiceStep(step) || step.kind === "written-reply";

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
    setAnswers((current) => ({ ...current, [stepIndex]: { selectedOptionId: optionId, committed: false } }));
  }

  function commitAnswer() {
    setAnswers((current) => ({ ...current, [stepIndex]: { ...current[stepIndex], committed: true } }));
  }

  function setWrittenReplyDraft(draft: string) {
    setWrittenReplies((current) => ({ ...current, [stepIndex]: { draft, status: "composing" } }));
  }

  async function sendWrittenReply() {
    if (step.kind !== "written-reply") return;
    const index = stepIndex;
    const draft = (writtenReplies[index]?.draft ?? "").trim();
    if (!draft) return;

    const requestId = startWrittenReplyRequest();
    setWrittenReplies((current) => ({ ...current, [index]: { draft, status: "sending" } }));

    try {
      const result = await requestWrittenReplyVerdict(step, draft);
      if (isWrittenReplyRequestStale(requestId)) return;
      setWrittenReplies((current) => ({
        ...current,
        [index]: { draft, status: "verdict", verdict: result.verdict, reason: result.reason },
      }));
    } catch (error) {
      if (isWrittenReplyRequestStale(requestId)) return;
      const isOffline = error instanceof AiProxyError && error.kind === "network_error";
      setWrittenReplies((current) => ({
        ...current,
        [index]: {
          draft,
          status: "fallback",
          fallbackMessage: isOffline ? WRITTEN_REPLY_OFFLINE_MESSAGE : WRITTEN_REPLY_FALLBACK_MESSAGE,
        },
      }));
    }
  }

  function finishLesson() {
    void markLessonFinished(lesson.id);
    setFinished(true);
  }

  function goToNextLesson() {
    if (!nextLesson) return;
    // Replaces this Lesson in history, so system back from the new one goes where this one started.
    navigate(`/lessons/${nextLesson.id}`, { replace: true, state: openerState });
  }

  function primaryAction(): PrimaryAction {
    if (isChoiceStep(step) && !answers[stepIndex]?.committed) {
      return { label: "Check", disabled: !answers[stepIndex], onClick: commitAnswer };
    }
    if (step.kind === "written-reply") {
      const answer = writtenReplies[stepIndex];
      if (answer?.status === "verdict" || answer?.status === "fallback") {
        return { label: "Continue", onClick: goForward };
      }
      return {
        label: "Send",
        disabled: answer?.status === "sending" || !answer?.draft.trim(),
        onClick: () => void sendWrittenReply(),
      };
    }
    if (step.kind === "recap") {
      if (!finished) return { label: "Finish", onClick: finishLesson };
      if (nextLesson) return { label: "Next lesson", onClick: goToNextLesson };
      return { label: "Done", onClick: () => navigate(leaveTo.path) };
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
          {step.kind === "check" && <Check step={step} answer={answers[stepIndex]} onSelect={selectOption} />}
          {step.kind === "reply-choice" && (
            <ReplyChoice
              step={step}
              options={shuffledOptions[stepIndex]}
              answer={answers[stepIndex]}
              onSelect={selectOption}
            />
          )}
          {step.kind === "written-reply" && (
            <WrittenReply
              step={step}
              answer={writtenReplies[stepIndex]}
              onDraftChange={setWrittenReplyDraft}
              onRetry={() => void sendWrittenReply()}
            />
          )}
          {step.kind === "recap" && <Recap step={step} />}
        </div>
      </div>

      <footer className="lesson-flow__bottom">
        <div className="lesson-flow__back-slot">
          {finished ? (
            nextLesson && (
              <Link className="lesson-flow__back" to={leaveTo.path}>
                Done
              </Link>
            )
          ) : (
            stepIndex > 0 && (
              <button type="button" className="lesson-flow__back" onClick={goBack}>
                Back
              </button>
            )
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

      {finished && <Confetti origin={primaryRef} />}
    </div>
  );
}
