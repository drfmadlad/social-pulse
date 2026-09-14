import { describe, expect, it } from "vitest";
import { findNextUnfinishedLesson } from "./findNextUnfinishedLesson";
import type { Lesson } from "./lessons";

function stubLesson(id: string): Lesson {
  return { id, title: id, summary: "", steps: [], isPlaceholder: false };
}

const lessons = [stubLesson("a"), stubLesson("b"), stubLesson("c")];

describe("findNextUnfinishedLesson", () => {
  it("returns the first unfinished Lesson in list order", () => {
    expect(findNextUnfinishedLesson(lessons, new Set())).toEqual(lessons[0]);
    expect(findNextUnfinishedLesson(lessons, new Set(["a"]))).toEqual(lessons[1]);
  });

  it("skips the excluded Lesson even when it isn't finished", () => {
    expect(findNextUnfinishedLesson(lessons, new Set(), "a")).toEqual(lessons[1]);
  });

  it("skips finished Lessons ahead of an unfinished one", () => {
    expect(findNextUnfinishedLesson(lessons, new Set(["a", "b"]))).toEqual(lessons[2]);
  });

  it("returns undefined when every Lesson is finished or excluded", () => {
    expect(findNextUnfinishedLesson(lessons, new Set(["a", "b", "c"]))).toBeUndefined();
    expect(findNextUnfinishedLesson(lessons, new Set(["b", "c"]), "a")).toBeUndefined();
  });
});
