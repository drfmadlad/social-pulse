import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Whether the device has a connection, kept live as it drops and returns. `navigator.onLine` is
 * only trustworthy when it says false (true can mean a network with no internet behind it), so
 * treat offline as certain and online as a best guess that a request may still disprove.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
