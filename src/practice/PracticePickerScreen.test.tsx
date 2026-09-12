import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { scenarioCategories } from "./scenarioCategories";
import { PracticePickerScreen } from "./PracticePickerScreen";

describe("PracticePickerScreen", () => {
  it("links to every Scenario Category's own Conversation URL", () => {
    render(
      <MemoryRouter>
        <PracticePickerScreen />
      </MemoryRouter>,
    );

    expect(scenarioCategories).toHaveLength(6);
    for (const category of scenarioCategories) {
      const link = screen.getByRole("link", { name: category.name });
      expect(link).toHaveAttribute("href", `/practice/${category.id}`);
    }
  });

  it("names Home as the back destination", () => {
    render(
      <MemoryRouter>
        <PracticePickerScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
  });
});
