import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { restoreConnection } from "./connection";

afterEach(() => {
  restoreConnection();
  // An in-progress Practice Conversation (issue #68) must not carry from one test into the next.
  // (Some test files run in the node environment, which has no window.)
  if (typeof window !== "undefined") window.localStorage.clear();
});
