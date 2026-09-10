import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lessons } from "../lessons/lessons";
import { LessonsSection } from "./LessonsSection";

const activeListening = lessons.find((lesson) => lesson.id === "active-listening")!;

function answer(prompt: string, optionText: string) {
  const group = screen.getByRole("group", { name: prompt });
  fireEvent.click(within(group).getByLabelText(optionText));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LessonsSection", () => {
  it("lists every Lesson", () => {
    render(<LessonsSection />);

    expect(lessons.length).toBeGreaterThan(0);
    for (const lesson of lessons) {
      expect(screen.getByRole("button", { name: new RegExp(lesson.title) })).toBeInTheDocument();
    }
  });

  it("shows the Lesson's passage and its multiple-choice quiz when a Lesson is opened", () => {
    render(<LessonsSection />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(activeListening.title) }));

    expect(screen.getByRole("heading", { name: activeListening.title })).toBeInTheDocument();
    for (const paragraph of activeListening.passage) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    for (const question of activeListening.quiz) {
      const group = screen.getByRole("group", { name: question.prompt });
      expect(within(group).getAllByRole("radio")).toHaveLength(question.options.length);
      for (const option of question.options) {
        expect(within(group).getByLabelText(option.text)).toBeInTheDocument();
      }
    }
  });

  it("scores the quiz once every question is answered, and explains each answer", () => {
    render(<LessonsSection />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(activeListening.title) }));

    const [first, second] = activeListening.quiz;
    expect(screen.getByRole("button", { name: "Check answers" })).toBeDisabled();

    answer(first.prompt, first.options.find((option) => option.id === first.correctOptionId)!.text);
    expect(screen.getByRole("button", { name: "Check answers" })).toBeDisabled();

    answer(second.prompt, second.options.find((option) => option.id !== second.correctOptionId)!.text);
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(screen.getByRole("status")).toHaveTextContent(`You got 1 of ${activeListening.quiz.length} correct.`);
    expect(within(screen.getByRole("group", { name: first.prompt })).getByText("Correct")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: second.prompt })).getByText("Not quite")).toBeInTheDocument();
    for (const question of activeListening.quiz) {
      expect(screen.getByText(question.explanation, { exact: false })).toBeInTheDocument();
    }
  });

  it("lets the user retake a quiz they have checked", () => {
    render(<LessonsSection />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(activeListening.title) }));
    for (const question of activeListening.quiz) {
      answer(question.prompt, question.options.find((option) => option.id === question.correctOptionId)!.text);
    }
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      `You got ${activeListening.quiz.length} of ${activeListening.quiz.length} correct.`,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retake quiz" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check answers" })).toBeDisabled();
    for (const question of activeListening.quiz) {
      const group = screen.getByRole("group", { name: question.prompt });
      for (const radio of within(group).getAllByRole("radio")) {
        expect(radio).not.toBeChecked();
      }
    }
  });

  it("marks stub Lesson content as a placeholder", () => {
    render(<LessonsSection />);

    expect(activeListening.isPlaceholder).toBe(true);
    expect(screen.getAllByText("Placeholder")).toHaveLength(lessons.filter((lesson) => lesson.isPlaceholder).length);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(activeListening.title) }));

    expect(screen.getByText(/Placeholder content/)).toBeInTheDocument();
  });

  it("browses Lessons and completes a quiz with no network available", () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    vi.stubGlobal("fetch", fetchMock);

    render(<LessonsSection />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(activeListening.title) }));
    for (const question of activeListening.quiz) {
      answer(question.prompt, question.options.find((option) => option.id === question.correctOptionId)!.text);
    }
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      `You got ${activeListening.quiz.length} of ${activeListening.quiz.length} correct.`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns to the Lesson list from a Lesson", () => {
    render(<LessonsSection />);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(activeListening.title) }));
    fireEvent.click(screen.getByRole("button", { name: "← Back to Lessons" }));

    for (const lesson of lessons) {
      expect(screen.getByRole("button", { name: new RegExp(lesson.title) })).toBeInTheDocument();
    }
    expect(screen.queryByText(activeListening.passage[0])).not.toBeInTheDocument();
  });
});
