import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
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
import { LocationDisplay } from "./test/LocationDisplay";
import { putStoredHistoryEntry } from "./test/storedHistory";
import { pressSystemBack } from "./test/systemBack";

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
  return { ...view, router };
}

/** The system back gesture, then whatever the screen it lands on reads from the device. */
async function pressSystemBackToScreen(router: ReturnType<typeof createMemoryRouter>) {
  await pressSystemBack(router);
  await settleDeviceReads();
}

function currentUrl() {
  return screen.getByTestId("location").textContent;
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

  describe("Try again (issue #66)", () => {
    function say(content: string) {
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: content } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    }

    it("from a Feedback Summary, starts a fresh, unlinked conversation that back leads out of to the Practice picker", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight."))
        .mockResolvedValueOnce(mockReply("That sounds like a great start!"))
        .mockResolvedValueOnce(mockFeedbackSummary())
        .mockResolvedValueOnce(mockReply("Hi again, nice place, right?"))
        .mockResolvedValueOnce(mockReply("It really is."))
        .mockResolvedValueOnce(mockFeedbackSummary());
      vi.stubGlobal("fetch", fetchMock);
      const scenario = defaultScenarioOf("dating")!;

      const { router } = await renderApp("/");
      await clickToScreen(screen.getByRole("link", { name: "Start practicing" }));
      await clickToScreen(screen.getByRole("link", { name: /^Dating/ }));
      fireEvent.click(screen.getByRole("radio", { name: scenario.title }));
      fireEvent.click(screen.getByRole("radio", { name: "Staying calm" }));
      await clickToScreen(screen.getByRole("button", { name: "Start" }));
      await screen.findByText("Hey! Thanks for coming out tonight.");
      say("Hi, nice to meet you!");
      await screen.findByText("That sounds like a great start!");
      await clickToScreen(screen.getByRole("button", { name: "End & get feedback" }));
      await screen.findByText("What you did well");
      const firstEntryUrl = currentUrl();

      await clickToScreen(screen.getByRole("button", { name: "Try again in a new conversation" }));

      // Straight into the same Scenario and Focus, with no brief on the way.
      expect(currentUrl()).toBe(`/practice/dating/${scenario.id}?focus=staying-calm`);
      expect(await screen.findByText("Hi again, nice place, right?")).toBeInTheDocument();
      expect(screen.queryByText("Hi, nice to meet you!")).not.toBeInTheDocument();
      expect(screen.queryByText("That sounds like a great start!")).not.toBeInTheDocument();

      say("Hi, nice to meet you!");
      await screen.findByText("It really is.");
      await clickToScreen(screen.getByRole("button", { name: "End & get feedback" }));
      await screen.findByText("What you did well");

      // A History entry like any other: nothing names or compares the earlier attempt.
      expect(currentUrl()).not.toBe(firstEntryUrl);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Feedback on your conversation with Jordan");
      const secondFeedbackRequest = JSON.parse(fetchMock.mock.calls[5][1].body as string);
      expect(Object.keys(secondFeedbackRequest).sort()).toEqual(["categoryName", "focusId", "personaName", "transcript"]);
      expect(secondFeedbackRequest.transcript).toEqual([
        { role: "assistant", content: "Hi again, nice place, right?" },
        { role: "user", content: "Hi, nice to meet you!" },
        { role: "assistant", content: "It really is." },
      ]);
      const entries = await getAllHistoryEntries();
      expect(entries).toHaveLength(2);
      expect(Object.keys(entries[0]).sort()).toEqual(Object.keys(entries[1]).sort());

      // Neither ended conversation is under this one: back leaves Practice the way it came in.
      await pressSystemBackToScreen(router);
      expect(currentUrl()).toBe("/practice");
      expect(screen.getByRole("heading", { level: 1, name: "Practice" })).toBeInTheDocument();
    });

    it("from a reloaded Feedback Summary, replaces it, so back leaves the new conversation for where the summary was opened from", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight.")));
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

      const { router } = await renderApp("/");
      await act(async () => {
        await router.navigate("/practice/dating/feedback/entry-1");
      });
      await screen.findByText("What you did well");

      await clickToScreen(screen.getByRole("button", { name: "Try again in a new conversation" }));
      expect(currentUrl()).toBe("/practice/dating/coffee-first-date");
      expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();

      await pressSystemBackToScreen(router);
      expect(currentUrl()).toBe("/");
    });

    it("from a History entry, pushes the new conversation, so back returns to the entry", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight.")));
      await putStoredHistoryEntry({
        id: "entry-before-scenarios",
        categoryId: "dating",
        categoryName: "Dating",
        personaName: "Jordan",
        transcript: [
          { role: "assistant", content: "Hi there." },
          { role: "user", content: "Hi, nice to meet you!" },
        ],
        summary: { didWell: [{ quote: "Hi, nice to meet you!" }], canImprove: [{ quote: "Hi, nice to meet you!" }] },
        endedAt: new Date().toISOString(),
      });

      const { router } = await renderApp("/history");
      await clickToScreen(await screen.findByRole("link", { name: /Dating/ }));
      await clickToScreen(screen.getByRole("button", { name: "Try again in a new conversation" }));

      expect(currentUrl()).toBe(`/practice/dating/${defaultScenarioOf("dating")!.id}`);
      expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();

      await pressSystemBackToScreen(router);
      expect(currentUrl()).toBe("/history/entry-before-scenarios");
      expect(await screen.findByText("What you did well")).toBeInTheDocument();
    });
  });
});
