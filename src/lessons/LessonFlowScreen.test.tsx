import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";
import { resetHistoryStoreForTests } from "../history/historyStore";
import { lessons, type CheckStep, type Lesson, type LessonStep } from "./lessons";
import { pickTodaysLesson } from "./pickTodaysLesson";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/** Stands in for the browser's back button or the system back gesture. */
function SystemBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      System back
    </button>
  );
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationDisplay />
      <SystemBack />
      <AppRoutes />
    </MemoryRouter>,
  );
}

function expectOnStep(lesson: Lesson, index: number) {
  expect(screen.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
    "aria-valuetext",
    `Step ${index + 1} of ${lesson.steps.length}`,
  );
  const step = lesson.steps[index];
  switch (step.kind) {
    case "explainer":
      expect(screen.getByRole("heading", { name: step.title })).toBeInTheDocument();
      break;
    case "check":
      expect(screen.getByRole("group", { name: step.prompt })).toBeInTheDocument();
      break;
    case "recap":
      expect(screen.getByRole("heading", { name: "Apply it in the real world" })).toBeInTheDocument();
      break;
  }
}

function firstStepOfKind<Kind extends LessonStep["kind"]>(lesson: Lesson, kind: Kind) {
  const index = lesson.steps.findIndex((step) => step.kind === kind);
  if (index === -1) throw new Error(`${lesson.id} has no ${kind} step`);
  return { index, step: lesson.steps[index] as Extract<LessonStep, { kind: Kind }> };
}

function optionText(step: CheckStep, which: "correct" | "wrong") {
  const option = step.options.find((candidate) => (candidate.id === step.correctOptionId) === (which === "correct"));
  return option!.text;
}

