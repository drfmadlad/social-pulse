import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App";
import { resetHistoryStoreForTests } from "../history/historyStore";
import { mockReply, mockWrittenReplyVerdict } from "../test/apiMocks";
import { clickToScreen, settleDeviceReads } from "../test/settleDeviceReads";
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

async function renderApp(initialPath: string) {
  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationDisplay />
      <SystemBack />
      <AppRoutes />
    </MemoryRouter>,
  );
  await settleDeviceReads();
  return view;
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
    case "written-reply":
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

/** Sends a Written Reply and waits for a verdict or fallback to land, however the stubbed fetch resolves it. */
async function sendWrittenReply(text = "Something I'd say.") {
  fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("button", { name: "Continue" });
}

/**
 * Steps through the Lesson from the step at `from` to the one at `index`, answering every Check
 * and Reply Choice correctly, and sending a Written Reply, on the way. A Written Reply step needs
 * `fetch` stubbed (the default `beforeEach` stub below covers it, unless the test replaces it).
 */
async function advanceTo(lesson: Lesson, index: number, from = 0) {
  for (const step of lesson.steps.slice(from, index)) {
    if (isChoiceStep(step)) {
      fireEvent.click(screen.getByRole("radio", { name: optionText(step, "correct") }));
      fireEvent.click(screen.getByRole("button", { name: "Check" }));
    }
    if (step.kind === "written-reply") await sendWrittenReply();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  }
}

