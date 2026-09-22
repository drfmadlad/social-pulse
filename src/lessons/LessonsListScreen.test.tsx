import { act, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AppRoutes } from "../App";
import { resetHistoryStoreForTests } from "../history/historyStore";
import { settleDeviceReads } from "../test/settleDeviceReads";
import { lessons } from "./lessons";
import { markLessonFinished } from "./lessonProgressStore";

async function renderAt(path: string) {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
  await settleDeviceReads();
  return view;
}

afterEach(async () => {
  await resetHistoryStoreForTests();
});

describe("LessonsListScreen", () => {
  it("links to every Lesson's own URL", async () => {
    await renderAt("/lessons");

    for (const lesson of lessons) {
      const link = screen.getByRole("link", { name: new RegExp(lesson.title) });
      expect(link).toHaveAttribute("href", `/lessons/${lesson.id}`);
    }
  });

  it("marks stub Lesson content as a placeholder", async () => {
    await renderAt("/lessons");

    expect(lessons.some((lesson) => lesson.isPlaceholder)).toBe(true);
    expect(screen.getAllByText("Draft")).toHaveLength(lessons.filter((lesson) => lesson.isPlaceholder).length);
  });

  it("names Home as the back destination", async () => {
    await renderAt("/lessons");

    expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
  });

  it("shows a done mark at the end of a finished Lesson's row, and none on an unfinished one", async () => {
    await markLessonFinished(lessons[0].id);
    await renderAt("/lessons");

    const finishedRow = screen.getByRole("link", { name: new RegExp(lessons[0].title) });
    expect(await within(finishedRow).findByText("Done")).toBeInTheDocument();

    const unfinishedRow = screen.getByRole("link", { name: new RegExp(lessons[1].title) });
    expect(within(unfinishedRow).queryByText("Done")).not.toBeInTheDocument();
  });

  it("highlights the next unfinished Lesson's row, and stops once every Lesson is finished", async () => {
    await renderAt("/lessons");

    const firstRow = screen.getByRole("link", { name: new RegExp(lessons[0].title) });
    expect(firstRow).toHaveClass("lesson-list__row--up-next");
    expect(within(firstRow).getByText("Up next")).toBeInTheDocument();
    for (const lesson of lessons.slice(1)) {
      expect(screen.getByRole("link", { name: new RegExp(lesson.title) })).not.toHaveClass(
        "lesson-list__row--up-next",
      );
    }

    // Finishing Lessons straight through the store, rather than through the UI, refreshes the
    // mounted list from outside React — act() is what puts those updates back inside it.
    await act(async () => {
      for (const lesson of lessons) {
        await markLessonFinished(lesson.id);
      }
    });

    await waitFor(() => {
      for (const lesson of lessons) {
        expect(screen.getByRole("link", { name: new RegExp(lesson.title) })).not.toHaveClass(
          "lesson-list__row--up-next",
        );
      }
    });
    // waitFor stops at the first Lesson that satisfies it; the rest of the list's refreshes are
    // still in flight, and belong to this test rather than the next one.
    await settleDeviceReads();
  });

  it("refreshes an open Lessons list when a Lesson is finished elsewhere", async () => {
    await renderAt("/lessons");
    const row = screen.getByRole("link", { name: new RegExp(lessons[0].title) });
    expect(within(row).queryByText("Done")).not.toBeInTheDocument();

    await markLessonFinished(lessons[0].id);

    expect(await within(row).findByText("Done")).toBeInTheDocument();
  });

  it("keeps done marks after remounting the Lessons list, as after closing and reopening the app", async () => {
    await markLessonFinished(lessons[0].id);
    const { unmount } = await renderAt("/lessons");
    await screen.findByText("Done");
    unmount();

    await renderAt("/lessons");

    const row = await screen.findByRole("link", { name: new RegExp(lessons[0].title) });
    expect(await within(row).findByText("Done")).toBeInTheDocument();
  });

  it("never shows a count, percentage or total of finished Lessons", async () => {
    for (const lesson of lessons) {
      await markLessonFinished(lesson.id);
    }
    await renderAt("/lessons");

    await screen.findAllByText("Done");
    const tally = /\d+\s*(of|out of|\/)\s*\d+|%|\bscore\b/i;
    expect(document.body.textContent).not.toMatch(tally);
  });
});
