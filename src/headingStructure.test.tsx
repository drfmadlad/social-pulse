import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouteObjects } from "./App";
import { attachFeedbackSummary, resetHistoryStoreForTests, saveEndedConversation } from "./history/historyStore";
import { isChoiceStep, lessons } from "./lessons/lessons";
import { scenarioCategories } from "./practice/scenarioCategories";
import { mockReply, mockWrittenReplyVerdict } from "./test/apiMocks";
import { expectSaneHeadingHierarchy } from "./test/headingStructure";
import { settleDeviceReads } from "./test/settleDeviceReads";

async function renderScreen(path: string) {
  const router = createMemoryRouter(
    [
      {
        id: "heading-structure-test-root",
        element: <Outlet />,
        children: createAppRouteObjects(),
      },
    ],
    { initialEntries: [path] },
  );
  const view = render(<RouterProvider router={router} />);
  await settleDeviceReads();
  return view;
}

const datingCategory = scenarioCategories.find((category) => category.id === "dating")!;
const transcript = [{ role: "user" as const, content: "Hi, nice to meet you!" }];
const summary = { didWell: [{ quote: "Hi, nice to meet you!" }], canImprove: [{ quote: "Hi, nice to meet you!" }] };

afterEach(async () => {
  vi.unstubAllGlobals();
  await resetHistoryStoreForTests();
});

describe("heading structure", () => {
  it("Home has exactly one h1 and no skipped levels", async () => {
    const { container } = await renderScreen("/");
    expectSaneHeadingHierarchy(container);
  });

  it("Practice picker has exactly one h1 and no skipped levels", async () => {
    const { container } = await renderScreen("/practice");
    expectSaneHeadingHierarchy(container);
  });

  it("Conversation has exactly one h1 and no skipped levels", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockReply("Hey! Good to see you.")));
    const { container, findByText } = await renderScreen("/practice/dating");
    await findByText("Hey! Good to see you.");
    expectSaneHeadingHierarchy(container);
  });

  it("Feedback Summary has exactly one h1 and no skipped levels", async () => {
    await saveEndedConversation({ id: "entry-1", category: datingCategory, transcript });
    await attachFeedbackSummary("entry-1", summary);
    const { container, findByText } = await renderScreen("/practice/dating/feedback/entry-1");
    await findByText("What you did well");
    expectSaneHeadingHierarchy(container);
  });

  it("Lessons list has exactly one h1 and no skipped levels", async () => {
    const { container } = await renderScreen("/lessons");
    expectSaneHeadingHierarchy(container);
  });

  it("Lesson flow has exactly one h1 and no skipped levels on every kind of step", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockWrittenReplyVerdict("landed", "Nicely put.")));
    const lesson = lessons.find((candidate) => candidate.id === "active-listening")!;
    const kinds = new Set(lesson.steps.map((step) => step.kind));
    expect(kinds).toEqual(new Set(["explainer", "check", "reply-choice", "written-reply", "recap"]));
    const { container } = await renderScreen(`/lessons/${lesson.id}`);

    for (const step of lesson.steps) {
      expectSaneHeadingHierarchy(container);
      if (step.kind === "recap") break;
      if (isChoiceStep(step)) {
        fireEvent.click(screen.getAllByRole("radio")[0]);
        fireEvent.click(screen.getByRole("button", { name: "Check" }));
        expectSaneHeadingHierarchy(container);
      }
      if (step.kind === "written-reply") {
        fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "Something I'd say." } });
        fireEvent.click(screen.getByRole("button", { name: "Send" }));
        await screen.findByText("Nicely put.");
        expectSaneHeadingHierarchy(container);
      }
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    }
  });

  it("History list has exactly one h1 and no skipped levels", async () => {
    const { container } = await renderScreen("/history");
    expectSaneHeadingHierarchy(container);
  });

  it("History entry detail has exactly one h1 and no skipped levels", async () => {
    await saveEndedConversation({ id: "entry-1", category: datingCategory, transcript });
    await attachFeedbackSummary("entry-1", summary);
    const { container, findByText } = await renderScreen("/history/entry-1");
    await findByText("What you did well");
    expectSaneHeadingHierarchy(container);
  });
});
