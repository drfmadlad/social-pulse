import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "../db";
import { MAX_OWN_SCENARIO_LENGTH } from "../requestLimits";
import { LocationDisplay } from "../test/LocationDisplay";
import { settleDeviceReads } from "../test/settleDeviceReads";
import { pressSystemBack } from "../test/systemBack";
import { deleteOwnScenario, getAllOwnScenarios, saveOwnScenario } from "./ownScenarioStore";
import { OwnScenarioBriefScreen } from "./OwnScenarioBriefScreen";

// The real store, watched: a test can make one save or delete fail.
vi.mock("./ownScenarioStore", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ownScenarioStore")>();
  return {
    ...original,
    saveOwnScenario: vi.fn(original.saveOwnScenario),
    deleteOwnScenario: vi.fn(original.deleteOwnScenario),
  };
});

async function renderBrief() {
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
          { path: "/practice/own", element: <OwnScenarioBriefScreen /> },
          { path: "/practice/own/:scenarioId", element: <p>Conversation opened</p> },
        ],
      },
    ],
    { initialEntries: ["/practice", "/practice/own"], initialIndex: 1 },
  );
  const view = render(<RouterProvider router={router} />);
  await settleDeviceReads();
  // Either the form (nothing saved) or the chooser's Start: the saved ones have been read. A slow
  // read under load mustn't make a test that follows look at a screen that hasn't loaded yet.
  await waitFor(() =>
    expect(screen.queryByLabelText("Who you'll be talking to") ?? screen.queryByRole("button", { name: "Start" })).not.toBeNull(),
  );
  return { ...view, router };
}

const dana = { name: "Dana", about: "my manager of two years", situation: "I want to ask Dana for a raise." };
const sam = { name: "Sam", about: "", situation: "Telling my roommate I'm moving out." };

function field(name: string) {
  return screen.getByLabelText(name);
}

function fillForm({ name, about, situation }: { name?: string; about?: string; situation?: string }) {
  if (name !== undefined) fireEvent.change(field("Who you'll be talking to"), { target: { value: name } });
  if (about !== undefined) fireEvent.change(field("A line about them"), { target: { value: about } });
  if (situation !== undefined) fireEvent.change(field("The situation"), { target: { value: situation } });
}

function location() {
  return screen.getByTestId("location").textContent;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await resetDbForTests();
});

