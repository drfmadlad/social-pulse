import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { expectSaneHeadingHierarchy } from "./test/headingStructure";

const thrown = new Error("boom: secret stack detail");

function Crash(): never {
  throw thrown;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  vi.unstubAllGlobals();
});

describe("AppErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(
      <AppErrorBoundary>
        <p>All fine</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("All fine")).toBeInTheDocument();
  });

  it("shows a router-free fallback with a reload button, and keeps the error's text off the screen", () => {
    const { container } = render(
      <AppErrorBoundary>
        <Crash />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent("boom");
    expectSaneHeadingHierarchy(container);
    expect(consoleError.mock.calls.some((args) => args.includes(thrown))).toBe(true);
  });

  it("reloads the page from the Reload button", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    render(
      <AppErrorBoundary>
        <Crash />
      </AppErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(reload).toHaveBeenCalledOnce();
  });
});
