import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_CONVERSATION_MESSAGES, MAX_MESSAGE_LENGTH } from "../requestLimits";
import { advancePastAiRequestTimeout, hangingFetch, mockError, mockReply } from "../test/apiMocks";
import { pressSystemBack } from "../test/systemBack";
import { ConversationScreen } from "./ConversationScreen";
import { defaultScenarioOf } from "./scenarios";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</div>;
}

// A real data router, not `<MemoryRouter>`: ChatScreen's leave confirmation (issue #33) uses
// `useBlocker`, which only reports blocked navigation against a data router. The extra "/practice"
// entry before `path` gives the system-back tests somewhere to go back to, the way a real user
// always reaches a Practice Conversation via the Practice picker.
function renderAt(path: string, { strictMode = false }: { strictMode?: boolean } = {}) {
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
          { path: "/practice/:categoryId", element: <div>Scenario brief</div> },
          { path: "/practice/:categoryId/:scenarioId", element: <ConversationScreen /> },
          { path: "/practice/:categoryId/feedback/:entryId", element: <div>Feedback Summary stub</div> },
        ],
      },
    ],
    { initialEntries: ["/practice", path], initialIndex: 1 },
  );
  const app = <RouterProvider router={router} />;
  const view = render(strictMode ? <StrictMode>{app}</StrictMode> : app);
  return { ...view, router };
}

