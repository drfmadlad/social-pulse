import { useLocation } from "react-router-dom";

/** Shows the current URL's path and query, for a test to read where a screen navigated. */
export function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}
