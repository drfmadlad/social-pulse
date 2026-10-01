import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocationDisplay } from "../test/LocationDisplay";
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
});
