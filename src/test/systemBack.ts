import { act } from "@testing-library/react";
import type { createMemoryRouter } from "react-router-dom";

/** Simulates the system back gesture / browser back, which react-router surfaces as a POP navigation. */
export async function pressSystemBack(router: ReturnType<typeof createMemoryRouter>): Promise<void> {
  await act(async () => {
    await router.navigate(-1);
  });
}
