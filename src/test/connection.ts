import { vi, type MockInstance } from "vitest";

/** The Practice picker's offline notice (INFORMATION-ARCHITECTURE.md, Practice picker). */
export const PRACTICE_OFFLINE_NOTICE = "You're offline — Practice needs a connection. Lessons work offline.";

let onLineGetter: MockInstance<() => boolean> | undefined;

/**
 * Simulates the device's connection the way the browser reports it: `navigator.onLine`, plus the
 * `online`/`offline` events fired on `window` when it changes. jsdom always reports online and
 * never fires either event.
 */
function setOnLine(onLine: boolean) {
  // Spied afresh each time (vitest hands back the live spy if there is one) so a test that ran
  // vi.restoreAllMocks() part-way through doesn't leave this holding a spy that no longer applies.
  onLineGetter = vi.spyOn(navigator, "onLine", "get");
  onLineGetter.mockReturnValue(onLine);
}

/** The device is already offline when the screen first renders. */
export function startOffline(): void {
  setOnLine(false);
}

/** The connection drops while a screen is showing. Wrap in `act()`. */
export function goOffline(): void {
  setOnLine(false);
  window.dispatchEvent(new Event("offline"));
}

/** The connection comes back while a screen is showing. Wrap in `act()`. */
export function goOnline(): void {
  setOnLine(true);
  window.dispatchEvent(new Event("online"));
}

/**
 * Puts jsdom's real, always-online `navigator.onLine` back. The shared test setup calls this after
 * every test, so a test that goes offline can't leave the next one offline.
 */
export function restoreConnection(): void {
  onLineGetter?.mockRestore();
  onLineGetter = undefined;
}
