import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { resetHistoryStoreForTests } from "./historyStore";
import { HistoryEntryDetailScreen } from "./HistoryEntryDetailScreen";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/history" element={<div>History list</div>} />
        <Route path="/history/:entryId" element={<HistoryEntryDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(async () => {
  await resetHistoryStoreForTests();
});

describe("HistoryEntryDetailScreen", () => {
  it("redirects to the History list when the URL names an unknown entry", async () => {
    renderAt("/history/not-a-real-entry");

    expect(await screen.findByText("History list")).toBeInTheDocument();
  });
});
