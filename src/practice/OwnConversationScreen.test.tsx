import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "../db";
import { mockReply } from "../test/apiMocks";
import { settleDeviceReads } from "../test/settleDeviceReads";
import { saveOwnScenario } from "./ownScenarioStore";
import { OwnConversationScreen } from "./OwnConversationScreen";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</div>;
}

async function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <LocationDisplay />
            <Outlet />
          </>
        ),
        children: [
          { path: "/practice", element: <div>Practice picker</div> },
          { path: "/practice/own", element: <div>Own Scenario brief</div> },
          { path: "/practice/own/:scenarioId", element: <OwnConversationScreen /> },
          { path: "/practice/own/feedback/:entryId", element: <div>Feedback Summary stub</div> },
        ],
      },
    ],
    { initialEntries: ["/practice", path], initialIndex: 1 },
  );
  const view = render(<RouterProvider router={router} />);
  await settleDeviceReads();
  return { ...view, router };
}

const dana = { name: "Dana", about: "my manager of two years", situation: "I want to ask Dana for a raise." };

function bodyOfRequest(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  const [url, init] = fetchMock.mock.calls[callIndex];
  return { url, body: JSON.parse(init.body as string) };
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetDbForTests();
});

describe("OwnConversationScreen (issue #67)", () => {
  it("opens a conversation with the person the user described, who speaks first", async () => {
    const own = await saveOwnScenario(dana);
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Come in. What's on your mind?"));
    vi.stubGlobal("fetch", fetchMock);

    await renderAt(`/practice/own/${own.id}`);

    expect(await screen.findByText("Come in. What's on your mind?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Practice" })).toBeInTheDocument();
    // The situation opens the transcript, the same as a category's Scenario does.
    expect(screen.getByText(dana.situation)).toBeInTheDocument();
  });

  it("sends what the user wrote with every reply request, under the Own Scenario's category id and no Scenario id", async () => {
    const own = await saveOwnScenario(dana);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Come in."))
      .mockResolvedValueOnce(mockReply("Sure. Go on."));
    vi.stubGlobal("fetch", fetchMock);

    await renderAt(`/practice/own/${own.id}`);
    await screen.findByText("Come in.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Thanks for making time." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Sure. Go on.");

    const opening = bodyOfRequest(fetchMock, 0);
    expect(opening.url).toBe("/api/conversation");
    expect(opening.body).toEqual({ messages: [], categoryId: "own", ownScenario: dana });
    expect(bodyOfRequest(fetchMock, 1).body).toEqual({
      messages: [
        { role: "assistant", content: "Come in." },
        { role: "user", content: "Thanks for making time." },
      ],
      categoryId: "own",
      ownScenario: dana,
    });
  });

  it("ends in the Feedback Summary, handing it the transcript, the Own Scenario's id and what was written", async () => {
    const own = await saveOwnScenario(dana);
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockReply("Come in."))));

    await renderAt(`/practice/own/${own.id}?focus=staying-calm`);
    await screen.findByText("Come in.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi Dana." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getAllByText("Come in.")).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "End & get feedback" })[0]);

    expect(screen.getByText("Feedback Summary stub")).toBeInTheDocument();
    const { pathname, state } = JSON.parse(screen.getByTestId("location").textContent!);
    expect(pathname).toMatch(/^\/practice\/own\/feedback\/.+/);
    expect(state).toMatchObject({ scenarioId: own.id, focusId: "staying-calm", ownScenario: dana });
    expect(state.transcript.at(-2)).toEqual({ role: "user", content: "Hi Dana." });
  });

  it("goes to the Own Scenario brief when the Own Scenario is gone, without asking the AI", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderAt("/practice/own/deleted-long-ago");

    expect(await screen.findByText("Own Scenario brief")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("goes to the Own Scenario brief when the URL names a Focus the app doesn't offer", async () => {
    const own = await saveOwnScenario(dana);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await renderAt(`/practice/own/${own.id}?focus=not-a-focus`);

    expect(await screen.findByText("Own Scenario brief")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
