import { useId, useState } from "react";
import type { QuizQuestion } from "./lessons";

interface LessonQuizProps {
  questions: QuizQuestion[];
}

type Answers = Record<string, string>;

export function LessonQuiz({ questions }: LessonQuizProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState(false);
  const quizId = useId();

  const answeredAll = questions.every((question) => answers[question.id] !== undefined);
  const correctCount = questions.filter((question) => answers[question.id] === question.correctOptionId).length;

  function retake() {
    setAnswers({});
    setChecked(false);
  }

  return (
    <form
      className="lesson-quiz"
      aria-labelledby={`${quizId}-heading`}
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
      }}
    >
      <h4 id={`${quizId}-heading`}>Quiz</h4>
      {questions.map((question) => {
        const selected = answers[question.id];
        const isCorrect = selected === question.correctOptionId;
        return (
          <fieldset key={question.id} className="lesson-quiz__question">
            <legend>{question.prompt}</legend>
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`lesson-quiz__option${selected === option.id ? " lesson-quiz__option--selected" : ""}`}
              >
                <input
                  type="radio"
                  name={`${quizId}-${question.id}`}
                  value={option.id}
                  checked={selected === option.id}
                  disabled={checked}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                />
                <span>{option.text}</span>
              </label>
            ))}
            {checked && (
              <p className={`lesson-quiz__result ${isCorrect ? "lesson-quiz__result--correct" : "lesson-quiz__result--incorrect"}`}>
                <strong>{isCorrect ? "Correct" : "Not quite"}</strong> {question.explanation}
              </p>
            )}
          </fieldset>
        );
      })}
      {!checked && (
        <button type="submit" className="button-primary" disabled={!answeredAll}>
          Check answers
        </button>
      )}
      {checked && (
        <>
          <p className="lesson-quiz__score" role="status">
            You got {correctCount} of {questions.length} correct.
          </p>
          <button type="button" className="button-primary" onClick={retake}>
            Retake quiz
          </button>
        </>
      )}
    </form>
  );
}
