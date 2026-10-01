import { afterEach, describe, expect, it, vi } from "vitest";
import { LESSON_POSITION_STORE, openDb, resetDbForTests } from "../db";
import { clearLessonPosition, getLessonPosition, saveLessonPosition } from "./lessonPositionStore";

afterEach(async () => {
  vi.restoreAllMocks();
  await resetDbForTests();
});

describe("lessonPositionStore", () => {
  it("keeps the step a Lesson was left on, for the next read", async () => {
    saveLessonPosition("active-listening", 4);

    expect(await getLessonPosition("active-listening", 20)).toBe(4);
  });

  it("keeps each Lesson's position apart, and the latest one for a Lesson", async () => {
    saveLessonPosition("active-listening", 4);
    saveLessonPosition("active-listening", 5);
    saveLessonPosition("open-questions", 2);

    expect(await getLessonPosition("active-listening", 20)).toBe(5);
    expect(await getLessonPosition("open-questions", 20)).toBe(2);
  });

  it("has nothing to offer for a Lesson that was never left partway", async () => {
    expect(await getLessonPosition("active-listening", 20)).toBeNull();
  });

  it("forgets a position when it's cleared, or when the Lesson is back on step 1", async () => {
    saveLessonPosition("active-listening", 4);
    clearLessonPosition("active-listening");
    expect(await getLessonPosition("active-listening", 20)).toBeNull();

    saveLessonPosition("active-listening", 4);
    saveLessonPosition("active-listening", 0);
    expect(await getLessonPosition("active-listening", 20)).toBeNull();
  });

  it("applies writes in the order they were sent, so a clear sent after a save wins", async () => {
    saveLessonPosition("active-listening", 19);
    clearLessonPosition("active-listening");
    saveLessonPosition("open-questions", 3);
    clearLessonPosition("open-questions");

    expect(await getLessonPosition("active-listening", 20)).toBeNull();
    expect(await getLessonPosition("open-questions", 20)).toBeNull();
  });

  it("ignores a kept position that is past the end of a Lesson that has since got shorter", async () => {
    saveLessonPosition("active-listening", 15);

    expect(await getLessonPosition("active-listening", 10)).toBeNull();
  });

  it("keeps only the step number, nothing about answers", async () => {
    saveLessonPosition("active-listening", 4);
    await getLessonPosition("active-listening", 20);

    const db = await openDb();
    const entries = await new Promise((resolve, reject) => {
      const request = db.transaction(LESSON_POSITION_STORE, "readonly").objectStore(LESSON_POSITION_STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();

    expect(entries).toEqual([{ lessonId: "active-listening", stepIndex: 4 }]);
  });

  describe("when the device can't store anything", () => {
    it("reads as nothing kept, and saving or clearing never throws", async () => {
      vi.spyOn(indexedDB, "open").mockImplementation(() => {
        throw new Error("storage is unavailable");
      });

      expect(() => saveLessonPosition("active-listening", 4)).not.toThrow();
      expect(() => clearLessonPosition("active-listening")).not.toThrow();
      expect(await getLessonPosition("active-listening", 20)).toBeNull();
    });

    it("keeps working once storage comes back after a failed write", async () => {
      const open = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
        throw new Error("storage is unavailable");
      });
      saveLessonPosition("active-listening", 4);
      await getLessonPosition("active-listening", 20);
      open.mockRestore();

      saveLessonPosition("active-listening", 6);

      expect(await getLessonPosition("active-listening", 20)).toBe(6);
    });
  });
});
