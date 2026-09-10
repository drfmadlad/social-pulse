import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders a single scrollable home feed with Lessons, Practice, and History sections in order", () => {
    render(<App />);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Lessons",
      "Practice",
      "History",
    ]);
  });

  it("does not render tab navigation", () => {
    render(<App />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
