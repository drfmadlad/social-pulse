import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../App";
import { resetHistoryStoreForTests } from "../history/historyStore";
import { lessons } from "./lessons";
import { markLessonFinished } from "./lessonProgressStore";

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

  it("shows a done mark at the end of a finished Lesson's row, and none on an unfinished one", async () => {
    await markLessonFinished(lessons[0].id);
    renderAt("/lessons");

    const finishedRow = screen.getByRole("link", { name: new RegExp(lessons[0].title) });
    expect(await within(finishedRow).findByText("Done")).toBeInTheDocument();

    const unfinishedRow = screen.getByRole("link", { name: new RegExp(lessons[1].title) });
    expect(within(unfinishedRow).queryByText("Done")).not.toBeInTheDocument();
  });

  it("highlights the next unfinished Lesson's row, and stops once every Lesson is finished", async () => {
    renderAt("/lessons");

    const firstRow = screen.getByRole("link", { name: new RegExp(lessons[0].title) });
    expect(firstRow).toHaveClass("lesson-list__row--up-next");
    expect(within(firstRow).getByText("Up next")).toBeInTheDocument();
    for (const lesson of lessons.slice(1)) {
      expect(screen.getByRole("link", { name: new RegExp(lesson.title) })).not.toHaveClass(
        "lesson-list__row--up-next",
      );
    }

    for (const lesson of lessons) {
      await markLessonFinished(lesson.id);
    }

    await waitFor(() => {
      for (const lesson of lessons) {
        expect(screen.getByRole("link", { name: new RegExp(lesson.title) })).not.toHaveClass(
          "lesson-list__row--up-next",
        );
      }
    });
  });

  it("refreshes an open Lessons list when a Lesson is finished elsewhere", async () => {
    renderAt("/lessons");
    const row = screen.getByRole("link", { name: new RegExp(lessons[0].title) });
    expect(within(row).queryByText("Done")).not.toBeInTheDocument();

    await markLessonFinished(lessons[0].id);

    expect(await within(row).findByText("Done")).toBeInTheDocument();
  });

  it("keeps done marks after remounting the Lessons list, as after closing and reopening the app", async () => {
    await markLessonFinished(lessons[0].id);
    const { unmount } = renderAt("/lessons");
    await screen.findByText("Done");
    unmount();

    renderAt("/lessons");

    const row = await screen.findByRole("link", { name: new RegExp(lessons[0].title) });
    expect(await within(row).findByText("Done")).toBeInTheDocument();
  });

  it("never shows a count, percentage or total of finished Lessons", async () => {
    for (const lesson of lessons) {
      await markLessonFinished(lesson.id);
    }
    renderAt("/lessons");

    await screen.findAllByText("Done");
    const tally = /\d+\s*(of|out of|\/)\s*\d+|%|\bscore\b/i;
    expect(document.body.textContent).not.toMatch(tally);
  });
});
