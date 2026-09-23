import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppRouteObjects } from "./App";
import { AppUpdateOffer } from "./AppUpdateOffer";
import { resetHistoryStoreForTests } from "./history/historyStore";
import { mockReply } from "./test/apiMocks";
import { settleDeviceReads } from "./test/settleDeviceReads";

// The hook's own behaviour (registering, update checks, the tab-safe reload) is in
// useAppUpdate.test.tsx. This drives the note from a fake of what the hook reports.
const fakeUpdate = vi.hoisted(() => ({
  updateWaiting: false,
  applyUpdate: vi.fn(),
  dismiss: vi.fn(),
  setUpdateWaiting: null as ((waiting: boolean) => void) | null,
}));

vi.mock("./useAppUpdate", async () => {
  const { useState } = await import("react");
  return {
    useAppUpdate: () => {
      const [updateWaiting, setUpdateWaiting] = useState(false);
      fakeUpdate.setUpdateWaiting = setUpdateWaiting;
      return {
        updateWaiting,
        applyUpdate: fakeUpdate.applyUpdate,
        dismiss: () => {
          fakeUpdate.dismiss();
          setUpdateWaiting(false);
        },
      };
    },
  };
});

function renderAt(path: string) {
  const router = createMemoryRouter(
    [{ id: "update-offer-test-root", element: <><AppUpdateOffer /><Outlet /></>, children: [{ path: "*", element: null }] }],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function waitingUpdate() {
  act(() => fakeUpdate.setUpdateWaiting?.(true));
}

beforeEach(() => {
  fakeUpdate.applyUpdate.mockReset();
  fakeUpdate.dismiss.mockReset();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("AppUpdateOffer", () => {
  it("shows nothing until a new version is waiting", () => {
    renderAt("/");

    expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();
  });

  it("offers the update quietly, in a polite live region rather than a dialog", () => {
    renderAt("/");
    waitingUpdate();

    expect(screen.getByText("A new version is ready.").closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("never applies the update on its own", () => {
    renderAt("/");
    waitingUpdate();

    expect(fakeUpdate.applyUpdate).not.toHaveBeenCalled();
  });

  it("applies the update when Reload is tapped", () => {
    renderAt("/");
    waitingUpdate();

    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(fakeUpdate.applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("leaves the app usable and the offer gone when Not now is tapped", () => {
    const router = renderAt("/");
    waitingUpdate();

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();
    expect(fakeUpdate.applyUpdate).not.toHaveBeenCalled();

    act(() => {
      void router.navigate("/practice");
    });
    expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();
  });

  it.each([
    ["a Practice Conversation", "/practice/dating"],
    ["a Lesson", "/lessons/active-listening"],
  ])("holds the offer back during %s and shows it once the user has left", (_name, path) => {
    const router = renderAt(path);
    waitingUpdate();

    expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();

    act(() => {
      void router.navigate("/");
    });
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("still offers the update on the Feedback Summary, where the conversation is already saved", () => {
    renderAt("/practice/dating/feedback/entry-1");
    waitingUpdate();

    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});

describe("AppUpdateOffer in the app shell", () => {
  async function renderApp(path: string) {
    const router = createMemoryRouter(
      [{ id: "app-update-offer-root", element: <Outlet />, children: createAppRouteObjects() }],
      { initialEntries: [path] },
    );
    render(<RouterProvider router={router} />);
    await settleDeviceReads();
    return router;
  }

  it("offers the update on Home without adding to its five elements", async () => {
    await renderApp("/");
    waitingUpdate();

    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Social Pulse" })).toBeInTheDocument();
  });

  it("holds the offer back during a Practice Conversation in the real app and shows it after leaving", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you.")));
    const router = await renderApp("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    waitingUpdate();

    expect(screen.queryByRole("button", { name: "Reload" })).not.toBeInTheDocument();
    expect(fakeUpdate.applyUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));
    await settleDeviceReads();

    expect(router.state.location.pathname).toBe("/practice");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
