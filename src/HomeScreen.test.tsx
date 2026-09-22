import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { resetHistoryStoreForTests, saveEndedConversation } from "./history/historyStore";
import { HomeScreen } from "./HomeScreen";
import { lessons } from "./lessons/lessons";
import { pickTodaysLesson } from "./lessons/pickTodaysLesson";
import { scenarioCategories } from "./practice/scenarioCategories";
import { settleDeviceReads } from "./test/settleDeviceReads";

async function renderHome() {
  const view = render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>,
  );
  await settleDeviceReads();
  return view;
}

afterEach(async () => {
  await resetHistoryStoreForTests();
});

describe("HomeScreen", () => {
  it("renders at most five elements: wordmark, Today's idea, Start practicing, Lessons row, History row", async () => {
    await renderHome();

    expect(screen.getByRole("heading", { name: "Social Pulse" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("surfaces one Lesson's idea in the Today's idea card, linking through to that Lesson", async () => {
    await renderHome();

    const todaysLesson = pickTodaysLesson(lessons);
    const link = screen.getByRole("link", { name: new RegExp(todaysLesson.title) });
    expect(link).toHaveAttribute("href", `/lessons/${todaysLesson.id}`);
    expect(link).toHaveTextContent(todaysLesson.summary);
  });

  it("has a single primary action leading to the Practice picker", async () => {
    await renderHome();

    expect(screen.getByRole("link", { name: "Start practicing" })).toHaveAttribute("href", "/practice");
  });

  it("shows Lessons as one row with a count", async () => {
    await renderHome();

    const link = screen.getByRole("link", { name: new RegExp(`Lessons\\s*${lessons.length}`) });
    expect(link).toHaveAttribute("href", "/lessons");
  });

  it("shows History as one row with a count", async () => {
    await saveEndedConversation({
      id: "entry-1",
      category: scenarioCategories[0],
      transcript: [{ role: "user", content: "Hi!" }],
    });

    await renderHome();

    const link = await screen.findByRole("link", { name: /History\s*1/ });
    expect(link).toHaveAttribute("href", "/history");
  });

  it("shows no draft-content badge", async () => {
    await renderHome();

    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("shows no streak, XP, score, leaderboard, or progress indicator", async () => {
    await renderHome();

    for (const forbidden of [/streak/i, /\bxp\b/i, /\bscore\b/i, /leaderboard/i, /day \d+/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    }
  });
});