describe("OwnScenarioBriefScreen (issue #67)", () => {
  describe("with nothing saved yet", () => {
    it("is titled Your own, names Practice as the way back, and goes straight to the form", async () => {
      await renderBrief();

      expect(screen.getByRole("heading", { level: 1, name: "Your own" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "← Practice" })).toHaveAttribute("href", "/practice");
      expect(field("Who you'll be talking to")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    });

    it("saves what was written, then shows it as the chosen situation, ready to start", async () => {
      await renderBrief();

      fillForm(dana);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("button", { name: "Start" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Dana/ })).toBeChecked();
      expect(screen.getByText(dana.situation, { selector: "dd" })).toBeInTheDocument();
      expect(screen.getByText(/my manager of two years/, { selector: "dd" })).toBeInTheDocument();
      const saved = await getAllOwnScenarios();
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject(dana);
    });

    it("asks for a name and a situation before saving, and saves nothing until it has them", async () => {
      await renderBrief();

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(field("Who you'll be talking to")).toBeInvalid();
      expect(screen.getByText("Say who you'll be talking to.")).toBeInTheDocument();
      expect(screen.getByText("Describe the situation.")).toBeInTheDocument();
      expect(await getAllOwnScenarios()).toEqual([]);
    });

    it("takes the line about them as optional", async () => {
      await renderBrief();

      fillForm(sam);
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("button", { name: "Start" })).toBeInTheDocument();
      expect((await getAllOwnScenarios())[0]).toMatchObject({ name: "Sam", about: "" });
    });
  });

  describe("the length limit", () => {
    it("counts the characters left across all three parts", async () => {
      await renderBrief();

      fillForm({ name: "Dana", about: "my manager", situation: "Asking for a raise." });

      expect(screen.getByText(`${MAX_OWN_SCENARIO_LENGTH - 33} of ${MAX_OWN_SCENARIO_LENGTH} characters left.`)).toBeInTheDocument();
    });

    it("stops the situation at what the name and the line leave of the cap, so a long paste is cut short rather than refused", async () => {
      await renderBrief();

      fillForm({ name: "Dana", about: "my manager" });

      expect(field("The situation")).toHaveAttribute("maxlength", String(MAX_OWN_SCENARIO_LENGTH - 14));
      expect(field("Who you'll be talking to")).toHaveAttribute("maxlength", "40");
      expect(field("A line about them")).toHaveAttribute("maxlength", "160");
    });

    it("won't save text over the cap, which only the name or the line can push it to once the situation is written", async () => {
      await renderBrief();
      fillForm({ name: "D", about: "", situation: "s".repeat(MAX_OWN_SCENARIO_LENGTH - 1) });

      fillForm({ name: "Dana the manager" });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText(/over the 500 characters in all/)).toBeInTheDocument();
      expect(await getAllOwnScenarios()).toEqual([]);
    });
  });

  describe("with Own Scenarios saved", () => {
    async function renderWithSaved() {
      await saveOwnScenario(dana);
      // Listed newest first by when each was written, so they can't be saved in the same millisecond.
      await new Promise((resolve) => setTimeout(resolve, 5));
      await saveOwnScenario(sam);
      return renderBrief();
    }

    it("offers each as a choice, the newest chosen, and shows the chosen one's situation", async () => {
      await renderWithSaved();

      const chooser = screen.getByRole("group", { name: "Your situations" });
      expect(within(chooser).getAllByRole("radio")).toHaveLength(2);
      expect(screen.getByRole("radio", { name: /Sam/ })).toBeChecked();
      expect(screen.getByText(sam.situation, { selector: "dd" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("radio", { name: /Dana/ }));

      expect(screen.getByText(dana.situation, { selector: "dd" })).toBeInTheDocument();
      expect(screen.queryByText(sam.situation, { selector: "dd" })).not.toBeInTheDocument();
    });

    it("offers the optional Focus, as a category's brief does", async () => {
      await renderWithSaved();

      expect(screen.getByRole("group", { name: "Focus" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "None" })).toBeChecked();
    });

    it("starts a Conversation with the chosen one, replacing the brief, so back leads to the Practice picker", async () => {
      const { router } = await renderWithSaved();
      const [saved] = (await getAllOwnScenarios()).filter((own) => own.name === "Dana");

      fireEvent.click(screen.getByRole("radio", { name: /Dana/ }));
      fireEvent.click(screen.getByRole("button", { name: "Start" }));

      expect(screen.getByText("Conversation opened")).toBeInTheDocument();
      expect(location()).toBe(`/practice/own/${saved.id}`);
      await pressSystemBack(router);
      expect(screen.getByText("Practice picker")).toBeInTheDocument();
    });

    it("carries a Focus into the Conversation's URL", async () => {
      await renderWithSaved();
      const [saved] = (await getAllOwnScenarios()).filter((own) => own.name === "Sam");

      fireEvent.click(screen.getByRole("radio", { name: "Staying calm" }));
      fireEvent.click(screen.getByRole("button", { name: "Start" }));

      expect(location()).toBe(`/practice/own/${saved.id}?focus=staying-calm`);
    });

    it("writes another from Write your own, which Cancel goes back from", async () => {
      await renderWithSaved();

      fireEvent.click(screen.getByRole("button", { name: "Write your own" }));
      expect(screen.getByRole("heading", { level: 2, name: "Write your own" })).toBeInTheDocument();
      expect(field("Who you'll be talking to")).toHaveFocus();
      expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Write your own" }));
      fillForm({ name: "Priya", situation: "Meeting her parents for the first time." });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByRole("radio", { name: /Priya/ })).toBeChecked();
      expect(await getAllOwnScenarios()).toHaveLength(3);
    });

    it("edits the chosen one in place", async () => {
      await renderWithSaved();
      fireEvent.click(screen.getByRole("radio", { name: /Dana/ }));

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(field("Who you'll be talking to")).toHaveValue("Dana");
      expect(field("The situation")).toHaveValue(dana.situation);
      fillForm({ situation: "I want to ask Dana for Fridays off." });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(await screen.findByText("I want to ask Dana for Fridays off.", { selector: "dd" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Dana/ })).toBeChecked();
      const saved = await getAllOwnScenarios();
      expect(saved).toHaveLength(2);
      expect(saved.find((own) => own.name === "Dana")?.situation).toBe("I want to ask Dana for Fridays off.");
    });

    it("deletes the chosen one only after asking, and says conversations had in it stay in History", async () => {
      await renderWithSaved();
      fireEvent.click(screen.getByRole("radio", { name: /Dana/ }));

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toHaveTextContent("Dana");
      expect(dialog).toHaveTextContent("stay in History");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(await getAllOwnScenarios()).toHaveLength(2);

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(screen.queryByRole("radio", { name: /Dana/ })).not.toBeInTheDocument());
      expect(screen.getByRole("radio", { name: /Sam/ })).toBeChecked();
      expect((await getAllOwnScenarios()).map((own) => own.name)).toEqual(["Sam"]);
    });

    it("goes back to the form when the last one is deleted", async () => {
      await saveOwnScenario(dana);
      await renderBrief();

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

      expect(await screen.findByLabelText("Who you'll be talking to")).toBeInTheDocument();
      expect(await getAllOwnScenarios()).toEqual([]);
    });

    it("says so, and keeps it, when a delete fails", async () => {
      await renderWithSaved();
      vi.mocked(deleteOwnScenario).mockRejectedValueOnce(new Error("disk full"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("still saved");
      expect(screen.getByRole("radio", { name: /Sam/ })).toBeInTheDocument();
    });
  });

  it("says so, and keeps the form as it was, when a save fails", async () => {
    await renderBrief();
    vi.mocked(saveOwnScenario).mockRejectedValueOnce(new Error("disk full"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    fillForm(dana);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save that");
    expect(field("Who you'll be talking to")).toHaveValue("Dana");
  });
});
