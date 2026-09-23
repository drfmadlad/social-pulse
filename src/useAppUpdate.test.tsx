import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppUpdate } from "./useAppUpdate";

// The service worker itself can't run under Vitest, so this stands in for workbox-window's
// `Workbox`: it records what the hook asks of it and lets a test fire the events a real worker
// lifecycle would.
const fake = vi.hoisted(() => {
  type Listener = () => void;
  class FakeWorkbox {
    listeners = new Map<string, Set<Listener>>();
    register = vi.fn().mockResolvedValue(undefined);
    update = vi.fn().mockResolvedValue(undefined);
    messageSkipWaiting = vi.fn();
    constructor(
      public scriptURL: string,
      public options: unknown,
    ) {
      fake.instances.push(this);
    }
    addEventListener(type: string, listener: Listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(listener);
    }
    removeEventListener(type: string, listener: Listener) {
      this.listeners.get(type)?.delete(listener);
    }
    emit(type: string) {
      this.listeners.get(type)?.forEach((listener) => listener());
    }
  }
  const fake = { FakeWorkbox, instances: [] as InstanceType<typeof FakeWorkbox>[] };
  return fake;
});

vi.mock("workbox-window", () => ({ Workbox: fake.FakeWorkbox }));

const reload = vi.fn();

function workbox() {
  return fake.instances[0];
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

async function renderProductionHook() {
  const view = renderHook(() => useAppUpdate());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  fake.instances.length = 0;
  reload.mockReset();
  vi.stubEnv("PROD", true);
  vi.stubGlobal("location", { ...window.location, reload });
  Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

describe("useAppUpdate", () => {
  it("registers the service worker in a production build", async () => {
    await renderProductionHook();

    expect(workbox().scriptURL).toBe("/sw.js");
    expect(workbox().options).toEqual({ scope: "/" });
    expect(workbox().register).toHaveBeenCalledTimes(1);
  });

  it("leaves the service worker alone outside a production build", async () => {
    vi.stubEnv("PROD", false);
    await renderProductionHook();

    expect(fake.instances).toHaveLength(0);
  });

  it("leaves the service worker alone when the browser has none", async () => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    const { result } = await renderProductionHook();

    expect(fake.instances).toHaveLength(0);
    expect(result.current.updateWaiting).toBe(false);
  });

  it("reports an update when a new worker is waiting", async () => {
    const { result } = await renderProductionHook();
    expect(result.current.updateWaiting).toBe(false);

    act(() => workbox().emit("waiting"));

    expect(result.current.updateWaiting).toBe(true);
  });

  it("stops reporting an update once it's dismissed, without touching the worker", async () => {
    const { result } = await renderProductionHook();
    act(() => workbox().emit("waiting"));

    act(() => result.current.dismiss());

    expect(result.current.updateWaiting).toBe(false);
    expect(workbox().messageSkipWaiting).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("never applies or reloads on its own when an update is waiting", async () => {
    await renderProductionHook();

    act(() => workbox().emit("waiting"));

    expect(workbox().messageSkipWaiting).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("asks the waiting worker to take over on apply, and reloads only once it has", async () => {
    const { result } = await renderProductionHook();
    act(() => workbox().emit("waiting"));

    act(() => result.current.applyUpdate());
    expect(workbox().messageSkipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();

    act(() => workbox().emit("controlling"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload a tab whose user didn't ask when another tab's update takes control", async () => {
    await renderProductionHook();
    act(() => workbox().emit("waiting"));

    act(() => workbox().emit("controlling"));

    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads straight away on apply when another tab already switched workers", async () => {
    const { result } = await renderProductionHook();
    act(() => workbox().emit("waiting"));
    act(() => workbox().emit("controlling"));

    act(() => result.current.applyUpdate());

    expect(workbox().messageSkipWaiting).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("checks for an update when the app becomes visible again, not when it's hidden", async () => {
    await renderProductionHook();

    setVisibility("hidden");
    expect(workbox().update).not.toHaveBeenCalled();

    setVisibility("visible");
    expect(workbox().update).toHaveBeenCalledTimes(1);
  });

  it("checks for an update every hour while the app stays open", async () => {
    vi.useFakeTimers();
    renderHook(() => useAppUpdate());
    await act(async () => {});

    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(workbox().update).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(workbox().update).toHaveBeenCalledTimes(2);
  });

  it("carries on quietly when an update check fails, such as when offline", async () => {
    await renderProductionHook();
    workbox().update.mockRejectedValue(new Error("offline"));

    setVisibility("visible");
    await act(async () => {});

    expect(workbox().update).toHaveBeenCalledTimes(1);
  });

  it("stops checking once unmounted", async () => {
    const { unmount } = await renderProductionHook();
    const instance = workbox();
    unmount();

    setVisibility("visible");

    expect(instance.update).not.toHaveBeenCalled();
  });
});
