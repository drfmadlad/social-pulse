import { useLocation } from "react-router-dom";
import { holdsBackUpdateOffer } from "./updateOfferHoldBack";
import { useAppUpdate } from "./useAppUpdate";

/**
 * Tells the user a new version of the app is waiting and lets them take it (DESIGN.md §7, Update
 * offer). Nothing reloads until Reload is tapped here. The live region is always mounted so a
 * screen reader announces the note when it appears.
 */
export function AppUpdateOffer() {
  const { pathname } = useLocation();
  const { updateWaiting, applyUpdate, dismiss } = useAppUpdate();

  const showOffer = updateWaiting && !holdsBackUpdateOffer(pathname);

  return (
    <div aria-live="polite">
      {showOffer && (
        <div className="update-offer">
          <p className="update-offer__message">A new version is ready.</p>
          <div className="update-offer__actions">
            <button type="button" className="update-offer__dismiss" onClick={dismiss}>
              Not now
            </button>
            <button type="button" className="button-primary" onClick={applyUpdate}>
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
