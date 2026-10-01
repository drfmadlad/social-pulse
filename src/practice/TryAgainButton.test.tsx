import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockReply } from "../test/apiMocks";
import { LocationDisplay } from "../test/LocationDisplay";
import { ConversationScreen } from "./ConversationScreen";
import { defaultScenarioOf } from "./scenarios";
import { TryAgainButton, type FinishedConversation } from "./TryAgainButton";

const TRY_AGAIN = "Try again in a new conversation";

function renderFor(conversation: FinishedConversation) {
  return render(
    <MemoryRouter initialEntries={["/somewhere"]}>
      <LocationDisplay />
      <Routes>
        <Route path="/somewhere" element={<TryAgainButton conversation={conversation} />} />
        <Route path="/practice/:categoryId/:scenarioId" element={<div>Conversation stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Taps Try again and returns the URL it lands on. */
function tryAgainFrom(conversation: FinishedConversation) {
  renderFor(conversation);
  fireEvent.click(screen.getByRole("button", { name: TRY_AGAIN }));
  expect(screen.getByText("Conversation stub")).toBeInTheDocument();
  return screen.getByTestId("location").textContent;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TryAgainButton (issue #66)", () => {
  it("reads Try again, and names what it starts for a screen reader", () => {
    renderFor({ categoryId: "dating", scenarioId: "coffee-first-date" });

    expect(screen.getByRole("button", { name: TRY_AGAIN })).toHaveTextContent(/^Try again$/);
  });

  it("starts a conversation in the same Scenario, skipping the brief", () => {
    expect(tryAgainFrom({ categoryId: "dating", scenarioId: "coffee-first-date" })).toBe(
      "/practice/dating/coffee-first-date",
    );
  });

  it("keeps the Focus", () => {
    expect(tryAgainFrom({ categoryId: "dating", scenarioId: "coffee-first-date", focusId: "staying-calm" })).toBe(
      "/practice/dating/coffee-first-date?focus=staying-calm",
    );
  });

  it("tries an entry saved before Scenarios existed again in its category's default Scenario", () => {
    expect(tryAgainFrom({ categoryId: "small-talk" })).toBe(`/practice/small-talk/${defaultScenarioOf("small-talk")!.id}`);
  });

  it("tries an entry naming a Scenario since removed again in its category's default Scenario", () => {
    expect(tryAgainFrom({ categoryId: "networking", scenarioId: "a-scenario-since-removed" })).toBe(
      `/practice/networking/${defaultScenarioOf("networking")!.id}`,
    );
  });

  it("tries again without a Focus when the entry's Focus is no longer offered", () => {
    expect(
      tryAgainFrom({ categoryId: "dating", scenarioId: "coffee-first-date", focusId: "a-focus-since-removed" }),
    ).toBe("/practice/dating/coffee-first-date");
  });

  it("isn't offered for a Scenario Category the app no longer has, since there's nothing to start", () => {
    renderFor({ categoryId: "a-category-since-removed", scenarioId: "coffee-first-date" });

    expect(screen.queryByRole("button", { name: TRY_AGAIN })).not.toBeInTheDocument();
  });

  describe("a fresh start, not a reload (issue #68)", () => {
    const PATH = "/practice/dating/coffee-first-date";

    function renderRouter(initialEntry: string, element: ReactNode = <ConversationScreen />) {
      const router = createMemoryRouter(
        [
          { path: "/feedback", element },
          { path: "/practice/:categoryId/:scenarioId", element: <ConversationScreen /> },
        ],
        { initialEntries: [initialEntry] },
      );
      return { router, ...render(<RouterProvider router={router} />) };
    }

    it("carries a different start with each tap, so no two starts look alike", () => {
      const starts = [1, 2].map(() => {
        const { router, unmount } = renderRouter(
          "/feedback",
          <TryAgainButton conversation={{ categoryId: "dating", scenarioId: "coffee-first-date" }} />,
        );
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockReply("Hello.")));
        fireEvent.click(screen.getByRole("button", { name: TRY_AGAIN }));
        const { conversationStart } = router.state.location.state as { conversationStart: string };
        unmount();
        return conversationStart;
      });

      expect(starts[0]).toEqual(expect.any(String));
      expect(starts[1]).not.toBe(starts[0]);
    });

    it("opens a new transcript in the Scenario even though a conversation there is still in progress", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(mockReply("Old opening.")).mockResolvedValueOnce(mockReply("Old reply.")),
      );
      const old = renderRouter(PATH);
      await screen.findByText("Old opening.");
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi there" } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
      await screen.findByText("Old reply.");
      // The conversation is left in progress (the app went away), and Try again is tapped afterwards.
      old.unmount();

      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Fresh opening.")));
      renderRouter("/feedback", <TryAgainButton conversation={{ categoryId: "dating", scenarioId: "coffee-first-date" }} />);
      fireEvent.click(screen.getByRole("button", { name: TRY_AGAIN }));

      expect(await screen.findByText("Fresh opening.")).toBeInTheDocument();
      expect(screen.queryByText("Old reply.")).not.toBeInTheDocument();
      expect(screen.queryByText("Hi there")).not.toBeInTheDocument();
    });
  });
});
