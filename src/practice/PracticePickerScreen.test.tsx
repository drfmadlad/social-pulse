import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { goOffline, goOnline, PRACTICE_OFFLINE_NOTICE, startOffline } from "../test/connection";
import { scenarioCategories } from "./scenarioCategories";
import { PracticePickerScreen } from "./PracticePickerScreen";

/** The picker at /practice, with a stand-in Scenario brief so a test can tell whether a card opened one. */
function renderPicker() {
  return render(
    <MemoryRouter initialEntries={["/practice"]}>
      <Routes>
        <Route path="/practice" element={<PracticePickerScreen />} />
        <Route path="/practice/:categoryId" element={<p>Scenario brief opened</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function categoryCard(name: string) {
  return screen.getByRole("link", { name: new RegExp(`^${name}`) });
}

describe("PracticePickerScreen", () => {
  it("shows each Scenario Category's persona and setting, linking to its own Scenario brief", () => {
    renderPicker();

    expect(scenarioCategories).toHaveLength(6);
    for (const category of scenarioCategories) {
      const link = categoryCard(category.name);
      expect(link).toHaveAttribute("href", `/practice/${category.id}`);
      expect(link).toHaveTextContent(category.personaName);
      expect(link).toHaveTextContent(category.blurb);
    }
  });

  it("ends with Your own, a seventh card for Own Scenarios (issue #67), opening its brief", () => {
    renderPicker();

    const cards = screen.getAllByRole("link").filter((link) => link.className.includes("scenario-list__card"));
    expect(cards).toHaveLength(7);
    expect(cards[6]).toHaveTextContent("Your own");
    expect(cards[6]).toHaveTextContent("a situation you write yourself");
    expect(cards[6]).toHaveAttribute("href", "/practice/own");

    fireEvent.click(cards[6]);

    expect(screen.getByText("Scenario brief opened")).toBeInTheDocument();
  });

  it("opens a category's Scenario brief when its card is tapped", () => {
    renderPicker();

    fireEvent.click(categoryCard("Dating"));

    expect(screen.getByText("Scenario brief opened")).toBeInTheDocument();
  });

  it("names Home as the back destination", () => {
    renderPicker();

    expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
  });

  it("says nothing about the connection while online", () => {
    renderPicker();

    expect(screen.queryByText(PRACTICE_OFFLINE_NOTICE)).not.toBeInTheDocument();
  });

  describe("offline", () => {
    it("says Practice needs a connection, in a polite status region", () => {
      startOffline();
      renderPicker();

      expect(screen.getByRole("status")).toHaveTextContent(PRACTICE_OFFLINE_NOTICE);
    });

    it("keeps every category visible but unavailable, and reachable by keyboard so a screen reader hears why", () => {
      startOffline();
      renderPicker();

      for (const category of scenarioCategories) {
        const card = categoryCard(category.name);
        expect(card).not.toHaveAttribute("href");
        expect(card).toHaveAttribute("aria-disabled", "true");
        expect(card).toHaveAccessibleDescription(PRACTICE_OFFLINE_NOTICE);
        expect(card).toHaveTextContent(category.personaName);

        card.focus();
        expect(card).toHaveFocus();
      }
    });

    it("treats Your own like a category: it can't start a Conversation, so its card is unavailable too", () => {
      startOffline();
      renderPicker();

      const card = categoryCard("Your own");
      expect(card).not.toHaveAttribute("href");
      expect(card).toHaveAttribute("aria-disabled", "true");
      expect(card).toHaveAccessibleDescription(PRACTICE_OFFLINE_NOTICE);

      fireEvent.click(card);
      expect(screen.queryByText("Scenario brief opened")).not.toBeInTheDocument();
    });

    it("doesn't open a Scenario brief when a category is tapped", () => {
      startOffline();
      renderPicker();

      fireEvent.click(categoryCard("Dating"));

      expect(screen.queryByText("Scenario brief opened")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Practice" })).toBeInTheDocument();
    });

    it("still offers the way back Home", () => {
      startOffline();
      renderPicker();

      expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
    });
  });

  it("shows the notice as soon as the connection drops, and lets Practice start again once it's back, without a reload", () => {
    renderPicker();
    expect(categoryCard("Dating")).toHaveAttribute("href", "/practice/dating");

    act(() => goOffline());
    expect(screen.getByRole("status")).toHaveTextContent(PRACTICE_OFFLINE_NOTICE);
    expect(categoryCard("Dating")).not.toHaveAttribute("href");

    act(() => goOnline());
    expect(screen.queryByText(PRACTICE_OFFLINE_NOTICE)).not.toBeInTheDocument();
    expect(categoryCard("Dating")).toHaveAttribute("href", "/practice/dating");
    expect(categoryCard("Dating")).not.toHaveAttribute("aria-disabled");
    expect(categoryCard("Dating")).not.toHaveAccessibleDescription();

    fireEvent.click(categoryCard("Dating"));
    expect(screen.getByText("Scenario brief opened")).toBeInTheDocument();
  });

  it("keeps a keyboard user's focus on their card as the connection drops and returns", () => {
    renderPicker();
    const card = categoryCard("Small Talk");
    card.focus();

    act(() => goOffline());
    expect(categoryCard("Small Talk")).toBe(card);
    expect(card).toHaveFocus();

    act(() => goOnline());
    expect(categoryCard("Small Talk")).toBe(card);
    expect(card).toHaveFocus();
  });
});
