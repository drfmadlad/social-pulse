import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { scenarioCategories } from "../practice/scenarioCategories";
import { resetHistoryStoreForTests, saveHistoryEntry } from "./historyStore";
import { HistoryEntryDetailScreen } from "./HistoryEntryDetailScreen";
import { HistoryListScreen } from "./HistoryListScreen";

const datingCategory = scenarioCategories.find((category) => category.id === "dating")!;
const jobInterviewCategory = scenarioCategories.find((category) => category.id === "job-interview")!;

const summary = {
  didWell: [{ quote: "Hi, nice to meet you!", explanation: "A warm, direct opener." }],
  canImprove: [{ quote: "Hi, nice to meet you!" }],
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/history" element={<HistoryListScreen />} />
        <Route path="/history/:entryId" element={<HistoryEntryDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(async () => {
  await resetHistoryStoreForTests();
});

describe("HistoryListScreen", () => {
  it("shows a placeholder when there is no History yet", async () => {
    renderAt("/history");

    expect(await screen.findByText("Past Practice Conversations will appear here soon.")).toBeInTheDocument();
  });

  it("names Home as the back destination", () => {
    renderAt("/history");

    expect(screen.getByRole("link", { name: "← Home" })).toHaveAttribute("href", "/");
  });

  it("lists persisted Practice Conversations most recent first, each linking to its own detail URL", async () => {
    await saveHistoryEntry({
      category: datingCategory,
      transcript: [{ role: "user", content: "Hi!" }],
      summary,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveHistoryEntry({
      category: jobInterviewCategory,
      transcript: [{ role: "user", content: "Nice to meet you." }],
      summary,
    });

    renderAt("/history");

    const entryLinks = await screen.findAllByRole("link", { name: /Job Interview|Dating/ });
    expect(entryLinks).toHaveLength(2);
    expect(entryLinks[0]).toHaveTextContent("Job Interview");
    expect(entryLinks[1]).toHaveTextContent("Dating");
  });

  it("shows the full saved transcript and Feedback Summary, read-only, when an entry is opened", async () => {
    await saveHistoryEntry({
      category: datingCategory,
      transcript: [
        { role: "assistant", content: "Hey! Thanks for coming out tonight." },
        { role: "user", content: "Hi, nice to meet you!" },
      ],
      summary,
    });

    renderAt("/history");

    fireEvent.click(await screen.findByRole("link", { name: /Dating/ }));

    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();
    expect(screen.getAllByText("Hi, nice to meet you!").length).toBeGreaterThan(0);
    expect(screen.getByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText("What you can do better")).toBeInTheDocument();
    expect(screen.getByText("A warm, direct opener.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "← Back to History" }));

    expect(await screen.findByRole("link", { name: /Dating/ })).toBeInTheDocument();
    expect(screen.queryByText("What you did well")).not.toBeInTheDocument();
  });

  it("refreshes live when a new History entry is saved elsewhere", async () => {
    renderAt("/history");

    expect(await screen.findByText("Past Practice Conversations will appear here soon.")).toBeInTheDocument();

    await saveHistoryEntry({
      category: datingCategory,
      transcript: [{ role: "user", content: "Hi!" }],
      summary,
    });

    expect(await screen.findByRole("link", { name: /Dating/ })).toBeInTheDocument();
  });
});
