export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  /** Shown after the quiz is checked, whether or not the answer was correct. */
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  /** One-line description shown in the Lessons list. */
  summary: string;
  /** The instructional passage, one paragraph per entry. */
  passage: string[];
  quiz: QuizQuestion[];
  /**
   * True while the Lesson carries stub content. Real Lesson content is authored
   * separately; until then every Lesson here is a placeholder and says so in the UI.
   */
  isPlaceholder: boolean;
}

/**
 * PLACEHOLDER CONTENT. These Lessons exist so the Lessons section, quiz flow and
 * tests are real; the passages and questions are stubs, not authored teaching
 * material. Replace them (and clear `isPlaceholder`) when the real content lands.
 */
export const lessons: Lesson[] = [
  {
    id: "active-listening",
    title: "Active Listening",
    summary: "Show the other person you actually heard them.",
    passage: [
      "Placeholder passage. Active listening is the habit of proving you understood someone before you reply to them. Instead of spending their turn planning your own, you spend it following what they mean.",
      "Placeholder passage. The simplest version is to reflect back the gist of what you heard — \"so the deadline moved and nobody told you\" — and then let them correct you. Being corrected is the point; it means you now share the same picture.",
    ],
    quiz: [
      {
        id: "reflecting-back",
        prompt: "Your friend finishes describing a rough week. What is the most active-listening response?",
        options: [
          { id: "a", text: "\"That sounds exhausting — three deadlines in one week?\"" },
          { id: "b", text: "\"That's nothing, wait until you hear about my week.\"" },
          { id: "c", text: "\"You should really talk to your manager about that.\"" },
        ],
        correctOptionId: "a",
        explanation: "Reflecting the gist back invites them to confirm or correct it, which is what active listening is for. Topping their story or jumping to advice both move the focus off them.",
      },
      {
        id: "purpose",
        prompt: "What is the goal of reflecting someone's point back to them?",
        options: [
          { id: "a", text: "To fill the silence while you think of a reply." },
          { id: "b", text: "To check you understood, and give them a chance to correct you." },
          { id: "c", text: "To show you can repeat things accurately." },
        ],
        correctOptionId: "b",
        explanation: "The value is in the correction. If your summary is wrong, you find out immediately instead of three exchanges later.",
      },
    ],
    isPlaceholder: true,
  },
  {
    id: "open-questions",
    title: "Asking Open Questions",
    summary: "Trade yes/no questions for ones that give people room.",
    passage: [
      "Placeholder passage. A closed question can be answered in one word, so it usually is. An open question asks for a description, an opinion or a story, and hands the other person the floor.",
      "Placeholder passage. In practice this is often one word of editing: \"Did you like the job?\" becomes \"What was the job like?\". Same curiosity, far more to answer.",
    ],
    quiz: [
      {
        id: "spot-the-open-question",
        prompt: "Which of these is an open question?",
        options: [
          { id: "a", text: "\"Did you have a good weekend?\"" },
          { id: "b", text: "\"What did you get up to at the weekend?\"" },
          { id: "c", text: "\"Was the weekend better than last one?\"" },
        ],
        correctOptionId: "b",
        explanation: "\"What did you get up to\" can't be answered with yes or no, so it invites an actual account of the weekend.",
      },
      {
        id: "why-open",
        prompt: "Why lead with open questions when you're meeting someone new?",
        options: [
          { id: "a", text: "They give the other person room to offer things you didn't know to ask about." },
          { id: "b", text: "They are harder to answer, so they show you're serious." },
          { id: "c", text: "They let you avoid saying anything about yourself." },
        ],
        correctOptionId: "a",
        explanation: "Open questions surface threads you had no way of guessing at, which is exactly what you want early in a conversation.",
      },
    ],
    isPlaceholder: true,
  },
  {
    id: "reading-the-room",
    title: "Reading the Room",
    summary: "Notice the signals that tell you to change course.",
    passage: [
      "Placeholder passage. Reading the room means tracking how a conversation is landing — pace, body language, how much the other person volunteers — and adjusting before things go flat.",
      "Placeholder passage. Shorter answers, less eye contact and no new questions coming back at you are the common signs that a topic has run out. The move is to change topic or wind down, not to push harder on the same one.",
    ],
    quiz: [
      {
        id: "shrinking-answers",
        prompt: "Their replies have gone from a few sentences to a few words. What does that usually mean?",
        options: [
          { id: "a", text: "They're concentrating hard on what you're saying." },
          { id: "b", text: "The topic has run its course and it's time to change direction." },
          { id: "c", text: "They want you to explain the topic in more detail." },
        ],
        correctOptionId: "b",
        explanation: "Shrinking answers are the clearest sign a topic is spent. Switching threads is nearly always better than pressing on.",
      },
      {
        id: "adjusting",
        prompt: "You notice the group's energy dropping while you're mid-story. What's the best adjustment?",
        options: [
          { id: "a", text: "Tell the story faster, land it, and hand the conversation to someone else." },
          { id: "b", text: "Add more detail so the story is easier to follow." },
          { id: "c", text: "Stop mid-sentence and apologise for talking too much." },
        ],
        correctOptionId: "a",
        explanation: "Wrapping up and passing the floor respects the room's energy. Adding detail fights it, and apologising makes the dip everyone's problem.",
      },
    ],
    isPlaceholder: true,
  },
];
