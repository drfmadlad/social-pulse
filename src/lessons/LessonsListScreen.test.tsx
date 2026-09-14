import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../App";
import { resetHistoryStoreForTests } from "../history/historyStore";
import { lessons } from "./lessons";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

afterEach(async () => {
  await resetHistoryStoreForTests();
});

describe("LessonsListScreen", () => {
  it("links to every Lesson's own URL", () => {
    renderAt("/lessons");

    for (const lesson of lessons) {
      const link = screen.getByRole("link", { name: new RegExp(lesson.title) });
      expect(link).toHaveAttribute("href", `/lessons/${lesson.id}`);
    }
  });

  it("marks stub Lesson content as a placeholder", () => {
    renderAt("/lessons");

    expect(lessons.some((lesson) => lesson.isPlaceholder)).toBe(true);
    expect(screen.getAllByText("Draft")).toHaveLength(lessons.filter((lesson) => lesson.isPlaceholder).length);
  });

  it("names Home as the back destination", () => {
    renderAt("/lessons");

    expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
  });
});
