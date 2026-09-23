import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { advancePastAiRequestTimeout, hangingFetch, mockError, mockReply } from "../test/apiMocks";
import { ConversationScreen } from "./ConversationScreen";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</div>;
}

// A real data router, not `<MemoryRouter>`: ChatScreen's leave confirmation (issue #33) uses
// `useBlocker`, which only reports blocked navigation against a data router. The extra "/practice"
// entry before `path` gives the system-back tests somewhere to go back to, the way a real user
// always reaches a Practice Conversation via the Practice picker.
function renderAt(path: string) {
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
          { path: "/practice/:categoryId", element: <ConversationScreen /> },
          { path: "/practice/:categoryId/feedback", element: <div>Feedback Summary stub</div> },
        ],
      },
    ],
    { initialEntries: ["/practice", path], initialIndex: 1 },
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

/** Simulates the system back gesture / browser back, which react-router surfaces as a POP navigation. */
async function pressSystemBack(router: ReturnType<typeof createMemoryRouter>) {
  await act(async () => {
    await router.navigate(-1);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ConversationScreen", () => {
  it("redirects to the Practice picker when the URL names an unknown category", () => {
    renderAt("/practice/not-a-real-category");

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("opens a chat with the category's persona and names Practice as the back destination", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jordan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Practice" })).toBeInTheDocument();
  });

  it("names the Scenario Category by id and never sends prompt text of its own", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ messages: [], categoryId: "dating" });
  });

  it("shows the typing indicator inside the transcript rather than as a floating status line", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");

    const indicator = screen.getByRole("status");
    expect(indicator.closest("ul")).toHaveClass("chat-screen__messages");
    expect(indicator).toHaveAccessibleName(/is typing/i);
  });

  it("does not ask before leaving via the back button when no reply has arrived yet", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("does not ask before leaving via the back button when the user hasn't said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("does not ask before leaving via the system back gesture when the user hasn't said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    await pressSystemBack(router);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("asks before leaving via the back button once the user has spoken, and stays put if declined", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);
    const confirmSpy = vi.spyOn(window, "confirm");

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/leave this conversation/i);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Practice picker")).not.toBeInTheDocument();
    expect(screen.getByText("Likewise!")).toBeInTheDocument();
    // The confirmation is the app's own component, never the browser's native dialog.
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("leaves for the Practice picker when the back button's confirmation is accepted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("asks before leaving via the system back gesture once the user has spoken, through the same dialog, and stays put if declined", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    await pressSystemBack(router);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/leave this conversation/i);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Practice picker")).not.toBeInTheDocument();
    expect(screen.getByText("Likewise!")).toBeInTheDocument();
  });

  it("leaves for the Practice picker when the system back gesture's confirmation is accepted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    await pressSystemBack(router);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    });

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("does not ask when ending the conversation, even though the user has spoken", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Feedback Summary stub")).toBeInTheDocument();
  });

  it("navigates to the category's Feedback Summary URL with the transcript when the conversation ends", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    const location = JSON.parse(screen.getByTestId("location").textContent!);
    expect(location.pathname).toBe("/practice/dating/feedback");
    // The conversation's History id is minted as it ends, so the Feedback screen can save it before any feedback exists.
    expect(location.state.entryId).toEqual(expect.any(String));
    expect(location.state.transcript).toEqual([
      { role: "assistant", content: "Hey! Good to see you." },
      { role: "user", content: "Hi, nice to meet you!" },
      { role: "assistant", content: "Likewise!" },
    ]);
  });

  it("disables End & get feedback until the user has sent a message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeDisabled();
  });

  it("enables End & get feedback once the user has sent a message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeEnabled();
  });

  it("keeps End & get feedback disabled when the opening line itself fails, since the user still hasn't said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeDisabled();
  });

  it("keeps End & get feedback available when a later request fails, since the user already said something", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeEnabled();
  });

  it("shows a visible error with a retry action when the AI call fails, and recovers on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockError(429, "rate_limited", "Slow down and try again shortly."))
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/job-interview");

    expect(await screen.findByText("Slow down and try again shortly.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a visible timeout error with a retry action when the AI never responds, and recovers on retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(hangingFetch())
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/job-interview");
    await advancePastAiRequestTimeout();

    expect(screen.getByText("The request timed out. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry automatically after a failure", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/small-talk");

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains a safety-blocked reply in plain language with a way forward, and keeps the conversation usable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(
        mockError(422, "blocked", "The AI can't respond to that message. Try rephrasing it, or end the conversation to see your feedback so far."),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Something that trips the filter" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/can't respond to that message/i);
    expect(alert).toHaveTextContent(/rephrasing/i);
    expect(alert.textContent).not.toMatch(/safety|blockreason|gemini|422/i);

    // Nothing is lost: the user's turn is still in the transcript, and ending the conversation
    // still works from this state.
    expect(screen.getByText("Something that trips the filter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));
    const location = JSON.parse(screen.getByTestId("location").textContent!);
    expect(location.pathname).toBe("/practice/dating/feedback");
  });

  it("explains an empty AI reply in plain language rather than showing a blank bubble", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(
        mockError(
          502,
          "provider_error",
          "The AI didn't send back a reply that time. Try again, or end the conversation to see your feedback so far.",
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/didn't send back a reply/i);
    expect(alert).toHaveTextContent(/try again/i);

    const bubbles = screen.getAllByRole("listitem");
    expect(bubbles.every((bubble) => bubble.textContent && bubble.textContent.trim().length > 0)).toBe(true);
  });
});
