import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { AppRoutes } from "./App";
import { resetHistoryStoreForTests } from "./history/historyStore";
import { mockFeedbackSummary, mockReply } from "./test/apiMocks";
import { clickToScreen, settleDeviceReads } from "./test/settleDeviceReads";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

async function renderApp(initialPath = "/") {
  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationDisplay />
      <AppRoutes />
    </MemoryRouter>,
  );
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
  });

  it("names each back affordance's destination", async () => {
    await renderApp("/practice");
    expect(screen.getByRole("link", { name: "← Home" })).toBeInTheDocument();

    await clickToScreen(screen.getByRole("link", { name: /^Dating/ }));
    expect(await screen.findByRole("button", { name: "← Practice" })).toBeInTheDocument();
  });

  it("redirects to the Practice picker when the Conversation URL names an unknown category", async () => {
    await renderApp("/practice/not-a-real-category");

    expect(screen.getByTestId("location")).toHaveTextContent("/practice");
    expect(screen.getByRole("heading", { name: "Practice" })).toBeInTheDocument();
  });

  it("redirects to the Practice picker when the Feedback Summary URL has no conversation state", async () => {
    await renderApp("/practice/dating/feedback");

    expect(screen.getByTestId("location")).toHaveTextContent("/practice");
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

  it("redirects an unknown path to Home", async () => {
    await renderApp("/this-does-not-exist");

    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });
});
