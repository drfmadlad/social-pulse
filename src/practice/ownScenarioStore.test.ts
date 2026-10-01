import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "../db";
import {
  deleteOwnScenario,
  getAllOwnScenarios,
  getOwnScenario,
  saveOwnScenario,
  subscribeToOwnScenarioChanges,
} from "./ownScenarioStore";

afterEach(async () => {
  vi.useRealTimers();
  await resetDbForTests();
});

const dana = { name: "Dana", about: "my manager", situation: "Asking for a raise." };

describe("ownScenarioStore", () => {
  it("saves an Own Scenario on-device and reads it back, trimmed", async () => {
    const saved = await saveOwnScenario({ name: " Dana ", about: " my manager ", situation: " Asking for a raise.\n" });

    expect(saved).toMatchObject(dana);
    expect(await getOwnScenario(saved.id)).toEqual(saved);
    expect(await getAllOwnScenarios()).toEqual([saved]);
  });

  it("lists the newest first", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const older = await saveOwnScenario(dana);
    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    const newer = await saveOwnScenario({ ...dana, name: "Sam" });

    expect((await getAllOwnScenarios()).map((own) => own.id)).toEqual([newer.id, older.id]);
  });

  it("edits one in place, keeping its id and its place in the list", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    const first = await saveOwnScenario(dana);
    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    const second = await saveOwnScenario({ ...dana, name: "Sam" });

    const edited = await saveOwnScenario({ ...dana, situation: "Asking for Friday off." }, first.id);

    expect(edited).toMatchObject({ id: first.id, createdAt: first.createdAt, situation: "Asking for Friday off." });
    expect((await getAllOwnScenarios()).map((own) => own.id)).toEqual([second.id, first.id]);
  });

  it("deletes one, and nothing else", async () => {
    const keep = await saveOwnScenario(dana);
    const gone = await saveOwnScenario({ ...dana, name: "Sam" });

    await deleteOwnScenario(gone.id);

    expect(await getOwnScenario(gone.id)).toBeUndefined();
    expect(await getAllOwnScenarios()).toEqual([keep]);
    await expect(deleteOwnScenario("never-saved")).resolves.toBeUndefined();
  });

  it("tells subscribers when one is saved or deleted", async () => {
    const changed = vi.fn();
    const unsubscribe = subscribeToOwnScenarioChanges(changed);

    const saved = await saveOwnScenario(dana);
    await deleteOwnScenario(saved.id);
    unsubscribe();
    await saveOwnScenario(dana);

    expect(changed).toHaveBeenCalledTimes(2);
  });
});
