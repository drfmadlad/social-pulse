import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockError, mockReply } from "../test/apiMocks";
import { ConversationScreen } from "./ConversationScreen";

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationDisplay />
      <Routes>
        <Route path="/practice" element={<div>Practice picker</div>} />
        <Route path="/practice/:categoryId" element={<ConversationScreen />} />
        <Route path="/practice/:categoryId/feedback" element={<div>Feedback Summary stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("shows the typing indicator inside the transcript rather than as a floating status line", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/dating");

    const indicator = screen.getByRole("status");
    expect(indicator.closest("ul")).toHaveClass("chat-screen__messages");
    expect(indicator).toHaveAccessibleName(/is typing/i);
  });

  it("does not ask for confirmation when backing out before any reply has arrived", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const confirmSpy = vi.spyOn(window, "confirm");

    renderAt("/practice/dating");
    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("does not ask for confirmation when backing out before the user has said anything", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);
    const confirmSpy = vi.spyOn(window, "confirm");

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("asks for confirmation before leaving a conversation the user has actually taken part in, and stays if declined", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.queryByText("Practice picker")).not.toBeInTheDocument();
    expect(screen.getByText("Likewise!")).toBeInTheDocument();
  });

  it("navigates back to the Practice picker when leaving a conversation in progress and confirmed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."))
      .mockResolvedValueOnce(mockReply("Likewise!"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderAt("/practice/dating");
    await screen.findByText("Hey! Good to see you.");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi, nice to meet you!" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Likewise!");

    fireEvent.click(screen.getByRole("button", { name: "← Practice" }));

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
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
    expect(location.state.transcript).toEqual([
      { role: "assistant", content: "Hey! Good to see you." },
      { role: "user", content: "Hi, nice to meet you!" },
      { role: "assistant", content: "Likewise!" },
    ]);
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

  it("does not retry automatically after a failure", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    renderAt("/practice/small-talk");

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
