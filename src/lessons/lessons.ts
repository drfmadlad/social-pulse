import type { CompositionName } from "./artwork/compositions";

/** A stretch of paragraph text. Structured runs, never raw HTML, so content can't inject markup. */
export interface TextRun {
  text: string;
  emphasis?: boolean;
}

export type Paragraph = TextRun[];

/** Where an Explainer's artwork sits and how big it is (DESIGN.md §8, Placement and scale). */
export type ArtworkPlacement =
  | { placement: "above-title"; scale: "full" | "marginal" }
  /** Only on an Explainer with a key line. */
  | { placement: "beside-key-line"; scale: "marginal" }
  | { placement: "bleed-edge"; scale: "full"; edge: "left" | "right" };

export type ExplainerArtwork = { composition: CompositionName } & ArtworkPlacement;

export interface ExplainerStep {
  kind: "explainer";
  title: string;
  paragraphs: Paragraph[];
  /** Set apart as large display type. Written without quotation marks; the screen adds them. */
  quote?: string;
  /** The one line to remember from this step, highlighted. */
  keyLine?: string;
  /** Decorative. No two consecutive Explainers in a Lesson share a placement. */
  artwork?: ExplainerArtwork;
}

export interface ChoiceOption {
  id: string;
  text: string;
}

export interface CheckStep {
  kind: "check";
  prompt: string;
  options: ChoiceOption[];
  correctOptionId: string;
  /** Shown once the answer is committed, whichever option was picked. */
  explanation: string;
}

export interface ReplyChoiceStep {
  kind: "reply-choice";
  /** Sets the scene and names the speaker, e.g. "A coworker, after the meeting, says:" */
  context: string;
  /** The line they say, shown like Conversation's persona message. */
  line: string;
  options: ChoiceOption[];
  correctOptionId: string;
  /** Shown once the answer is committed, whichever option was picked. */
  explanation: string;
}

export interface WrittenReplyStep {
  kind: "written-reply";
  /** Sets the scene and names the speaker, e.g. "A coworker, after the meeting, says:" */
  context: string;
  /** The line they say, shown like Conversation's persona message. */
  line: string;
  /** The move this step is practising, given to the AI so it can judge whether the reply lands. */
  movePractised: string;
  /** Shown instead of a verdict if the AI can't answer, so the Lesson still works offline. */
  exampleReply: string;
}

export interface RecapStep {
  kind: "recap";
  /** Two or three short lines. */
  takeaways: string[];
  /** A suggestion for using the Lesson's idea in a real situation. Never tracked. */
  applyIt: string;
}

export type LessonStep = ExplainerStep | CheckStep | ReplyChoiceStep | WrittenReplyStep | RecapStep;

/** A Check and a Reply Choice share the same choose-commit-explain shape; only the setup differs. */
export type ChoiceStep = CheckStep | ReplyChoiceStep;

export function isChoiceStep(step: LessonStep): step is ChoiceStep {
  return step.kind === "check" || step.kind === "reply-choice";
}

export interface Lesson {
  id: string;
  title: string;
  /** One-line description shown in the Lessons list and Home's Today's idea. */
  summary: string;
  /** 8–12 Lesson Steps, ending in exactly one Recap. */
  steps: LessonStep[];
  /**
   * True while the Lesson carries stub content. Real Lesson content is authored
   * separately; until then every Lesson here is a placeholder and says so in the UI.
   */
  isPlaceholder: boolean;
}

/**
 * PLACEHOLDER CONTENT. These Lessons exist so the Lessons list, the Lesson flow and
 * tests are real; the steps are stubs, not authored teaching material. Replace them
 * (and clear `isPlaceholder`) when the real content lands.
 */
