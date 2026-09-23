import { useCallback, useEffect, useRef, useState } from "react";
import { Workbox } from "workbox-window";

// An installed PWA is often resumed from the background rather than reopened, and the browser only
// looks for a new service worker on navigation, so without these checks a long-lived app never
// notices an update.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

interface AppUpdate {
  updateWaiting: boolean;
  applyUpdate: () => void;
  dismiss: () => void;
}

/**
 * Registers the service worker and reports when a new version is waiting. This owns registration
 * instead of using vite-plugin-pwa's generated `virtual:pwa-register`, whose `prompt` mode reloads
 * every open tab as soon as a new worker takes control. That would reload a tab sitting in a
 * Practice Conversation because the user tapped Reload in another one. Here a tab reloads only
 * after its own user asked.
 */
export function useAppUpdate(): AppUpdate {
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const workboxRef = useRef<Workbox | null>(null);
  const reloadRequestedRef = useRef(false);
  const newWorkerInControlRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    const workbox = new Workbox("/sw.js", { scope: "/" });
    workboxRef.current = workbox;
    let registered = false;

    const markWaiting = () => setUpdateWaiting(true);
    const onControlling = () => {
      if (reloadRequestedRef.current) {
        window.location.reload();
      } else {
        newWorkerInControlRef.current = true;
      }
    };
    const checkForUpdate = () => {
      if (registered) workbox.update().catch(() => {});
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    workbox.addEventListener("waiting", markWaiting);
    workbox.addEventListener("controlling", onControlling);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    // The app works without a service worker, so a failed registration has nothing to tell the user.
    workbox.register().then(() => {
      registered = true;
    }, () => {});

    return () => {
      workbox.removeEventListener("waiting", markWaiting);
      workbox.removeEventListener("controlling", onControlling);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
      workboxRef.current = null;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    // Another tab already took the new worker over; there's nothing left to wait for here.
    if (newWorkerInControlRef.current) {
      window.location.reload();
      return;
    }
    reloadRequestedRef.current = true;
    workboxRef.current?.messageSkipWaiting();
  }, []);

  const dismiss = useCallback(() => setUpdateWaiting(false), []);

  return { updateWaiting, applyUpdate, dismiss };
}
