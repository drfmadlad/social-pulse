import { describe, expect, it } from "vitest";
import { lessons } from "./lessons";
import { pickTodaysLesson } from "./pickTodaysLesson";

describe("pickTodaysLesson", () => {
  it("returns one of the real Lessons", () => {
    const today = pickTodaysLesson(lessons, new Date("2026-03-05T09:00:00Z"));

    expect(lessons).toContainEqual(today);
  });

  it("is deterministic for a given day", () => {
    const morning = pickTodaysLesson(lessons, new Date("2026-03-05T01:00:00Z"));
    const night = pickTodaysLesson(lessons, new Date("2026-03-05T23:00:00Z"));

    expect(morning.id).toBe(night.id);
  });

  it("changes as the calendar date changes", () => {
    const seen = new Set<string>();
    for (let day = 1; day <= lessons.length; day++) {
      const date = new Date(Date.UTC(2026, 0, day));
      seen.add(pickTodaysLesson(lessons, date).id);
    }

    expect(seen.size).toBeGreaterThan(1);
  });
});