export const lessons: Lesson[] = [
  {
    id: "active-listening",
    title: "Active Listening",
    summary: "Show the other person you actually heard them.",
    steps: [
      {
        kind: "explainer",
        title: "Listening is proving you heard",
        artwork: { composition: "leaning-in", placement: "above-title", scale: "full" },
        paragraphs: [
          [{ text: "Most of us spend the other person's turn " }, { text: "planning our own", emphasis: true }, { text: "." }],
          [{ text: "Active listening flips that. You spend their turn following what they mean, then show them you got it." }],
        ],
      },
      {
        kind: "explainer",
        title: "Reflect the gist back",
        artwork: { composition: "echo", placement: "bleed-edge", scale: "full", edge: "right" },
        paragraphs: [
          [
            { text: "The simplest move is to say back the " },
            { text: "gist", emphasis: true },
            { text: " of what you heard, in your own words." },
          ],
          [{ text: "Not a transcript. One sentence that shows the shape of it." }],
        ],
        quote: "So the deadline moved and nobody told you?",
      },
      {
        kind: "check",
        prompt: "Your friend finishes describing a rough week. What is the most active-listening response?",
        options: [
          { id: "a", text: "\"That sounds exhausting — three deadlines in one week?\"" },
          { id: "b", text: "\"That's nothing, wait until you hear about my week.\"" },
          { id: "c", text: "\"You should really talk to your manager about that.\"" },
        ],
        correctOptionId: "a",
        explanation:
          "Reflecting the gist back invites them to confirm or correct it, which is what active listening is for. Topping their story or jumping to advice both move the focus off them.",
      },
      {
        kind: "explainer",
        title: "Being corrected is the point",
        artwork: { composition: "nudge", placement: "beside-key-line", scale: "marginal" },
        paragraphs: [
          [{ text: "Sometimes your summary will be " }, { text: "wrong", emphasis: true }, { text: ". That isn't a failure." }],
          [{ text: "They get to fix it, and now you share the same picture instead of finding out three exchanges later." }],
        ],
        keyLine: "A wrong summary said out loud beats a wrong one kept quiet.",
      },
      {
        kind: "explainer",
        title: "Hold your story for later",
        artwork: { composition: "holding-back", placement: "above-title", scale: "marginal" },
        paragraphs: [
          [
            { text: "When someone shares something hard, it's tempting to match it with " },
            { text: "your own version", emphasis: true },
            { text: "." },
          ],
          [{ text: "Save it. Topping their story, even kindly, moves the spotlight off them." }],
        ],
      },
      {
        kind: "check",
        prompt: "What is the goal of reflecting someone's point back to them?",
        options: [
          { id: "a", text: "To fill the silence while you think of a reply." },
          { id: "b", text: "To check you understood, and give them a chance to correct you." },
          { id: "c", text: "To show you can repeat things accurately." },
        ],
        correctOptionId: "b",
        explanation:
          "The value is in the correction. If your summary is wrong, you find out immediately instead of three exchanges later.",
      },
      {
        kind: "explainer",
        title: "Advice can wait too",
        paragraphs: [
          [{ text: "Jumping to a fix tells them you've stopped listening." }],
          [{ text: "Reflect first. If they want advice, " }, { text: "they'll usually ask", emphasis: true }, { text: "." }],
        ],
      },
      {
        kind: "reply-choice",
        context: "A friend just told you they didn't get the promotion. They say:",
        line: "Yeah, I mean, it's fine. They picked someone else.",
        options: [
          { id: "a", text: "\"That's such garbage, they clearly don't see your worth.\"" },
          { id: "b", text: "\"That's rough — sounds like it stings more than 'fine' lets on.\"" },
          { id: "c", text: "\"What did they say the other person had that you didn't?\"" },
        ],
        correctOptionId: "b",
        explanation:
          "Reflecting the gist — that \"fine\" is covering something that stings — invites them to say more. Ruling on their manager or turning it into an investigation both move the focus off them.",
      },
      {
        kind: "written-reply",
        context: "A friend is describing a stressful week at work. They say:",
        line: "Honestly it's just been one thing after another, I don't even know where to start.",
        movePractised: "Reflecting the gist back before saying anything else",
        exampleReply: "Sounds like it's been relentless — what's weighing on you the most right now?",
      },
      {
        kind: "recap",
        takeaways: ["Say back the gist in one sentence.", "Let them correct you.", "Hold your story and your advice."],
        applyIt:
          "Next time someone tells you about their week, reflect one thing back before you share anything of yours.",
      },
    ],
    isPlaceholder: true,
  },
  {
    id: "open-questions",
    title: "Asking Open Questions",
    summary: "Trade yes/no questions for ones that give people room.",
    steps: [
      {
        kind: "explainer",
        title: "Closed questions get closed answers",
        artwork: { composition: "turning-away", placement: "bleed-edge", scale: "full", edge: "left" },
        paragraphs: [
          [{ text: "A closed question can be answered in one word, so " }, { text: "it usually is", emphasis: true }, { text: "." }],
          [{ text: "An open question asks for a description, an opinion or a story. It hands the other person the floor." }],
        ],
      },
      {
        kind: "explainer",
        title: "Often it's one word of editing",
        paragraphs: [
          [{ text: "You rarely need a new question. Usually you just change how it starts." }],
          [
            { text: "\"Did you like the job?\" becomes a question that starts with " },
            { text: "what", emphasis: true },
            { text: " or " },
            { text: "how", emphasis: true },
            { text: "." },
          ],
        ],
        quote: "What was the job like?",
      },
      {
        kind: "check",
        prompt: "Which of these is an open question?",
        options: [
          { id: "a", text: "\"Did you have a good weekend?\"" },
          { id: "b", text: "\"What did you get up to at the weekend?\"" },
          { id: "c", text: "\"Was the weekend better than last one?\"" },
        ],
        correctOptionId: "b",
        explanation:
          "\"What did you get up to\" can't be answered with yes or no, so it invites an actual account of the weekend.",
      },
      {
        kind: "explainer",
        title: "Room for what you didn't know to ask",
        artwork: { composition: "open-door", placement: "beside-key-line", scale: "marginal" },
        paragraphs: [
          [{ text: "Early in a conversation, you don't know what's interesting about someone yet." }],
          [{ text: "Open questions let them " }, { text: "offer threads", emphasis: true }, { text: " you had no way of guessing at." }],
        ],
        keyLine: "Ask for a story, not a verdict.",
      },
      {
        kind: "explainer",
        title: "Follow the thread",
        artwork: { composition: "following-the-thread", placement: "above-title", scale: "full" },
        paragraphs: [
          [
            { text: "An open question is only half the move. The other half is " },
            { text: "picking up what they give you", emphasis: true },
            { text: "." },
          ],
          [{ text: "If they mention a trip, ask about the trip. Don't jump to your next prepared question." }],
        ],
      },
      {
        kind: "check",
        prompt: "Why lead with open questions when you're meeting someone new?",
        options: [
          { id: "a", text: "They give the other person room to offer things you didn't know to ask about." },
          { id: "b", text: "They are harder to answer, so they show you're serious." },
          { id: "c", text: "They let you avoid saying anything about yourself." },
        ],
        correctOptionId: "a",
        explanation:
          "Open questions surface threads you had no way of guessing at, which is exactly what you want early in a conversation.",
      },
      {
        kind: "explainer",
        title: "Not an interrogation",
        artwork: { composition: "across-the-table", placement: "bleed-edge", scale: "full", edge: "right" },
        paragraphs: [
          [{ text: "Open questions still need you in the conversation." }],
          [
            { text: "Share a little of your own answer, then hand the floor back with " },
            { text: "another open question", emphasis: true },
            { text: "." },
          ],
        ],
      },
      {
        kind: "reply-choice",
        context: "You've just met someone at a party. They mention they moved to the city recently. You say:",
        line: "Yeah, I just moved here a few weeks ago.",
        options: [
          { id: "a", text: "\"Do you like it here so far?\"" },
          { id: "b", text: "\"What's surprised you most about the city so far?\"" },
          { id: "c", text: "\"Was the move stressful?\"" },
        ],
        correctOptionId: "b",
        explanation:
          "\"What's surprised you\" can't be answered with yes or no, so it hands them the floor. The other two invite a one-word answer and stall right there.",
      },
      {
        kind: "written-reply",
        context: "You ask a new coworker how their weekend was. They say:",
        line: "It was good, thanks.",
        movePractised: "Asking a follow-up question that starts with what or how",
        exampleReply: "What was the best part of it?",
      },
      {
        kind: "recap",
        takeaways: [
          "Start with what or how, not did or was.",
          "Follow the thread they hand you.",
          "Share a little, then hand the floor back.",
        ],
        applyIt: "Next time you'd ask someone \"Did you have a good weekend?\", ask \"What did you get up to?\" instead.",
      },
    ],
    isPlaceholder: true,
  },
  {
    id: "reading-the-room",
    title: "Reading the Room",
    summary: "Notice the signals that tell you to change course.",
    steps: [
      {
        kind: "explainer",
        title: "Conversations give off signals",
        artwork: { composition: "lighting-up", placement: "above-title", scale: "full" },
        paragraphs: [
          [
            { text: "Reading the room means tracking how a conversation is landing: its " },
            { text: "pace", emphasis: true },
            { text: ", body language, and how much the other person volunteers." },
          ],
          [{ text: "The goal is to adjust before things go flat." }],
        ],
      },
      {
        kind: "explainer",
        title: "Shrinking answers",
        artwork: { composition: "drifting-apart", placement: "bleed-edge", scale: "full", edge: "left" },
        paragraphs: [
          [
            { text: "The clearest signal is length. Replies that drop from " },
            { text: "a few sentences to a few words", emphasis: true },
            { text: " are telling you something." },
          ],
          [{ text: "Less eye contact and no questions coming back at you usually travel with it." }],
        ],
      },
      {
        kind: "check",
        prompt: "Their replies have gone from a few sentences to a few words. What does that usually mean?",
        options: [
          { id: "a", text: "They're concentrating hard on what you're saying." },
          { id: "b", text: "The topic has run its course and it's time to change direction." },
          { id: "c", text: "They want you to explain the topic in more detail." },
        ],
        correctOptionId: "b",
        explanation:
          "Shrinking answers are the clearest sign a topic is spent. Switching threads is nearly always better than pressing on.",
      },
      {
        kind: "explainer",
        title: "Change course, don't push harder",
        artwork: { composition: "changing-course", placement: "beside-key-line", scale: "marginal" },
        paragraphs: [
          [{ text: "When a topic runs out, pressing on with more detail " }, { text: "fights the room", emphasis: true }, { text: "." }],
          [{ text: "Switch to a new thread, or wind down." }],
        ],
        keyLine: "When the energy drops, change direction, not volume.",
      },
      {
        kind: "explainer",
        title: "Mid-story dips",
        paragraphs: [
          [{ text: "Sometimes you notice the dip while you're the one talking." }],
          [{ text: "Speed up, land the point, and " }, { text: "hand the floor to someone else", emphasis: true }, { text: "." }],
        ],
        quote: "Anyway, that's how I ended up moving. What about you?",
      },
      {
        kind: "check",
        prompt: "You notice the group's energy dropping while you're mid-story. What's the best adjustment?",
        options: [
          { id: "a", text: "Tell the story faster, land it, and hand the conversation to someone else." },
          { id: "b", text: "Add more detail so the story is easier to follow." },
          { id: "c", text: "Stop mid-sentence and apologise for talking too much." },
        ],
        correctOptionId: "a",
        explanation:
          "Wrapping up and passing the floor respects the room's energy. Adding detail fights it, and apologising makes the dip everyone's problem.",
      },
      {
        kind: "explainer",
        title: "Don't apologise the dip into existence",
        artwork: { composition: "passing-the-floor", placement: "bleed-edge", scale: "full", edge: "right" },
        paragraphs: [
          [
            { text: "Stopping to say sorry for talking too much makes the dip " },
            { text: "everyone's problem", emphasis: true },
            { text: "." },
          ],
          [{ text: "A smooth handoff fixes it without anyone noticing." }],
        ],
      },
      {
        kind: "reply-choice",
        context: "A coworker's answers have shrunk to a few words for the third question in a row. They say:",
        line: "Yeah, it was fine, I guess.",
        options: [
          { id: "a", text: "\"So, back to the numbers from the report —\"" },
          { id: "b", text: "\"Different question — have you tried the new place downtown?\"" },
          { id: "c", text: "\"Was it not a good week, then?\"" },
        ],
        correctOptionId: "b",
        explanation:
          "The topic's spent, so switching to something new is the move. Returning to the report pushes on a dead thread, and pressing on \"not a good week\" digs into the same one.",
      },
      {
        kind: "written-reply",
        context: "You've been telling a story for a bit and notice the group's energy has dropped. A friend gives a flat reply:",
        line: "Cool.",
        movePractised: "Landing the story quickly and handing the floor to someone else",
        exampleReply: "Anyway, that's the gist of it — what's new with you lately?",
      },
      {
        kind: "recap",
        takeaways: [
          "Watch answer length, eye contact and questions back.",
          "When a topic's spent, change direction.",
          "Land your story and pass the floor.",
        ],
        applyIt:
          "Next time someone's replies shrink to a few words, switch to a new topic instead of adding more to the current one.",
      },
    ],
    isPlaceholder: true,
  },
];
