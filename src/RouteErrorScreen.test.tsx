import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppRouteObjects } from "./App";
import { resetHistoryStoreForTests, saveEndedConversation } from "./history/historyStore";
import { scenarioCategories } from "./practice/scenarioCategories";
import { expectSaneHeadingHierarchy } from "./test/headingStructure";
import { clickToScreen, settleDeviceReads } from "./test/settleDeviceReads";

const crash = vi.hoisted(() => ({
  error: new Error("boom: secret stack detail"),
  lessons: true,
  conversation: false,
  shell: false,
}));

// The Lessons list stands in for any ordinary screen that throws while rendering.
vi.mock("./lessons/LessonsListScreen", async (importOriginal) => {
  const original = await importOriginal<typeof import("./lessons/LessonsListScreen")>();
  return {
    LessonsListScreen: () => {
      if (crash.lessons) throw crash.error;
      return <original.LessonsListScreen />;
    },
  };
});

// Conversation is position:fixed and animates itself rather than sitting in a ScreenTransition,
// so it's a separate case from the wrapped screens.
vi.mock("./practice/ConversationScreen", () => ({
  ConversationScreen: () => {
    if (crash.conversation) throw crash.error;
    return null;
  },
}));

// The app shell is the parent of every screen, so a throw here is the widest one a route can see.
vi.mock("./ScreenTransition", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ScreenTransition")>();
  return {
    ...original,
    ScreenDirectionProvider: (props: { children: ReactNode }) => {
      if (crash.shell) throw crash.error;
      return <original.ScreenDirectionProvider {...props} />;
    },
  };
});

async function renderApp(initialPath: string) {
  const router = createMemoryRouter(
    [{ id: "route-error-test-root", element: <Outlet />, children: createAppRouteObjects() }],
    { initialEntries: [initialPath] },
  );
  const view = render(<RouterProvider router={router} />);
  await settleDeviceReads();
  return view;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  crash.lessons = true;
  crash.conversation = false;
  crash.shell = false;
  // React and React Router both log a caught render error; that's the console half of the
  // contract, asserted on below, and would otherwise be noise in every run.
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  consoleError.mockRestore();
  await resetHistoryStoreForTests();
});

describe("a render error", () => {
  it("shows a calm screen with a way back to Home instead of a blank page", async () => {
    const { container } = await renderApp("/lessons");

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
    expectSaneHeadingHierarchy(container);
  });

  it("keeps the error's text off the screen but still logs it to the console", async () => {
    const { container } = await renderApp("/lessons");

    expect(container).not.toHaveTextContent("boom");
    expect(container).not.toHaveTextContent("secret stack detail");
    expect(consoleError.mock.calls.some((args) => args.includes(crash.error))).toBe(true);
  });

  it("is caught on the position:fixed Conversation screen too", async () => {
    crash.lessons = false;
    crash.conversation = true;
    const { container } = await renderApp("/practice/dating");

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
    expect(container).not.toHaveTextContent("boom");
  });

  it("is caught when the app shell itself throws", async () => {
    crash.lessons = false;
    crash.shell = true;
    const { container } = await renderApp("/history");

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
    expect(container).not.toHaveTextContent("boom");
  });

  it("says saved conversations are safe without claiming an unfinished one was", async () => {
    await renderApp("/lessons");

    expect(screen.getByText(/already finished is still saved in History/)).toBeInTheDocument();
  });

  it("gets the user back to Home, with saved History untouched and readable", async () => {
    const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
    await saveEndedConversation({
      id: "entry-1",
      category,
      transcript: [{ role: "user", content: "Hi, nice to meet you!" }],
    });
    await renderApp("/lessons");

    crash.lessons = false;
    await clickToScreen(screen.getByRole("link", { name: "Go to Home" }));
    expect(screen.getByRole("heading", { level: 1, name: "Social Pulse" })).toBeInTheDocument();

    await clickToScreen(screen.getByRole("link", { name: /^History/ }));
    expect(await screen.findByRole("link", { name: /Dating/ })).toBeInTheDocument();
  });
});