/** Steps through the Lesson from the step at `from` to the one at `index`, answering every Check correctly on the way. */
function advanceTo(lesson: Lesson, index: number, from = 0) {
  for (const step of lesson.steps.slice(from, index)) {
    if (step.kind === "check") {
      fireEvent.click(screen.getByRole("radio", { name: optionText(step, "correct") }));
      fireEvent.click(screen.getByRole("button", { name: "Check" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  }
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

const activeListening = lessons.find((lesson) => lesson.id === "active-listening")!;

describe("Lesson flow", () => {
  it("opens a Lesson from the Lessons list as a full-screen flow at its first step", () => {
    renderApp("/lessons");

    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${activeListening.id}`);
    expectOnStep(activeListening, 0);
    expect(screen.queryByRole("heading", { name: "Lessons" })).not.toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("moves forward one step with Continue, and back one step with Back from step 2 onward", () => {
    renderApp(`/lessons/${activeListening.id}`);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expectOnStep(activeListening, 1);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectOnStep(activeListening, 0);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${activeListening.id}`);
  });

  it("leaves to Home when the Lesson was opened from Today's idea", () => {
    const todaysLesson = pickTodaysLesson(lessons);
    renderApp("/");

    fireEvent.click(screen.getByRole("link", { name: /Today.s idea/ }));
    expectOnStep(todaysLesson, 0);
    fireEvent.click(screen.getByRole("link", { name: "← Home" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    expect(screen.getByRole("link", { name: "Start practicing" })).toBeInTheDocument();
  });

  it("leaves to the Lessons list when the Lesson was opened from the list", () => {
    renderApp("/lessons");

    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    fireEvent.click(screen.getByRole("link", { name: "← Lessons" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
    expect(screen.getByRole("heading", { name: "Lessons" })).toBeInTheDocument();
  });

  it("leaves to the Lessons list when the Lesson was opened from a link", () => {
    renderApp(`/lessons/${activeListening.id}`);

    fireEvent.click(screen.getByRole("link", { name: "← Lessons" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("shows each Explainer's paragraphs with their emphasised phrases, its quote and its key line", () => {
    const explainers = activeListening.steps.flatMap((step) => (step.kind === "explainer" ? [step] : []));
    expect(explainers.some((step) => step.quote)).toBe(true);
    expect(explainers.some((step) => step.keyLine)).toBe(true);
    renderApp(`/lessons/${activeListening.id}`);

    activeListening.steps.forEach((step, index) => {
      if (index > 0) advanceTo(activeListening, index, index - 1);
      if (step.kind !== "explainer") return;

      const emphasised = step.paragraphs.flat().filter((run) => run.emphasis).map((run) => run.text);
      expect(screen.queryAllByRole("emphasis").map((element) => element.textContent)).toEqual(emphasised);
      for (const paragraph of step.paragraphs) {
        const text = paragraph.map((run) => run.text).join("");
        expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === text)).toBeInTheDocument();
      }
      if (step.quote) {
        expect(screen.getByRole("blockquote")).toHaveTextContent(step.quote);
      } else {
        expect(screen.queryByRole("blockquote")).not.toBeInTheDocument();
      }
      if (step.keyLine) {
        expect(screen.getByRole("mark")).toHaveTextContent(step.keyLine);
      } else {
        expect(screen.queryByRole("mark")).not.toBeInTheDocument();
      }
    });
  });

  it("keeps a Check's primary action disabled until an option is chosen, and explains a right pick once committed", () => {
    const { index, step } = firstStepOfKind(activeListening, "check");
    renderApp(`/lessons/${activeListening.id}`);
    advanceTo(activeListening, index);
    expectOnStep(activeListening, index);

    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: optionText(step, "correct") }));
    expect(screen.getByRole("radio", { name: optionText(step, "correct") })).toBeChecked();
    expect(screen.queryByText(step.explanation)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    const result = screen.getByRole("status");
    expect(result).toHaveTextContent("That's it.");
    expect(result).toHaveTextContent(step.explanation);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expectOnStep(activeListening, index + 1);
  });

  it("explains a wrong pick, points out the better option, and continues without a retry", () => {
    const { index, step } = firstStepOfKind(activeListening, "check");
    renderApp(`/lessons/${activeListening.id}`);
    advanceTo(activeListening, index);

    fireEvent.click(screen.getByRole("radio", { name: optionText(step, "wrong") }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    const result = screen.getByRole("status");
    expect(result).toHaveTextContent("Not quite.");
    expect(result).toHaveTextContent(step.explanation);
    expect(screen.getByRole("radio", { name: optionText(step, "correct") })).toHaveAccessibleDescription(
      "Better option",
    );
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expectOnStep(activeListening, index + 1);
  });

  it("ends with a Recap of takeaways and an Apply It, and Finish returns to the Lessons list it was opened from", () => {
    const { index, step } = firstStepOfKind(activeListening, "recap");
    renderApp("/lessons");
    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    advanceTo(activeListening, index);

    for (const takeaway of step.takeaways) {
      expect(screen.getByText(takeaway)).toBeInTheDocument();
    }
    const applyIt = screen.getByRole("region", { name: "Apply it in the real world" });
    expect(applyIt).toHaveTextContent(step.applyIt);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("returns Home on Finish when the Lesson was opened from Today's idea", () => {
    const todaysLesson = pickTodaysLesson(lessons);
    renderApp("/");
    fireEvent.click(screen.getByRole("link", { name: /Today.s idea/ }));
    advanceTo(todaysLesson, todaysLesson.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("starts the Lesson from step 1 again after leaving mid-Lesson, by the leave action or by system back", () => {
    renderApp("/lessons");
    const openLesson = () => fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    openLesson();
    advanceTo(activeListening, 3);
    fireEvent.click(screen.getByRole("link", { name: "← Lessons" }));
    openLesson();
    expectOnStep(activeListening, 0);

    advanceTo(activeListening, 3);
    fireEvent.click(screen.getByRole("button", { name: "System back" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
    openLesson();
    expectOnStep(activeListening, 0);
  });

  it("never shows a score, percentage or tally of answers, and needs no network, through a whole Lesson", () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    vi.stubGlobal("fetch", fetchMock);
    const tally = /\d+\s*(of|out of|\/)\s*\d+|%|\bscore\b/i;
    renderApp(`/lessons/${activeListening.id}`);

    let pickRight = false;
    activeListening.steps.forEach((step) => {
      expect(document.body.textContent).not.toMatch(tally);
      if (step.kind === "check") {
        pickRight = !pickRight;
        fireEvent.click(screen.getByRole("radio", { name: optionText(step, pickRight ? "correct" : "wrong") }));
        fireEvent.click(screen.getByRole("button", { name: "Check" }));
        expect(document.body.textContent).not.toMatch(tally);
      }
      if (step.kind !== "recap") fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    });

    expectOnStep(activeListening, activeListening.steps.length - 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
