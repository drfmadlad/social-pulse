import { useEffect, useState } from "react";
import { getAllOwnScenarios, subscribeToOwnScenarioChanges } from "./ownScenarioStore";
import type { OwnScenario } from "./ownScenarios";
import { useLatestRequestGuard } from "./useLatestRequestGuard";

/**
 * The saved Own Scenarios, newest first, kept live as they're saved or deleted. Undefined until
 * they've been read, so a screen can tell "none yet" from "not loaded yet".
 */
export function useOwnScenarios(): OwnScenario[] | undefined {
  const [ownScenarios, setOwnScenarios] = useState<OwnScenario[]>();
  const { start, isStale } = useLatestRequestGuard();

  useEffect(() => {
    async function refresh() {
      const requestId = start();
      let latest: OwnScenario[];
      try {
        latest = await getAllOwnScenarios();
      } catch (error) {
        // Storage that can't be read looks like storage with nothing in it, so the form still works.
        console.error("Failed to read the saved Own Scenarios", error);
        latest = [];
      }
      if (isStale(requestId)) return;
      setOwnScenarios(latest);
    }
    void refresh();
    return subscribeToOwnScenarioChanges(() => void refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ownScenarios;
}
