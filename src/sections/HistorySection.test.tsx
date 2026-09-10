import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resetHistoryStoreForTests, saveHistoryEntry } from "../history/historyStore";
import { scenarioCategories } from "../practice/scenarioCategories";
import { HistorySection } from "./HistorySection";

const datingCategory = scenarioCategories.find((category) => category.id === "dating")!;
const jobInterviewCategory = scenarioCategories.find((category) => category.id === "job-interview")!;

const summary = {
  didWell: [{ quote: "Hi, nice to meet you!", explanation: "A warm, direct opener." }],
  canImprove: [{ quote: "Hi, nice to meet you!" }],
};

afterEach(async () => {
  await resetHistoryStoreForTests();
});

describe("HistorySection", () => {
  it("shows a placeholder when there is no History yet", async () => {
    render(<HistorySection />);

    expect(await screen.findByText("Past Practice Conversations will appear here soon.")).toBeInTheDocument();
  });

  it("lists persisted Practice Conversations most recent first, each identifiable by Scenario Category and date/time", async () => {
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

    render(<HistorySection />);

    const entryButtons = await screen.findAllByRole("button");
    expect(entryButtons).toHaveLength(2);
    expect(entryButtons[0]).toHaveTextContent("Job Interview");
    expect(entryButtons[1]).toHaveTextContent("Dating");
    expect(entryButtons[0].querySelector("time")).toBeInTheDocument();
  });

  it("shows the full saved transcript and Feedback Summary, read-only, when an entry is tapped", async () => {
    await saveHistoryEntry({
      category: datingCategory,
      transcript: [
        { role: "assistant", content: "Hey! Thanks for coming out tonight." },
        { role: "user", content: "Hi, nice to meet you!" },
      ],
      summary,
    });

    render(<HistorySection />);

    fireEvent.click(await screen.findByRole("button", { name: /Dating/ }));

    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();
    expect(screen.getAllByText("Hi, nice to meet you!").length).toBeGreaterThan(0);
    expect(screen.getByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText("What you can do better")).toBeInTheDocument();
    expect(screen.getByText("A warm, direct opener.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "← Back to History" }));

    expect(await screen.findByRole("button", { name: /Dating/ })).toBeInTheDocument();
    expect(screen.queryByText("What you did well")).not.toBeInTheDocument();
  });

  it("refreshes live when a new History entry is saved elsewhere on the page", async () => {
    render(<HistorySection />);

    expect(await screen.findByText("Past Practice Conversations will appear here soon.")).toBeInTheDocument();

    await saveHistoryEntry({
      category: datingCategory,
      transcript: [{ role: "user", content: "Hi!" }],
      summary,
    });

    expect(await screen.findByRole("button", { name: /Dating/ })).toBeInTheDocument();
  });
});
