import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";
import { resetHistoryStoreForTests } from "../history/historyStore";
import { isChoiceStep, lessons, type ChoiceStep, type Lesson, type LessonStep } from "./lessons";
import { markLessonFinished } from "./lessonProgressStore";
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
    case "reply-choice":
      expect(screen.getByText(step.context)).toBeInTheDocument();
      expect(screen.getByText(step.line)).toBeInTheDocument();
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

function optionText(step: ChoiceStep, which: "correct" | "wrong") {
  const option = step.options.find((candidate) => (candidate.id === step.correctOptionId) === (which === "correct"));
  return option!.text;
}

/** Steps through the Lesson from the step at `from` to the one at `index`, answering every Check and Reply Choice correctly on the way. */
function advanceTo(lesson: Lesson, index: number, from = 0) {
  for (const step of lesson.steps.slice(from, index)) {
    if (isChoiceStep(step)) {
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

  it("shows a Reply Choice's context sentence and the other person's line as a persona message with no avatar or speaker label, on the your-move ground", () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
    const { container } = renderApp(`/lessons/${activeListening.id}`);
    advanceTo(activeListening, index);

    expect(screen.getByText(step.context)).toBeInTheDocument();
    const line = container.querySelector(".chat-message--assistant");
    expect(line).toHaveTextContent(step.line);
    expect(line?.querySelector(".chat-message__author")).not.toBeInTheDocument();
    expect(container.querySelector(".lesson-flow")).toHaveClass("lesson-flow--your-move");
  });

  it("keeps a Reply Choice's primary action disabled until an option is chosen, and explains a right pick once committed, exactly like a Check", () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
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

  it("explains a wrong pick on a Reply Choice, points out the better option, and continues without a retry, exactly like a Check", () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
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

  it("shuffles a Reply Choice's options once when the Lesson starts, keeps that order for the run, and reshuffles on a fresh start", () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
    const displayedOptionTexts = () =>
      screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent);

    renderApp("/lessons");
    const openLesson = () => fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    vi.spyOn(Math, "random").mockReturnValue(0);
    openLesson();
    vi.restoreAllMocks();
    advanceTo(activeListening, index);
    const firstOrder = displayedOptionTexts();
    expect(firstOrder.slice().sort()).toEqual(step.options.map((option) => option.text).sort());

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(displayedOptionTexts()).toEqual(firstOrder);

    fireEvent.click(screen.getByRole("link", { name: "← Lessons" }));
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    openLesson();
    vi.restoreAllMocks();
    advanceTo(activeListening, index);
    const secondOrder = displayedOptionTexts();

    expect(secondOrder).toEqual(step.options.map((option) => option.text));
    expect(secondOrder).not.toEqual(firstOrder);
  });

  it("ends with a Recap of takeaways and an Apply It, and Finish marks it done and offers Next lesson and Done", async () => {
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

    expect(await screen.findByRole("button", { name: "Next lesson" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Done" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("returns Home via Done when the Lesson was opened from Today's idea", async () => {
    const todaysLesson = pickTodaysLesson(lessons);
    renderApp("/");
    fireEvent.click(screen.getByRole("link", { name: /Today.s idea/ }));
    advanceTo(todaysLesson, todaysLesson.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    fireEvent.click(await screen.findByRole("link", { name: "Done" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("does not mark a Lesson done just by reaching the Recap without tapping Finish", async () => {
    const { index } = firstStepOfKind(activeListening, "recap");
    renderApp("/lessons");
    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    advanceTo(activeListening, index);

    fireEvent.click(screen.getByRole("link", { name: "← Lessons" }));

    const row = await screen.findByRole("link", { name: new RegExp(activeListening.title) });
    expect(within(row).queryByText("Done")).not.toBeInTheDocument();
  });

  it("finishing an already-done Lesson leaves it done, with no visible change", async () => {
    await markLessonFinished(activeListening.id);
    const { index } = firstStepOfKind(activeListening, "recap");
    renderApp(`/lessons/${activeListening.id}`);
    advanceTo(activeListening, index);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("button", { name: "Next lesson" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "← Lessons" }));

    const row = await screen.findByRole("link", { name: new RegExp(activeListening.title) });
    expect(await within(row).findByText("Done")).toBeInTheDocument();
    expect(screen.getAllByText("Done")).toHaveLength(1);
  });

  it("Next lesson opens the first unfinished Lesson in list order, skipping the current one, and replaces it in history", async () => {
    const openQuestions = lessons.find((lesson) => lesson.id === "open-questions")!;
    renderApp("/lessons");
    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    advanceTo(activeListening, activeListening.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next lesson" }));

    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${openQuestions.id}`);
    expectOnStep(openQuestions, 0);

    fireEvent.click(screen.getByRole("button", { name: "System back" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("keeps the Lesson before it as the leave destination when Next lesson is used", async () => {
    const todaysLesson = pickTodaysLesson(lessons);
    renderApp("/");
    fireEvent.click(screen.getByRole("link", { name: /Today.s idea/ }));
    advanceTo(todaysLesson, todaysLesson.steps.length - 1);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    fireEvent.click(await screen.findByRole("button", { name: "Next lesson" }));

    expect(screen.getByRole("link", { name: "← Home" })).toBeInTheDocument();
  });

  it("offers only Done once every other Lesson is already finished", async () => {
    const readingTheRoom = lessons.find((lesson) => lesson.id === "reading-the-room")!;
    await markLessonFinished("active-listening");
    await markLessonFinished("open-questions");
    renderApp(`/lessons/${readingTheRoom.id}`);
    advanceTo(readingTheRoom, readingTheRoom.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next lesson" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Done" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
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
      if (isChoiceStep(step)) {
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
