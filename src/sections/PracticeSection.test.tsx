import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scenarioCategories } from "../practice/scenarioCategories";
import { PracticeSection } from "./PracticeSection";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockReply(content: string): Response {
  return jsonResponse(200, { message: { role: "assistant", content } });
}

function mockError(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PracticeSection", () => {
  it("lists all six Scenario Categories", () => {
    render(<PracticeSection />);

    expect(scenarioCategories).toHaveLength(6);
    for (const category of scenarioCategories) {
      expect(screen.getByRole("button", { name: category.name })).toBeInTheDocument();
    }
  });

  it("opens a chat with the category's persona, sends a message, and ends the conversation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockReply("Hey! Thanks for coming out tonight."))
      .mockResolvedValueOnce(mockReply("That sounds like a great start!"));
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Dating" }));

    expect(await screen.findByText("Jordan")).toBeInTheDocument();
    expect(await screen.findByText("Hey! Thanks for coming out tonight.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hi, nice to meet you!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("That sounds like a great start!")).toBeInTheDocument();
    expect(screen.getByText("Hi, nice to meet you!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End & get feedback" }));

    expect(await screen.findByText(/Conversation with Jordan ended/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a visible error with a retry action when an AI call fails, and recovers on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockError(429, "rate_limited", "Slow down and try again shortly."))
      .mockResolvedValueOnce(mockReply("Hey! Good to see you."));
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Job Interview" }));

    expect(await screen.findByText("Slow down and try again shortly.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Hey! Good to see you.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry automatically after a failure", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockError(500, "provider_error", "Something broke."));
    vi.stubGlobal("fetch", fetchMock);

    render(<PracticeSection />);
    fireEvent.click(screen.getByRole("button", { name: "Small Talk" }));

    expect(await screen.findByText("Something broke.")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
