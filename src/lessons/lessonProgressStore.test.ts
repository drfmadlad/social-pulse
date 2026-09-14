import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "../db";
import { getFinishedLessonIds, markLessonFinished } from "./lessonProgressStore";

afterEach(async () => {
  await resetDbForTests();
});

describe("lessonProgressStore", () => {
  it("marks a Lesson finished", async () => {
    await markLessonFinished("active-listening");

    const finished = await getFinishedLessonIds();

    expect(finished.has("active-listening")).toBe(true);
  });

  it("leaves a Lesson finished when it's finished again", async () => {
    await markLessonFinished("active-listening");
    await markLessonFinished("active-listening");

    const finished = await getFinishedLessonIds();

    expect(Array.from(finished)).toEqual(["active-listening"]);
  });

  it("survives being read back from a fresh database connection, as after a page reload", async () => {
    await markLessonFinished("active-listening");

    const finished = await getFinishedLessonIds();

    expect(finished.has("active-listening")).toBe(true);
  });

  it("does not make any network call while persisting", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await markLessonFinished("active-listening");
    await getFinishedLessonIds();

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
