import { useRef } from "react";

/**
 * Guards against a stale async response overwriting a newer one — e.g. React
 * StrictMode's dev-only double-invoke of a mount effect firing two requests
 * back to back, or a user triggering a retry before an earlier request settles.
 */
export function useLatestRequestGuard() {
  const latestId = useRef(0);

  function start(): number {
    return ++latestId.current;
  }

  function isStale(requestId: number): boolean {
    return latestId.current !== requestId;
  }

  return { start, isStale };
}