beforeEach(() => {
  // Default so every test that merely advances past a Written Reply (rather than testing it
  // directly) doesn't need its own stub. Tests covering Written Reply's own behavior replace it.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockWrittenReplyVerdict("landed", "That's a default test verdict.")));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

const activeListening = lessons.find((lesson) => lesson.id === "active-listening")!;

describe("Lesson flow", () => {
  it("opens a Lesson from the Lessons list as a full-screen flow at its first step", async () => {
    await renderApp("/lessons");

    await clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${activeListening.id}`);
    expectOnStep(activeListening, 0);
    expect(screen.queryByRole("heading", { name: "Lessons" })).not.toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("moves forward one step with Continue, and back one step with Back from step 2 onward", async () => {
    await renderApp(`/lessons/${activeListening.id}`);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expectOnStep(activeListening, 1);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectOnStep(activeListening, 0);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${activeListening.id}`);
  });

  it("leaves to Home when the Lesson was opened from Today's idea", async () => {
    const todaysLesson = pickTodaysLesson(lessons);
    await renderApp("/");

    await clickToScreen(screen.getByRole("link", { name: /Today.s idea/ }));
    expectOnStep(todaysLesson, 0);
    await clickToScreen(screen.getByRole("link", { name: "← Home" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    expect(screen.getByRole("link", { name: "Start practicing" })).toBeInTheDocument();
  });

  it("leaves to the Lessons list when the Lesson was opened from the list", async () => {
    await renderApp("/lessons");

    await clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
    expect(screen.getByRole("heading", { name: "Lessons" })).toBeInTheDocument();
  });

  it("leaves to the Lessons list when the Lesson was opened from a link", async () => {
    await renderApp(`/lessons/${activeListening.id}`);

    await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("shows each Explainer's paragraphs with their emphasised phrases, its quote and its key line", async () => {
    const explainers = activeListening.steps.flatMap((step) => (step.kind === "explainer" ? [step] : []));
    expect(explainers.some((step) => step.quote)).toBe(true);
    expect(explainers.some((step) => step.keyLine)).toBe(true);
    await renderApp(`/lessons/${activeListening.id}`);

    for (const [index, step] of activeListening.steps.entries()) {
      if (index > 0) await advanceTo(activeListening, index, index - 1);
      if (step.kind !== "explainer") continue;

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
    }
  });

  it("shows artwork, hidden from assistive technology, only on the Explainers that carry it", async () => {
    const explainers = activeListening.steps.flatMap((step) => (step.kind === "explainer" ? [step] : []));
    expect(explainers.some((step) => step.artwork)).toBe(true);
    expect(explainers.some((step) => !step.artwork)).toBe(true);
    const { container } = await renderApp(`/lessons/${activeListening.id}`);

    for (const [index, step] of activeListening.steps.entries()) {
      if (index > 0) await advanceTo(activeListening, index, index - 1);
      const artwork = container.querySelectorAll(".artwork");

      if (step.kind === "explainer" && step.artwork) {
        expect(artwork).toHaveLength(1);
        expect(artwork[0]).toHaveAttribute("aria-hidden", "true");
      } else {
        expect(artwork).toHaveLength(0);
      }
    }
  });

  it("keeps a Check's primary action disabled until an option is chosen, and explains a right pick once committed", async () => {
    const { index, step } = firstStepOfKind(activeListening, "check");
    await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);
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

  it("explains a wrong pick, points out the better option, and continues without a retry", async () => {
    const { index, step } = firstStepOfKind(activeListening, "check");
    await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);

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

  it("shows a Reply Choice's context sentence and the other person's line as a persona message with no avatar or speaker label, on the your-move ground", async () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
    const { container } = await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);

    expect(screen.getByText(step.context)).toBeInTheDocument();
    const line = container.querySelector(".chat-message--assistant");
    expect(line).toHaveTextContent(step.line);
    expect(line?.querySelector(".chat-message__author")).not.toBeInTheDocument();
    expect(container.querySelector(".lesson-flow")).toHaveClass("lesson-flow--your-move");
  });

  it("keeps a Reply Choice's primary action disabled until an option is chosen, and explains a right pick once committed, exactly like a Check", async () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
    await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);
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

  it("explains a wrong pick on a Reply Choice, points out the better option, and continues without a retry, exactly like a Check", async () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
    await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);

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

  it("shuffles a Reply Choice's options once when the Lesson starts, keeps that order for the run, and reshuffles on a fresh start", async () => {
    const { index, step } = firstStepOfKind(activeListening, "reply-choice");
    const displayedOptionTexts = () =>
      screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent);

    await renderApp("/lessons");
    const openLesson = () => clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    vi.spyOn(Math, "random").mockReturnValue(0);
    await openLesson();
    vi.restoreAllMocks();
    await advanceTo(activeListening, index);
    const firstOrder = displayedOptionTexts();
    expect(firstOrder.slice().sort()).toEqual(step.options.map((option) => option.text).sort());

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(displayedOptionTexts()).toEqual(firstOrder);

    await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    await openLesson();
    vi.restoreAllMocks();
    await advanceTo(activeListening, index);
    const secondOrder = displayedOptionTexts();

    expect(secondOrder).toEqual(step.options.map((option) => option.text));
    expect(secondOrder).not.toEqual(firstOrder);
  });

  it("ends with a Recap of takeaways and an Apply It, and Finish marks it done and offers Next lesson and Done", async () => {
    const { index, step } = firstStepOfKind(activeListening, "recap");
    await renderApp("/lessons");
    await clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    await advanceTo(activeListening, index);

    for (const takeaway of step.takeaways) {
      expect(screen.getByText(takeaway)).toBeInTheDocument();
    }
    const applyIt = screen.getByRole("region", { name: "Apply it in the real world" });
    expect(applyIt).toHaveTextContent(step.applyIt);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("button", { name: "Next lesson" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();

    await clickToScreen(screen.getByRole("link", { name: "Done" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("plays one confetti burst on Finish, hidden from assistive technology", async () => {
    const { index } = firstStepOfKind(activeListening, "recap");
    const { container } = await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);

    expect(container.querySelectorAll(".confetti-piece")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await screen.findByRole("button", { name: "Next lesson" });

    const burst = container.querySelector(".confetti");
    expect(burst).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".confetti-piece").length).toBeGreaterThan(0);

    // Finish also marks the Lesson done on-device, which the flow reads back; that belongs to
    // this test, not to whichever one runs next.
    await settleDeviceReads();
  });

  it("shows no confetti under reduced motion, and the Lesson can still be finished", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true } as MediaQueryList));
    const { index } = firstStepOfKind(activeListening, "recap");
    const { container } = await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("button", { name: "Next lesson" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toBeInTheDocument();
    expect(container.querySelectorAll(".confetti-piece")).toHaveLength(0);

    // Finish also marks the Lesson done on-device, which the flow reads back; that belongs to
    // this test, not to whichever one runs next.
    await settleDeviceReads();
  });

  it("returns Home via Done when the Lesson was opened from Today's idea", async () => {
    const todaysLesson = pickTodaysLesson(lessons);
    await renderApp("/");
    await clickToScreen(screen.getByRole("link", { name: /Today.s idea/ }));
    await advanceTo(todaysLesson, todaysLesson.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    await clickToScreen(await screen.findByRole("link", { name: "Done" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("does not mark a Lesson done just by reaching the Recap without tapping Finish", async () => {
    const { index } = firstStepOfKind(activeListening, "recap");
    await renderApp("/lessons");
    await clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    await advanceTo(activeListening, index);

    await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));

    const row = await screen.findByRole("link", { name: new RegExp(activeListening.title) });
    expect(within(row).queryByText("Done")).not.toBeInTheDocument();
  });

  it("finishing an already-done Lesson leaves it done, with no visible change", async () => {
    await markLessonFinished(activeListening.id);
    const { index } = firstStepOfKind(activeListening, "recap");
    await renderApp(`/lessons/${activeListening.id}`);
    await advanceTo(activeListening, index);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("button", { name: "Next lesson" })).toBeInTheDocument();
    await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));

    const row = await screen.findByRole("link", { name: new RegExp(activeListening.title) });
    expect(await within(row).findByText("Done")).toBeInTheDocument();
    expect(screen.getAllByText("Done")).toHaveLength(1);
  });

  it("Next lesson opens the first unfinished Lesson in list order, skipping the current one, and replaces it in history", async () => {
    const openQuestions = lessons.find((lesson) => lesson.id === "open-questions")!;
    await renderApp("/lessons");
    await clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    await advanceTo(activeListening, activeListening.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next lesson" }));

    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${openQuestions.id}`);
    expectOnStep(openQuestions, 0);

    await clickToScreen(screen.getByRole("button", { name: "System back" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("keeps the Lesson before it as the leave destination when Next lesson is used", async () => {
    const todaysLesson = pickTodaysLesson(lessons);
    await renderApp("/");
    await clickToScreen(screen.getByRole("link", { name: /Today.s idea/ }));
    await advanceTo(todaysLesson, todaysLesson.steps.length - 1);
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    await clickToScreen(await screen.findByRole("button", { name: "Next lesson" }));

    expect(screen.getByRole("link", { name: "← Home" })).toBeInTheDocument();
  });

  it("offers only Done once every other Lesson is already finished", async () => {
    const readingTheRoom = lessons.find((lesson) => lesson.id === "reading-the-room")!;
    await markLessonFinished("active-listening");
    await markLessonFinished("open-questions");
    await renderApp(`/lessons/${readingTheRoom.id}`);
    await advanceTo(readingTheRoom, readingTheRoom.steps.length - 1);

    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next lesson" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Done" })).not.toBeInTheDocument();

    await clickToScreen(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
  });

  it("starts the Lesson from step 1 again after leaving mid-Lesson, by the leave action or by system back", async () => {
    await renderApp("/lessons");
    const openLesson = () => clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    await openLesson();
    await advanceTo(activeListening, 3);
    await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));
    await openLesson();
    expectOnStep(activeListening, 0);

    await advanceTo(activeListening, 3);
    await clickToScreen(screen.getByRole("button", { name: "System back" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/lessons$/);
    await openLesson();
    expectOnStep(activeListening, 0);
  });

  it("never shows a score, percentage or tally of answers, and completes even offline, through a whole Lesson", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    vi.stubGlobal("fetch", fetchMock);
    const tally = /\d+\s*(of|out of|\/)\s*\d+|%|\bscore\b/i;
    await renderApp(`/lessons/${activeListening.id}`);

    let pickRight = false;
    for (const step of activeListening.steps) {
      expect(document.body.textContent).not.toMatch(tally);
      if (isChoiceStep(step)) {
        pickRight = !pickRight;
        fireEvent.click(screen.getByRole("radio", { name: optionText(step, pickRight ? "correct" : "wrong") }));
        fireEvent.click(screen.getByRole("button", { name: "Check" }));
        expect(document.body.textContent).not.toMatch(tally);
      }
      if (step.kind === "written-reply") {
        await sendWrittenReply();
        expect(document.body.textContent).not.toMatch(tally);
      }
      if (step.kind !== "recap") fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    }

    expectOnStep(activeListening, activeListening.steps.length - 1);
    // Check and Reply Choice never touch the network; only the one Written Reply attempts it, and
    // falls back so the Lesson still completes offline.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  describe("Written Reply", () => {
    const { index, step } = firstStepOfKind(activeListening, "written-reply");

    it("reuses Reply Choice's context sentence and persona message bubble for the other person's line", async () => {
      const { container } = await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      expect(screen.getByText(step.context)).toBeInTheDocument();
      const line = container.querySelector(".chat-message--assistant");
      expect(line).toHaveTextContent(step.line);
      expect(line?.querySelector(".chat-message__author")).not.toBeInTheDocument();
      expect(container.querySelector(".lesson-flow")).toHaveClass("lesson-flow--your-move");
    });

    it("prompts the user with the move they're practising before they've sent a reply", async () => {
      await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      const lowered = step.movePractised.charAt(0).toLowerCase() + step.movePractised.slice(1);
      expect(screen.getByText(`How would you respond, ${lowered}?`)).toBeInTheDocument();
    });

    it("disables Send while the reply is empty, and shows a waiting state while the AI responds", async () => {
      vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
      await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

      fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "  " } });
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

      fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "Something I'd say." } });
      expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();

      fireEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(await screen.findByRole("status", { name: "Waiting for a response" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
      expect(screen.getByText("Something I'd say.")).toBeInTheDocument();
    });

    it("shows a landed verdict and its reason, and Continue moves on", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockWrittenReplyVerdict("landed", "You named the worry directly.")));
      await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      await sendWrittenReply();

      const result = screen.getByRole("status");
      expect(result).toHaveTextContent("That lands.");
      expect(result).toHaveTextContent("You named the worry directly.");

      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      expectOnStep(activeListening, index + 1);
    });

    it("shows a not-yet verdict and its reason", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(mockWrittenReplyVerdict("not_yet", "You jumped to advice instead of reflecting first.")),
      );
      await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      await sendWrittenReply();

      const result = screen.getByRole("status");
      expect(result).toHaveTextContent("Not quite yet.");
      expect(result).toHaveTextContent("You jumped to advice instead of reflecting first.");
    });

    it("falls back to the Lesson's example reply on a network failure, and a successful Try again replaces it with a verdict", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(mockWrittenReplyVerdict("landed", "That's a warm reflection."));
      vi.stubGlobal("fetch", fetchMock);
      await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      await sendWrittenReply();

      expect(screen.getByText("You're offline, so here's one way to say it.")).toBeInTheDocument();
      expect(screen.getByText(step.exampleReply)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("That lands.")).toBeInTheDocument();
      expect(screen.getByText("That's a warm reflection.")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("falls back with a generic message on an unreadable response, and offers Continue", async () => {
      // A 200 whose content isn't parseable JSON: unreadable, not a network or server error.
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockReply("not valid json")));
      await renderApp(`/lessons/${activeListening.id}`);
      await advanceTo(activeListening, index);

      await sendWrittenReply();

      expect(screen.getByText("Couldn't get feedback just now. Here's one way to say it.")).toBeInTheDocument();
      expect(screen.getByText(step.exampleReply)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    });

    it("saves nothing the user writes: a fresh Lesson start shows an empty composer again", async () => {
      await renderApp("/lessons");
      const openLesson = () => clickToScreen(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

      await openLesson();
      await advanceTo(activeListening, index);
      fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "Something private." } });

      await clickToScreen(screen.getByRole("link", { name: "← Lessons" }));
      await openLesson();
      await advanceTo(activeListening, index);

      expect(screen.getByLabelText("Your reply")).toHaveValue("");
    });
  });
});