/** A promise the test settles by hand, for holding a reply in flight while asserting on the wait. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function requestedMessages(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  const [, init] = fetchMock.mock.calls[callIndex];
  return JSON.parse(init.body as string).messages;
}

function sendMessage(content: string) {
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: content } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ConversationScreen", () => {
  it("redirects to the Practice picker when the URL names an unknown category", () => {
    renderAt("/practice/not-a-real-category/coffee-first-date");

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("opens a chat with the category's persona and names Practice as the back destination", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jordan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Practice" })).toBeInTheDocument();
  });

  it("redirects to the category's Scenario brief when the URL names a Scenario it doesn't have", () => {
    renderAt("/practice/networking/coffee-first-date");

    expect(screen.getByText("Scenario brief")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("location").textContent!).pathname).toBe("/practice/networking");
  });

  it("keeps the Scenario's situation and the user's role in view at the top of the transcript", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you.")));
    const scenario = defaultScenarioOf("dating")!;

    renderAt(`/practice/dating/${scenario.id}`);
    await screen.findByText("Hey! Good to see you.");

    expect(screen.getByText(scenario.situation)).toBeInTheDocument();
    expect(screen.getByText(`Your role: ${scenario.role}`)).toBeInTheDocument();
  });

  it("names the Scenario Category and Scenario by id and never sends prompt text of its own", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ messages: [], categoryId: "dating", scenarioId: "coffee-first-date" });
  });

  describe("with a Focus (issue #65)", () => {
    async function endAfterOneLine(path: string) {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
        .mockResolvedValueOnce(mockReply("Likewise!"));
      vi.stubGlobal("fetch", fetchMock);
      renderAt(path);
      await screen.findByText("Hey! Good to see you.");
      sendMessage("Hi, nice to meet you!");
      await screen.findByText("Likewise!");
      fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));
      return { fetchMock, location: JSON.parse(screen.getByTestId("location").textContent!) };
    }

    it("hands the Focus on to the Feedback Summary as the conversation ends", async () => {
      const { location } = await endAfterOneLine("/practice/dating/coffee-first-date?focus=staying-calm");

      expect(location.pathname).toMatch(/^\/practice\/dating\/feedback\/[^/]+$/);
      expect(location.state.focusId).toBe("staying-calm");
    });

    it("hands on no Focus when the conversation had none", async () => {
      const { location } = await endAfterOneLine("/practice/dating/coffee-first-date");

      expect(location.state).not.toHaveProperty("focusId");
    });

    it("keeps the Focus from the Persona: it's for the feedback, not the conversation", async () => {
      const { fetchMock } = await endAfterOneLine("/practice/dating/coffee-first-date?focus=staying-calm");

      for (const [, init] of fetchMock.mock.calls) {
        expect(init.body as string).not.toMatch(/focus|staying/i);
      }
    });

    it("redirects to the category's Scenario brief when the URL names a Focus the app doesn't offer", () => {
      renderAt("/practice/dating/coffee-first-date?focus=not-a-real-focus");

      expect(screen.getByText("Scenario brief")).toBeInTheDocument();
      expect(JSON.parse(screen.getByTestId("location").textContent!).pathname).toBe("/practice/dating");
    });
  });

  it("shows the typing indicator inside the transcript rather than as a floating status line", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");

    const indicator = screen.getByRole("status");
    expect(indicator.closest("ul")).toHaveClass("chat-screen__messages");
    expect(indicator).toHaveAccessibleName(/is typing/i);
  });

  it("does not ask before leaving via the back button when no reply has arrived yet", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");
    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("does not ask before leaving via the back button when the user hasn't said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("does not ask before leaving via the system back gesture when the user hasn't said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderAt("/practice/dating/coffee-first-date");
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

    renderAt("/practice/dating/coffee-first-date");
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

    renderAt("/practice/dating/coffee-first-date");
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

    const { router } = renderAt("/practice/dating/coffee-first-date");
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

    const { router } = renderAt("/practice/dating/coffee-first-date");
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

    renderAt("/practice/dating/coffee-first-date");
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

    renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    const location = JSON.parse(screen.getByTestId("location").textContent!);
    // The conversation's History id is minted as it ends, and travels in the URL itself so it
    // survives a reload of the Feedback screen, not just as router state.
    expect(location.pathname).toMatch(/^\/practice\/dating\/feedback\/[^/]+$/);
    expect(location.state.transcript).toEqual([
      { role: "assistant", content: "Hey! Good to see you." },
      { role: "user", content: "Hi, nice to meet you!" },
      { role: "assistant", content: "Likewise!" },
    ]);
    // So its History entry records the Scenario it was set in (issue #53).
    expect(location.state.scenarioId).toBe("coffee-first-date");
  });

  it("replaces the ended conversation with its Feedback Summary, so system back can't reopen it as a live one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");
    sendMessage("Hi, nice to meet you!");
    await screen.findByText("Likewise!");
    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));
    expect(screen.getByText("Feedback Summary stub")).toBeInTheDocument();

    await pressSystemBack(router);

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("disables End & get feedback until the user has sent a message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");

    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeDisabled();
  });

  it("enables End & get feedback once the user has sent a message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeEnabled();
  });

  it("keeps End & get feedback disabled when the opening line itself fails, since the user still hasn't said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End & get feedback" })).toBeDisabled();
  });

  it("keeps End & get feedback available when a later request fails, since the user already said something", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating/coffee-first-date");
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

    renderAt("/practice/job-interview/first-interview");

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

    renderAt("/practice/job-interview/first-interview");
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

    renderAt("/practice/small-talk/break-room");

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

    renderAt("/practice/dating/coffee-first-date");
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
    expect(location.pathname).toMatch(/^\/practice\/dating\/feedback\/[^/]+$/);
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

    renderAt("/practice/dating/coffee-first-date");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/didn't send back a reply/i);
    expect(alert).toHaveTextContent(/try again/i);

    const bubbles = screen.getAllByRole("listitem");
    expect(bubbles.every((bubble) => bubble.textContent && bubble.textContent.trim().length > 0)).toBe(true);
  });

  // The conversation model's transitions (issue #46), driven the way a user drives them: the
  // opening line, sending, a reply arriving, an error, and retrying it.
  describe("turn by turn", () => {
    it("waits for the Persona's opening line with the composer locked, then hands the turn to the user", async () => {
      const opening = deferred<Response>();
      const fetchMock = vi.fn().mockReturnValueOnce(opening.promise);
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");

      expect(screen.getByRole("status")).toHaveAccessibleName("Jordan is typing");
      expect(screen.getByLabelText("Message")).toBeDisabled();
      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "End & get feedback" })).toBeDisabled();

      await act(async () => opening.resolve(mockReply("Hey! Good to see you.")));

      expect(screen.getByText("Hey! Good to see you.")).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toBeEnabled();
    });

    it("shows the user's line straight away and clears the composer, keeping it locked until the reply arrives", async () => {
      const reply = deferred<Response>();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
        .mockReturnValueOnce(reply.promise);
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");
      sendMessage("  Hi, nice to meet you!  ");

      expect(screen.getByText("Hi, nice to meet you!")).toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toHaveValue("");
      expect(screen.getByLabelText("Message")).toBeDisabled();
      expect(screen.getByRole("status")).toHaveAccessibleName("Jordan is typing");
      expect(screen.getByRole("button", { name: "End & get feedback" })).toBeDisabled();

      await act(async () => reply.resolve(mockReply("Likewise!")));

      expect(screen.getAllByRole("listitem").map((bubble) => bubble.querySelector("p")?.textContent)).toEqual([
        "Hey! Good to see you.",
        "Hi, nice to meet you!",
        "Likewise!",
      ]);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toBeEnabled();
    });

    it("sends the whole conversation so far with each new line", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
        .mockResolvedValueOnce(mockReply("Likewise!"))
        .mockResolvedValueOnce(mockReply("I'm good, thanks."));
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");
      sendMessage("Hi, nice to meet you!");
      await screen.findByText("Likewise!");
      sendMessage("How are you?");
      await screen.findByText("I'm good, thanks.");

      expect(requestedMessages(fetchMock, 2)).toEqual([
        { role: "assistant", content: "Hey! Good to see you." },
        { role: "user", content: "Hi, nice to meet you!" },
        { role: "assistant", content: "Likewise!" },
        { role: "user", content: "How are you?" },
      ]);
    });

    it("won't send a message that's only whitespace", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "   " } });

      expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
      fireEvent.submit(screen.getByLabelText("Message"));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("clears the error and waits again while a retry is on its way", async () => {
      const retry = deferred<Response>();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
        .mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."))
        .mockReturnValueOnce(retry.promise);
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");
      sendMessage("Hi, nice to meet you!");
      await screen.findByText("Something broke.");

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAccessibleName("Jordan is typing");
      expect(screen.getByLabelText("Message")).toBeDisabled();

      await act(async () => retry.resolve(mockReply("Likewise!")));

      expect(screen.getByText("Likewise!")).toBeInTheDocument();
    });

    it("retries a failed line by resending the same conversation, without repeating the user's line", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
        .mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."))
        .mockResolvedValueOnce(mockReply("Likewise!"));
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");
      sendMessage("Hi, nice to meet you!");
      await screen.findByText("Something broke.");

      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await screen.findByText("Likewise!");

      expect(requestedMessages(fetchMock, 2)).toEqual(requestedMessages(fetchMock, 1));
      expect(screen.getAllByRole("listitem").map((bubble) => bubble.querySelector("p")?.textContent)).toEqual([
        "Hey! Good to see you.",
        "Hi, nice to meet you!",
        "Likewise!",
      ]);
    });

    it("keeps a failed line in the conversation when the user sends another instead of retrying", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
        .mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."))
        .mockResolvedValueOnce(mockReply("Likewise!"));
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");
      sendMessage("Hi, nice to meet you!");
      await screen.findByText("Something broke.");

      sendMessage("Sorry, hello!");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await screen.findByText("Likewise!");
      expect(requestedMessages(fetchMock, 2)).toEqual([
        { role: "assistant", content: "Hey! Good to see you." },
        { role: "user", content: "Hi, nice to meet you!" },
        { role: "user", content: "Sorry, hello!" },
      ]);
    });

    it("caps each line at the length the server accepts, so a long paste can't be rejected", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you.")));

      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Hey! Good to see you.");

      expect(screen.getByLabelText("Message")).toHaveAttribute("maxLength", String(MAX_MESSAGE_LENGTH));
    });

    it("shows only the latest opening line when the conversation is started twice in a row", async () => {
      // React StrictMode mounts the screen, tears it down and mounts it again in development,
      // so the opening line is asked for twice; only the second request's reply may land.
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockReply("An opening line nobody should see."))
        .mockResolvedValueOnce(mockReply("Hey! Good to see you."));
      vi.stubGlobal("fetch", fetchMock);

      renderAt("/practice/dating/coffee-first-date", { strictMode: true });

      expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("An opening line nobody should see.")).not.toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });
  });

  // The length limit (issue #58): the server takes at most MAX_CONVERSATION_MESSAGES per request,
  // so the conversation stops offering the composer before it could build a longer one.
  describe("length limit", () => {
    const NEARLY_FULL = /nearly as long as it can go/i;
    const FULL = /is as long as it can go/i;

    /**
     * Answers every request with a fresh numbered reply ("Reply 1", "Reply 2"…), or with an error
     * where `failWhen` says so. `nextReply` names the reply the next request will get.
     */
    function answerEveryLine({ failWhen }: { failWhen?: (messages: unknown[]) => boolean } = {}) {
      let replies = 0;
      const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const { messages } = JSON.parse(init!.body as string) as { messages: unknown[] };
        if (failWhen?.(messages)) return mockError(500, "provider_error", "Something broke.");
        replies += 1;
        return mockReply(`Reply ${replies}`);
      });
      vi.stubGlobal("fetch", fetchMock);
      return { fetchMock, nextReply: () => `Reply ${replies + 1}` };
    }

    /** Keeps talking, a line at a time and each reply landing, until `isDone`. Returns how many lines it took. */
    async function talkUntil(isDone: () => boolean, nextReply: () => string) {
      let linesSent = 0;
      while (!isDone()) {
        linesSent += 1;
        expect(linesSent).toBeLessThanOrEqual(MAX_CONVERSATION_MESSAGES); // never loop forever
        const reply = nextReply();
        sendMessage(`Line ${linesSent}`);
        await screen.findByText(reply);
      }
      return linesSent;
    }

    const composerIsGone = () => screen.queryByLabelText("Message") === null;

    function expectEveryRequestWithinTheLimit(fetchMock: ReturnType<typeof vi.fn>) {
      fetchMock.mock.calls.forEach((_call, index) => {
        expect(requestedMessages(fetchMock, index).length).toBeLessThanOrEqual(MAX_CONVERSATION_MESSAGES);
      });
    }

    /** Ends the conversation from the End & get feedback that took the composer's place. */
    function endFromWhereTheComposerWas() {
      const limitNote = screen.getByText(FULL);
      fireEvent.click(within(limitNote.parentElement!).getByRole("button", { name: "End & get feedback" }));
      return JSON.parse(screen.getByTestId("location").textContent!);
    }

    it("says nothing about length early in a conversation", async () => {
      const { nextReply } = answerEveryLine();
      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Reply 1");

      await talkUntil(() => screen.queryByText("Reply 6") !== null, nextReply);

      expect(screen.queryByText(NEARLY_FULL)).not.toBeInTheDocument();
      expect(screen.queryByText(FULL)).not.toBeInTheDocument();
    });

    it("says quietly, a few lines before the limit, that the conversation is nearly as long as it can go", async () => {
      const { nextReply } = answerEveryLine();
      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Reply 1");

      await talkUntil(() => screen.queryByText(NEARLY_FULL) !== null, nextReply);

      // A polite note, not an error, and the composer is still there to keep talking.
      expect(screen.getByText(NEARLY_FULL)).toHaveAttribute("role", "status");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toBeEnabled();

      const linesAfterTheNote = await talkUntil(composerIsGone, nextReply);
      expect(linesAfterTheNote).toBe(3);
    });

    it("at the limit, the composer gives way to End & get feedback, which ends the conversation with every line", async () => {
      const { fetchMock, nextReply } = answerEveryLine();
      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Reply 1");

      const linesSent = await talkUntil(composerIsGone, nextReply);

      expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
      expect(screen.queryByText(NEARLY_FULL)).not.toBeInTheDocument();
      expect(screen.getByText(FULL)).toHaveAttribute("role", "status");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expectEveryRequestWithinTheLimit(fetchMock);

      const location = endFromWhereTheComposerWas();

      expect(location.pathname).toMatch(/^\/practice\/dating\/feedback\/[^/]+$/);
      // The opening line, then each of the user's lines and its reply.
      expect(location.state.transcript).toHaveLength(1 + 2 * linesSent);
      expect(location.state.transcript.length).toBeLessThanOrEqual(MAX_CONVERSATION_MESSAGES);
    });

    it("stays within the limit when a reply near it fails and the user sends another line instead of retrying", async () => {
      // Fails the reply to the last line that fits, the first time it's asked for.
      let hasFailed = false;
      const { fetchMock, nextReply } = answerEveryLine({
        failWhen: (messages) => {
          if (hasFailed || messages.length < MAX_CONVERSATION_MESSAGES - 2) return false;
          hasFailed = true;
          return true;
        },
      });
      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Reply 1");

      while (!hasFailed) {
        sendMessage("Still here");
        await waitFor(() => expect(screen.getByLabelText("Message")).toBeEnabled());
      }

      // The failed line stays in the conversation, and there's still room for one more line.
      expect(screen.getByRole("alert")).toHaveTextContent("Something broke.");
      expect(screen.getByLabelText("Message")).toBeEnabled();

      await talkUntil(composerIsGone, nextReply);

      expect(screen.getByText(FULL)).toBeInTheDocument();
      expectEveryRequestWithinTheLimit(fetchMock);
      const location = endFromWhereTheComposerWas();
      expect(location.state.transcript.length).toBeLessThanOrEqual(MAX_CONVERSATION_MESSAGES);
    });

    it("reaches the limit with a reply still failed, and keeps both Try again and End & get feedback working", async () => {
      // Fails the reply to the last line that fits, then the reply to the line sent instead of retrying.
      let failures = 0;
      const { fetchMock, nextReply } = answerEveryLine({
        failWhen: (messages) => {
          if (failures >= 2 || messages.length < MAX_CONVERSATION_MESSAGES - 2) return false;
          failures += 1;
          return true;
        },
      });
      renderAt("/practice/dating/coffee-first-date");
      await screen.findByText("Reply 1");

      while (failures < 1) {
        sendMessage("Still here");
        await waitFor(() => expect(screen.getByLabelText("Message")).toBeEnabled());
      }
      sendMessage("Sorry, as I was saying");
      await waitFor(() => expect(failures).toBe(2));

      // The limit is reached with the reply failed: no composer, and no validation error either.
      expect(await screen.findByText(FULL)).toBeInTheDocument();
      expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Something broke.");
      expect(within(screen.getByText(FULL).parentElement!).getByRole("button", { name: "End & get feedback" })).toBeEnabled();

      const reply = nextReply();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await screen.findByText(reply);

      expectEveryRequestWithinTheLimit(fetchMock);
      const location = endFromWhereTheComposerWas();
      expect(location.state.transcript).toHaveLength(MAX_CONVERSATION_MESSAGES);
    });
  });
});
