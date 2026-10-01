import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_CONVERSATION_MESSAGES } from "../requestLimits";
import type { ChatMessage } from "./aiProxyClient";
import { newConversationStart, openConversationSlot, startTokenOf } from "./inProgressConversation";

const TURNS: ChatMessage[] = [
  { role: "assistant", content: "Hey!" },
  { role: "user", content: "Hi." },
  { role: "assistant", content: "Nice to meet you." },
];

const identity = { scenarioKey: "dating/coffee-first-date", focusId: null, startToken: null };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("openConversationSlot (issue #68)", () => {
  it("has nothing to restore when nothing was saved", () => {
    expect(openConversationSlot(identity).restoredTurns).toBeNull();
  });

  it("restores what an earlier slot saved, turn for turn", () => {
    openConversationSlot(identity).save(TURNS);

    expect(openConversationSlot(identity).restoredTurns).toEqual(TURNS);
  });

  it("keeps one copy per Scenario, and each Scenario's own", () => {
    openConversationSlot(identity).save(TURNS);

    expect(openConversationSlot({ ...identity, scenarioKey: "dating/trivia-night" }).restoredTurns).toBeNull();
  });

  it("keeps the latest save, not the first", () => {
    const slot = openConversationSlot(identity);
    slot.save(TURNS.slice(0, 2));
    slot.save(TURNS);

    expect(openConversationSlot(identity).restoredTurns).toEqual(TURNS);
  });

  it("keeps a transcript shorter than before after a Rewind took turns back", () => {
    const slot = openConversationSlot(identity);
    slot.save([...TURNS, { role: "user", content: "A line to take back." }, { role: "assistant", content: "Gone." }]);
    slot.save(TURNS);

    expect(openConversationSlot(identity).restoredTurns).toEqual(TURNS);
  });

  it("restores only for the same Focus", () => {
    openConversationSlot({ ...identity, focusId: "staying-calm" }).save(TURNS);

    expect(openConversationSlot({ ...identity, focusId: "staying-calm" }).restoredTurns).toEqual(TURNS);
    expect(openConversationSlot(identity).restoredTurns).toBeNull();
    expect(openConversationSlot({ ...identity, focusId: "wrapping-up" }).restoredTurns).toBeNull();
  });

  describe("with a deliberate start", () => {
    it("restores a copy that start began, which is what a reload of it is", () => {
      openConversationSlot({ ...identity, startToken: "a" }).save(TURNS);

      expect(openConversationSlot({ ...identity, startToken: "a" }).restoredTurns).toEqual(TURNS);
    });

    it("doesn't restore a copy another start began, and drops it once the new conversation is open", () => {
      openConversationSlot({ ...identity, startToken: "a" }).save(TURNS);

      const slot = openConversationSlot({ ...identity, startToken: "b" });
      expect(slot.restoredTurns).toBeNull();
      slot.dropStale();

      expect(openConversationSlot(identity).restoredTurns).toBeNull();
    });

    it("doesn't restore a copy that no start began either", () => {
      openConversationSlot(identity).save(TURNS);

      expect(openConversationSlot({ ...identity, startToken: "b" }).restoredTurns).toBeNull();
    });

    it("keeps the start that began a copy when a bookmarked URL carries it on", () => {
      openConversationSlot({ ...identity, startToken: "a" }).save(TURNS.slice(0, 2));
      openConversationSlot(identity).save(TURNS);

      expect(openConversationSlot({ ...identity, startToken: "a" }).restoredTurns).toEqual(TURNS);
    });
  });

  it("doesn't drop the copy it restored", () => {
    openConversationSlot(identity).save(TURNS);

    openConversationSlot(identity).dropStale();

    expect(openConversationSlot(identity).restoredTurns).toEqual(TURNS);
  });

  it("discards for good: the copy is gone and a late save can't bring it back", () => {
    const slot = openConversationSlot(identity);
    slot.save(TURNS);

    slot.discard();
    slot.save(TURNS);

    expect(openConversationSlot(identity).restoredTurns).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  describe("distrusts what's on the device", () => {
    function store(value: unknown) {
      openConversationSlot(identity).save(TURNS);
      window.localStorage.setItem(window.localStorage.key(0)!, typeof value === "string" ? value : JSON.stringify(value));
    }
    const record = (overrides: Record<string, unknown>) => ({
      version: 1,
      focusId: null,
      startToken: null,
      turns: TURNS,
      ...overrides,
    });

    it.each([
      ["not JSON", "{oops"],
      ["not an object", "42"],
      ["null", "null"],
      ["another version", record({ version: 2 })],
      ["turns that aren't a list", record({ turns: "hello" })],
      ["a turn that isn't a message", record({ turns: [{ role: "user", content: 5 }] })],
      ["a turn with an unknown role", record({ turns: [{ role: "robot", content: "Beep." }] })],
      ["turns the user never spoke in", record({ turns: [{ role: "assistant", content: "Hey!" }] })],
      ["more turns than a conversation can hold", record({ turns: Array.from({ length: MAX_CONVERSATION_MESSAGES + 1 }, () => TURNS[1]) })],
    ])("restores nothing from %s", (_name, stored) => {
      store(stored);

      expect(openConversationSlot(identity).restoredTurns).toBeNull();
    });
  });

  describe("when the device can't save", () => {
    it("carries on when writing fails", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Full.", "QuotaExceededError");
      });

      expect(() => openConversationSlot(identity).save(TURNS)).not.toThrow();
    });

    it("opens, drops and discards without throwing when storage can't be reached", () => {
      vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
        throw new DOMException("Blocked.", "SecurityError");
      });

      const slot = openConversationSlot(identity);
      expect(slot.restoredTurns).toBeNull();
      expect(() => {
        slot.dropStale();
        slot.save(TURNS);
        slot.discard();
      }).not.toThrow();
    });
  });
});

describe("a conversation's start token", () => {
  it("is different every time", () => {
    expect(newConversationStart().conversationStart).not.toBe(newConversationStart().conversationStart);
  });

  it("reads back from the navigation state", () => {
    expect(startTokenOf(newConversationStart())).toEqual(expect.any(String));
  });

  it.each([undefined, null, "a string", 3, {}, { conversationStart: 4 }])("is absent from %j", (state) => {
    expect(startTokenOf(state)).toBeNull();
  });
});
