import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lessons } from "./lessons";
import { LessonDetailScreen } from "./LessonDetailScreen";
import { LessonsListScreen } from "./LessonsListScreen";

function answer(prompt: string, optionText: string) {
  const group = screen.getByRole("group", { name: prompt });
  fireEvent.click(within(group).getByLabelText(optionText));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lessons" element={<LessonsListScreen />} />
        <Route path="/lessons/:lessonId" element={<LessonDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const activeListening = lessons.find((lesson) => lesson.id === "active-listening")!;

describe("LessonsListScreen", () => {
  it("links to every Lesson's own detail URL", () => {
    renderAt("/lessons");

    for (const lesson of lessons) {
      const link = screen.getByRole("link", { name: new RegExp(lesson.title) });
      expect(link).toHaveAttribute("href", `/lessons/${lesson.id}`);
    }
  });

  it("marks stub Lesson content as a placeholder", () => {
    renderAt("/lessons");

    expect(activeListening.isPlaceholder).toBe(true);
    expect(screen.getAllByText("Draft")).toHaveLength(lessons.filter((lesson) => lesson.isPlaceholder).length);
  });

  it("names Home as the back destination", () => {
    renderAt("/lessons");

    expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
  });

  it("shows the Lesson's passage and quiz, and lets the user complete and retake it, when a Lesson is opened", () => {
    renderAt("/lessons");
    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));

    expect(screen.getByRole("heading", { name: new RegExp(`^${activeListening.title}`) })).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    for (const paragraph of activeListening.passage) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }

    const [first, second] = activeListening.quiz;
    expect(screen.getByRole("button", { name: "Check answers" })).toBeDisabled();

    answer(first.prompt, first.options.find((option) => option.id === first.correctOptionId)!.text);
    answer(second.prompt, second.options.find((option) => option.id !== second.correctOptionId)!.text);
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(screen.getByRole("status")).toHaveTextContent(`You got 1 of ${activeListening.quiz.length} correct.`);
    expect(within(screen.getByRole("group", { name: first.prompt })).getByText("Correct")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: second.prompt })).getByText("Not quite")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retake quiz" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check answers" })).toBeDisabled();
  });

  it("browses Lessons and completes a quiz with no network available", () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/lessons");
    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    for (const question of activeListening.quiz) {
      answer(question.prompt, question.options.find((option) => option.id === question.correctOptionId)!.text);
    }
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      `You got ${activeListening.quiz.length} of ${activeListening.quiz.length} correct.`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns to the Lessons list from a Lesson", () => {
    renderAt("/lessons");
    fireEvent.click(screen.getByRole("link", { name: new RegExp(activeListening.title) }));
    fireEvent.click(screen.getByRole("button", { name: "← Lessons" }));

    for (const lesson of lessons) {
      expect(screen.getByRole("link", { name: new RegExp(lesson.title) })).toBeInTheDocument();
    }
  });
});
