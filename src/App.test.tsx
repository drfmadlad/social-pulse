import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { createAppRouteObjects } from "./App";
import {
  attachFeedbackSummary,
  getAllHistoryEntries,
  resetHistoryStoreForTests,
  saveEndedConversation,
} from "./history/historyStore";
import { scenarioCategories } from "./practice/scenarioCategories";
import { defaultScenarioOf } from "./practice/scenarios";
import { lessons } from "./lessons/lessons";
import { mockFeedbackSummary, mockReply } from "./test/apiMocks";
import { PRACTICE_OFFLINE_NOTICE, startOffline } from "./test/connection";
import { clickToScreen, settleDeviceReads } from "./test/settleDeviceReads";
import { putStoredHistoryEntry } from "./test/storedHistory";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

async function renderApp(initialPath = "/") {
  const router = createMemoryRouter(
    [
      {
        // `createAppRouteObjects()` assigns each route an id relative to its own top level, so
        // this wrapper needs an id that won't collide with those rather than the "0" it would get
        // by position.
        id: "app-test-root",
        element: (
          <>
            <LocationDisplay />
            <Outlet />
          </>
        ),
        children: createAppRouteObjects(),
      },
    ],
    { initialEntries: [initialPath] },
  );
  const view = render(<RouterProvider router={router} />);
  await settleDeviceReads();
  return view;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("App", () => {
  it("renders the real App shell", async () => {
    render(<App />);
    await settleDeviceReads();

    expect(screen.getByRole("heading", { name: "Social Pulse" })).toBeInTheDocument();
  });

  it("renders Home as a calm screen with a Today's idea, a single primary action, and quiet Lessons/History rows", async () => {
    await renderApp();

    expect(screen.getByRole("heading", { name: "Social Pulse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start practicing" })).toHaveAttribute("href", "/practice");
    expect(screen.getByRole("link", { name: /^Lessons/ })).toHaveAttribute("href", "/lessons");
    expect(screen.getByRole("link", { name: /^History/ })).toHaveAttribute("href", "/history");
  });

  it("does not render tab navigation", async () => {
    await renderApp();

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("gives each screen its own URL, and keeps a Practice Conversation off the homepage card", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight."))
      .mockResolvedValueOnce(mockReply("That sounds like a great start!"))
      .mockResolvedValueOnce(mockFeedbackSummary());
    vi.stubGlobal("fetch", fetchMock);

    await renderApp();
    expect(screen.getByTestId("location")).toHaveTextContent("/");

    await clickToScreen(screen.getByRole("link", { name: "Start practicing" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/practice");
    expect(screen.queryByRole("heading", { name: "Lessons" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "History" })).not.toBeInTheDocument();

    await clickToScreen(screen.getByRole("link", { name: /^Dating/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/practice/dating");
    expect(screen.getByRole("heading", { level: 1, name: "Jordan" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    const scenario = defaultScenarioOf("dating")!;
    fireEvent.click(screen.getByRole("radio", { name: scenario.title }));
    await clickToScreen(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByTestId("location")).toHaveTextContent(`/practice/dating/${scenario.id}`);
    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Practice" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi, nice to meet you!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("That sounds like a great start!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));
    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/practice/dating/feedback");

    await clickToScreen(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/");
    expect(screen.getByRole("link", { name: /^History/ })).toBeInTheDocument();

    await clickToScreen(screen.getByRole("link", { name: /^History/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/history");

    const historyEntryLink = await screen.findByRole("link", { name: /Dating/ });
    fireEvent.click(historyEntryLink);

    expect(screen.getByTestId("location").textContent).toMatch(/^\/history\/.+/);
    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();
    expect(screen.getByText("That sounds like a great start!")).toBeInTheDocument();
    expect(screen.getByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText("What you can do better")).toBeInTheDocument();

    // The conversation's History entry records the Scenario it was set in.
    const [entry] = await getAllHistoryEntries();
    expect(entry.scenarioId).toBe(scenario.id);
  });

  it("names each back affordance's destination", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await renderApp("/practice");
    expect(screen.getByRole("link", { name: "← Home" })).toBeInTheDocument();

    await clickToScreen(screen.getByRole("link", { name: /^Dating/ }));
    expect(screen.getByRole("link", { name: "← Practice" })).toBeInTheDocument();

    await clickToScreen(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("button", { name: "← Practice" })).toBeInTheDocument();
  });

  it("redirects to the Practice picker when the Scenario brief URL names an unknown category", async () => {
    await renderApp("/practice/not-a-real-category");

    expect(screen.getByTestId("location")).toHaveTextContent("/practice");
    expect(screen.getByRole("heading", { name: "Practice" })).toBeInTheDocument();
  });

  it("redirects to the Practice picker when the Conversation URL names an unknown category", async () => {
    await renderApp("/practice/not-a-real-category/coffee-first-date");

    expect(screen.getByTestId("location")).toHaveTextContent("/practice");
    expect(screen.getByRole("heading", { name: "Practice" })).toBeInTheDocument();
  });

  it("redirects to the category's Scenario brief when the Conversation URL names an unknown Scenario", async () => {
    await renderApp("/practice/dating/not-a-real-scenario");

    expect(screen.getByTestId("location")).toHaveTextContent("/practice/dating");
    expect(screen.getByRole("heading", { level: 1, name: "Jordan" })).toBeInTheDocument();
  });

  it("still opens a conversation saved before Scenarios existed, in History and at its Feedback Summary URL", async () => {
    // How a History entry was stored before issue #53: no scenarioId.
    await putStoredHistoryEntry({
      id: "entry-before-scenarios",
      categoryId: "dating",
      categoryName: "Dating",
      personaName: "Jordan",
      transcript: [
        { role: "assistant", content: "Hey! Thanks for coming out tonight." },
        { role: "user", content: "Hi, nice to meet you!" },
      ],
      summary: { didWell: [{ quote: "Hi, nice to meet you!" }], canImprove: [{ quote: "Hi, nice to meet you!" }] },
      endedAt: new Date().toISOString(),
    });

    const historyVisit = await renderApp("/history");
    await clickToScreen(await screen.findByRole("link", { name: /Dating/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/history/entry-before-scenarios");
    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();
    expect(screen.getByText("What you did well")).toBeInTheDocument();
    historyVisit.unmount();

    await renderApp("/practice/dating/feedback/entry-before-scenarios");
    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/practice/dating/feedback/entry-before-scenarios");
  });

  it("redirects to the Practice picker when the Feedback Summary URL has no conversation state and the id doesn't resolve", async () => {
    await renderApp("/practice/dating/feedback/not-a-real-entry");

    expect(screen.getByTestId("location")).toHaveTextContent("/practice");
  });

  it("recovers a Feedback Summary from History after a reload, since the entry id lives in the URL", async () => {
    const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
    const transcript = [
      { role: "assistant" as const, content: "Hey! Thanks for coming out tonight." },
      { role: "user" as const, content: "Hi, nice to meet you!" },
    ];
    await saveEndedConversation({ id: "entry-1", category, scenario: defaultScenarioOf(category.id)!, transcript });
    await attachFeedbackSummary("entry-1", {
      didWell: [{ quote: "Hi, nice to meet you!" }],
      canImprove: [{ quote: "Hi, nice to meet you!" }],
    });

    // A hard reload lands here with no router state, the same as a bookmarked or shared link.
    await renderApp("/practice/dating/feedback/entry-1");

    expect(await screen.findByText("What you did well")).toBeInTheDocument();
    expect(screen.getByText("What you can do better")).toBeInTheDocument();

    await clickToScreen(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("deep-links directly to a Lesson's flow, starting at step 1", async () => {
    await renderApp("/lessons/active-listening");

    expect(screen.getByRole("heading", { name: "Active Listening" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute("aria-valuenow", "1");
  });

  it("redirects to the Lessons list when the Lesson URL names an unknown Lesson", async () => {
    await renderApp("/lessons/not-a-real-lesson");

    expect(screen.getByTestId("location")).toHaveTextContent("/lessons");
    expect(screen.getByRole("heading", { name: "Lessons" })).toBeInTheDocument();
  });

  it("keeps Lessons and History working offline, where only the Practice picker mentions the connection", async () => {
    const category = scenarioCategories.find((candidate) => candidate.id === "dating")!;
    await saveEndedConversation({
      id: "entry-1",
      category,
      scenario: defaultScenarioOf(category.id)!,
      transcript: [{ role: "user", content: "Hi, nice to meet you!" }],
    });
    startOffline();

    const lessonsVisit = await renderApp();
    await clickToScreen(screen.getByRole("link", { name: /^Lessons/ }));
    expect(screen.queryByText(PRACTICE_OFFLINE_NOTICE)).not.toBeInTheDocument();
    await clickToScreen(screen.getByRole("link", { name: new RegExp(lessons[0].title) }));
    expect(screen.getByTestId("location")).toHaveTextContent(`/lessons/${lessons[0].id}`);
    expect(screen.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute("aria-valuenow", "1");
    lessonsVisit.unmount();

    const historyVisit = await renderApp();
    await clickToScreen(screen.getByRole("link", { name: /^History/ }));
    expect(screen.queryByText(PRACTICE_OFFLINE_NOTICE)).not.toBeInTheDocument();
    await clickToScreen(await screen.findByRole("link", { name: /Dating/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/history/entry-1");
    expect(await screen.findByText("Hi, nice to meet you!")).toBeInTheDocument();
    historyVisit.unmount();

    await renderApp();
    await clickToScreen(screen.getByRole("link", { name: "Start practicing" }));
    expect(screen.getByText(PRACTICE_OFFLINE_NOTICE)).toBeInTheDocument();
  });

  it("redirects an unknown path to Home", async () => {
    await renderApp("/this-does-not-exist");

    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });
});
