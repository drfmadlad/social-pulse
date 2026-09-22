import { act, fireEvent } from "@testing-library/react";

/**
 * Waits for the on-device reads a screen starts after its first paint — History entries, finished
 * Lesson ids — to land.
 *
 * Without this, those reads resolve a tick after a synchronous test's last assertion, so their
 * state updates happen outside act(): React warns, and the update lands in teardown or in the next
 * test rather than in the one that caused it. Render helpers await this so every test starts from
 * a screen that has finished loading, which is what the user sees anyway.
 */
export async function settleDeviceReads(): Promise<void> {
  // A single tick isn't enough: opening the database and reading a store take several turns of
  // the event loop each, and a screen may start more than one read.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

/**
 * Clicks something that changes screen, then lets the screen it lands on finish loading — what
 * a render helper does for the first screen, for every one after it.
 */
export async function clickToScreen(element: HTMLElement): Promise<void> {
  fireEvent.click(element);
  await settleDeviceReads();
}
