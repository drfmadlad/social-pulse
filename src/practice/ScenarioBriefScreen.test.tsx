import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scenarioCategories } from "./scenarioCategories";
import { focuses } from "./focuses";
import { ScenarioBriefScreen } from "./ScenarioBriefScreen";
import { defaultScenarioOf, pickSurpriseScenario, scenariosIn } from "./scenarios";

// The real pick, watched: a test can see when Surprise me picks, and choose what it picks.
vi.mock("./scenarios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./scenarios")>();
  return { ...actual, pickSurpriseScenario: vi.fn(actual.pickSurpriseScenario) };
});

function LocationDisplay() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

/**
 * The brief as the Practice picker opens it: pushed on top of the picker, with stand-ins for the
 * picker and the Conversation. A data router, so a test can press the system back gesture.
 */
function renderBrief(path = "/practice/dating") {
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
          { path: "/practice", element: <p>Practice picker</p> },
          { path: "/practice/:categoryId", element: <ScenarioBriefScreen /> },
          { path: "/practice/:categoryId/:scenarioId", element: <p>Conversation opened</p> },
        ],
      },
    ],
    { initialEntries: ["/practice", path], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function location() {
  return screen.getByTestId("location").textContent;
}

const dating = scenarioCategories.find((category) => category.id === "dating")!;
const datingScenario = defaultScenarioOf("dating")!;

afterEach(() => {
  vi.mocked(pickSurpriseScenario).mockClear();
});

describe("ScenarioBriefScreen", () => {
  it("introduces the Persona by name, as the screen's heading, and says what they're like", () => {
    renderBrief();

    expect(screen.getByRole("heading", { level: 1, name: "Jordan" })).toBeInTheDocument();
    expect(screen.getByText(dating.personaDescription)).toBeInTheDocument();
    expect(screen.getByText("Dating")).toBeInTheDocument();
  });

  it("offers the category's Scenarios to choose from, with Surprise me chosen by default", () => {
    renderBrief();

    const chooser = screen.getByRole("group", { name: "Situation" });
    expect(chooser).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Surprise me" })).toBeChecked();
    for (const scenario of scenariosIn("dating")) {
      expect(screen.getByRole("radio", { name: scenario.title })).not.toBeChecked();
    }
    expect(within(chooser).getAllByRole("radio")).toHaveLength(scenariosIn("dating").length + 1);
  });

  it("says Surprise me picks a situation when you start, without giving one away", () => {
    renderBrief();

    expect(screen.getByText(/picked when you start/)).toBeInTheDocument();
    expect(screen.queryByText(datingScenario.situation)).not.toBeInTheDocument();
  });

  it("shows a chosen Scenario's situation and the user's role in it", () => {
    renderBrief();

    fireEvent.click(screen.getByRole("radio", { name: datingScenario.title }));

    expect(screen.getByRole("radio", { name: datingScenario.title })).toBeChecked();
    expect(screen.getByText(datingScenario.situation)).toBeInTheDocument();
    expect(screen.getByText(datingScenario.role)).toBeInTheDocument();
    expect(screen.queryByText(/picked when you start/)).not.toBeInTheDocument();
  });

  it("starts the Conversation in the chosen Scenario", () => {
    renderBrief();

    fireEvent.click(screen.getByRole("radio", { name: datingScenario.title }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(screen.getByText("Conversation opened")).toBeInTheDocument();
    expect(location()).toBe(`/practice/dating/${datingScenario.id}`);
  });

  it("with Surprise me, picks the Scenario at random only when Start is tapped, and starts in that one", () => {
    const picked = { ...datingScenario, id: "picked-at-random" };
    vi.mocked(pickSurpriseScenario).mockReturnValueOnce(picked);
    renderBrief();
    expect(pickSurpriseScenario).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(pickSurpriseScenario).toHaveBeenCalledTimes(1);
    expect(pickSurpriseScenario).toHaveBeenCalledWith("dating");
    expect(location()).toBe("/practice/dating/picked-at-random");
  });

  it("doesn't pick at random when a Scenario was chosen", () => {
    renderBrief();

    fireEvent.click(screen.getByRole("radio", { name: datingScenario.title }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(pickSurpriseScenario).not.toHaveBeenCalled();
  });

  describe("Focus (issue #65)", () => {
    it("offers an optional Focus from a short list, with None chosen by default", () => {
      renderBrief();

      const group = screen.getByRole("group", { name: "Focus" });
      expect(group).toHaveAccessibleDescription(/optional/i);
      expect(within(group).getByRole("radio", { name: "None" })).toBeChecked();
      for (const focus of focuses) {
        expect(within(group).getByRole("radio", { name: focus.label })).not.toBeChecked();
      }
      expect(within(group).getAllByRole("radio")).toHaveLength(focuses.length + 1);
    });

    it("keeps the Focus apart from the Situation chooser, so choosing one leaves the other as it was", () => {
      renderBrief();

      fireEvent.click(screen.getByRole("radio", { name: "Staying calm" }));

      expect(screen.getByRole("radio", { name: "Staying calm" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "None" })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: "Surprise me" })).toBeChecked();
    });

    it("starts the Conversation with the chosen Focus in its URL, so a reload keeps it", () => {
      renderBrief();

      fireEvent.click(screen.getByRole("radio", { name: datingScenario.title }));
      fireEvent.click(screen.getByRole("radio", { name: "Asking follow-up questions" }));
      fireEvent.click(screen.getByRole("button", { name: "Start" }));

      expect(screen.getByText("Conversation opened")).toBeInTheDocument();
      expect(location()).toBe(`/practice/dating/${datingScenario.id}?focus=follow-up-questions`);
    });

    it("starts the Conversation with no Focus when None is left chosen, or chosen again", () => {
      renderBrief();

      fireEvent.click(screen.getByRole("radio", { name: datingScenario.title }));
      fireEvent.click(screen.getByRole("radio", { name: "Staying calm" }));
      fireEvent.click(screen.getByRole("radio", { name: "None" }));
      fireEvent.click(screen.getByRole("button", { name: "Start" }));

      expect(location()).toBe(`/practice/dating/${datingScenario.id}`);
    });
  });

  it("goes back to the Practice picker from the Conversation it started, the system back gesture included", async () => {
    const router = renderBrief();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText("Conversation opened")).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });

    expect(location()).toBe("/practice");
  });

  it("names the Practice picker as its back destination", () => {
    renderBrief();

    fireEvent.click(screen.getByRole("link", { name: "← Practice" }));

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("redirects to the Practice picker when the URL names an unknown category", () => {
    renderBrief("/practice/not-a-real-category");

    expect(screen.getByText("Practice picker")).toBeInTheDocument();
  });

  it("introduces each category's own Persona", () => {
    for (const category of scenarioCategories) {
      const view = render(
        <RouterProvider
          router={createMemoryRouter([{ path: "/practice/:categoryId", element: <ScenarioBriefScreen /> }], {
            initialEntries: [`/practice/${category.id}`],
          })}
        />,
      );
      expect(screen.getByRole("heading", { level: 1, name: category.personaName })).toBeInTheDocument();
      view.unmount();
    }
  });
});
