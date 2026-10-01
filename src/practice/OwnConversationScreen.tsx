import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ChatMessage } from "./aiProxyClient";
import { ChatScreen } from "./ChatScreen";
import type { EndedConversationState } from "./FeedbackSummaryRoute";
import { findFocus } from "./focuses";
import { startTokenOf } from "./inProgressConversation";
import { getOwnScenario } from "./ownScenarioStore";
import { OWN_CATEGORY_ID, ownScenarioAsCategory, ownScenarioAsScenario, type OwnScenario } from "./ownScenarios";
import { feedbackSummaryPath, FOCUS_PARAM, scenarioBriefPath } from "./practicePaths";

type Status = { kind: "loading" } | { kind: "found"; own: OwnScenario } | { kind: "missing" };

/**
 * A Practice Conversation with an Own Scenario's Persona (issue #67), at `/practice/own/:scenarioId`.
 * The same Conversation as a category's, but its Scenario is kept on-device, so it's read from there
 * first. The text is read once, as the conversation opens: editing the Own Scenario afterwards
 * doesn't change a conversation already going. Like a category's, it's kept on-device as it goes and
 * picked up again after a reload (issue #68), keyed by `own/<id>`. One that's gone (deleted since this URL was made)
 * redirects to the brief, the way an unknown Scenario does.
 */
export function OwnConversationScreen() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const startToken = startTokenOf(useLocation().state);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const focusId = searchParams.get(FOCUS_PARAM);
  const focus = findFocus(focusId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let own: OwnScenario | undefined;
      try {
        own = scenarioId ? await getOwnScenario(scenarioId) : undefined;
      } catch (error) {
        console.error("Failed to read the Own Scenario", error);
      }
      if (!cancelled) setStatus(own ? { kind: "found", own } : { kind: "missing" });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  const own = status.kind === "found" ? status.own : undefined;
  // Stable for the conversation's life: the Feedback Summary screen's effects depend on these.
  const category = useMemo(() => own && ownScenarioAsCategory(own), [own]);
  const scenario = useMemo(() => own && ownScenarioAsScenario(own), [own]);

  if (status.kind === "loading") {
    return null;
  }

  // Also a Focus the app doesn't offer: back to the brief to set up again.
  if (!own || !category || !scenario || (focusId !== null && !focus)) {
    return <Navigate to={scenarioBriefPath(OWN_CATEGORY_ID)} replace />;
  }

  function handleEnd(transcript: ChatMessage[]) {
    const entryId = crypto.randomUUID();
    // Like a category's Conversation, plus what the user wrote, which the Feedback Summary and the
    // History entry keep a copy of.
    const state: EndedConversationState = {
      transcript,
      scenarioId: scenario!.id,
      ownScenario: category!.own,
      ...(focus && { focusId: focus.id }),
    };
    navigate(feedbackSummaryPath(OWN_CATEGORY_ID, entryId), { state, replace: true });
  }

  return (
    <ChatScreen
      key={`${own.id}/${startToken}`}
      category={category}
      scenario={scenario}
      focusId={focus?.id ?? null}
      startToken={startToken}
      onBack={() => navigate("/practice")}
      onEnd={handleEnd}
    />
  );
}
