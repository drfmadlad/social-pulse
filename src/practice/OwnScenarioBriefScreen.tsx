import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DeleteOwnScenarioDialog } from "./DeleteOwnScenarioDialog";
import type { Focus } from "./focuses";
import { FocusPicker } from "./FocusPicker";
import { newConversationStart } from "./inProgressConversation";
import { deleteOwnScenario, saveOwnScenario } from "./ownScenarioStore";
import { OwnScenarioForm } from "./OwnScenarioForm";
import { OWN_CATEGORY_ID, type OwnScenario, type OwnScenarioText } from "./ownScenarios";
import { conversationPath } from "./practicePaths";
import { useOwnScenarios } from "./useOwnScenarios";

/** What the brief is doing besides listing: writing a new Own Scenario, or editing a saved one. */
type Editing = { kind: "new"; byRequest: boolean } | { kind: "edit"; id: string };

/**
 * The Scenario brief in Own mode (INFORMATION-ARCHITECTURE.md, Scenario brief, issue #67): the
 * user's saved Own Scenarios as the chooser, with Write your own for a new one, and edit and delete
 * for the chosen one. Start opens a Conversation with the person they described. Own Scenarios are
 * kept on-device, so nothing here needs a connection until a Conversation starts.
 */
export function OwnScenarioBriefScreen() {
  const navigate = useNavigate();
  const chooserName = useId();
  const ownScenarios = useOwnScenarios();
  const [choiceId, setChoiceId] = useState<string>();
  const [editing, setEditing] = useState<Editing>();
  const [focus, setFocus] = useState<Focus | undefined>(undefined);
  const [deleting, setDeleting] = useState<OwnScenario>();
  const [deleteFailed, setDeleteFailed] = useState(false);

  // The chosen one, or the newest while nothing's been chosen (or the chosen one was deleted).
  const chosen = ownScenarios?.find((own) => own.id === choiceId) ?? ownScenarios?.[0];
  // With none saved there's nothing to choose, so the form is simply what the screen is, until one is
  // saved: a choice made means a save just landed, even if the list hasn't caught up with it yet.
  const form: Editing | undefined =
    editing ?? (ownScenarios?.length === 0 && choiceId === undefined ? { kind: "new", byRequest: false } : undefined);
  const beingEdited = form?.kind === "edit" ? ownScenarios?.find((own) => own.id === form.id) : undefined;

  async function save(text: OwnScenarioText) {
    const saved = await saveOwnScenario(text, form?.kind === "edit" ? form.id : undefined);
    setChoiceId(saved.id);
    setEditing(undefined);
  }

  async function confirmDelete() {
    const target = deleting;
    setDeleting(undefined);
    if (!target) return;
    try {
      await deleteOwnScenario(target.id);
      setChoiceId(undefined);
      setDeleteFailed(false);
    } catch (error) {
      console.error("Failed to delete the Own Scenario", error);
      setDeleteFailed(true);
    }
  }

  function start() {
    if (!chosen) return;
    // Replaced, not pushed, the same as a category's brief: back from the Conversation leads to the
    // Practice picker.
    // A deliberate start: a conversation already in progress with this Own Scenario is left behind, not resumed.
    navigate(conversationPath(OWN_CATEGORY_ID, chosen.id, focus?.id), { replace: true, state: newConversationStart() });
  }

  return (
    <section aria-labelledby="own-brief-heading" className="home-section scenario-brief">
      <Link className="back-button" to="/practice">
        ← Practice
      </Link>
      <h1 id="own-brief-heading" className="screen-title">
        Your own
      </h1>
      <p className="scenario-brief__persona">
        Describe someone you want to talk to and the situation you&apos;re preparing for. What you write stays
        on this device, and it&apos;s sent only to play the person in a conversation.
      </p>

      {ownScenarios !== undefined && form && (
        <section aria-label={form.kind === "edit" ? "Edit your situation" : "Write your own"} className="own-form-panel">
          {ownScenarios.length > 0 && (
            <h2 className="own-form-panel__heading">{form.kind === "edit" ? "Edit" : "Write your own"}</h2>
          )}
          <OwnScenarioForm
            key={form.kind === "edit" ? form.id : "new"}
            initial={beingEdited}
            autoFocus={form.kind === "edit" || form.byRequest}
            onSave={save}
            onCancel={ownScenarios.length > 0 ? () => setEditing(undefined) : undefined}
          />
        </section>
      )}

      {ownScenarios !== undefined && !form && chosen && (
        <>
          <fieldset className="scenario-brief__chooser">
            <legend>Your situations</legend>
            <div className="scenario-brief__options">
              {ownScenarios.map((own) => (
                <label
                  key={own.id}
                  className={own.id === chosen.id ? "check-option check-option--selected" : "check-option"}
                >
                  <input
                    type="radio"
                    name={chooserName}
                    value={own.id}
                    checked={own.id === chosen.id}
                    onChange={() => setChoiceId(own.id)}
                  />
                  <span className="own-option__name">{own.name}</span>
                  <span className="own-option__situation">{own.situation}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="scenario-brief__situation">
            <dl>
              <dt className="scenario-brief__label">Who you&apos;ll talk to</dt>
              <dd>
                {chosen.name}
                {chosen.about && ` · ${chosen.about}`}
              </dd>
              <dt className="scenario-brief__label">The situation</dt>
              <dd className="own-situation">{chosen.situation}</dd>
            </dl>
          </div>

          <div className="own-chosen-actions">
            <button type="button" className="button-secondary" onClick={() => setEditing({ kind: "edit", id: chosen.id })}>
              Edit
            </button>
            <button type="button" className="button-secondary" onClick={() => setDeleting(chosen)}>
              Delete
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setEditing({ kind: "new", byRequest: true })}
            >
              Write your own
            </button>
          </div>
          {deleteFailed && (
            <p role="alert" className="own-form__problem">
              Couldn&apos;t delete that. It&apos;s still saved.
            </p>
          )}

          <FocusPicker focus={focus} onChange={setFocus} />

          <button type="button" className="button-primary scenario-brief__start" onClick={start}>
            Start
          </button>
        </>
      )}

      {deleting && (
        <DeleteOwnScenarioDialog
          name={deleting.name}
          onCancel={() => setDeleting(undefined)}
          onDelete={() => void confirmDelete()}
        />
      )}
    </section>
  );
}
