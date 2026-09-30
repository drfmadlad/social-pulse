# Social Pulse

A personal EQ/communication-coaching app: the user rehearses real-world social interactions against an AI, then gets feedback on how they did.

## Language

**Practice Conversation**:
A simulated multi-turn chat between the user and an AI persona, set in a specific Scenario Category, used to rehearse a real-world social interaction.
_Avoid_: Roleplay, simulation, chat session

**Scenario Category**:
The situational context a Practice Conversation is set in (e.g. dating, job interview, small talk, networking, public speaking, conflict resolution).
_Avoid_: Scenario type, conversation mode

**Scenario**:
One specific situation within a Scenario Category (e.g. a first date at a coffee shop, a second date at a trivia night). The user picks one, or lets the app pick at random.
_Avoid_: Setup, level, difficulty

**Persona**:
The named character the user talks to in a Practice Conversation. Each Scenario Category has exactly one, and it stays the same person across that category's Scenarios. An Own Scenario has its own Persona, described by the user.
_Avoid_: Bot, character, AI partner

**Own Scenario**:
A situation the user writes themselves, including who they'll be talking to (e.g. "asking my manager Dana for a raise"). It belongs to no Scenario Category, is kept on-device for reuse, and its Persona is the person the user described.
_Avoid_: Custom scenario, user scenario, free practice

**Focus**:
An optional aim the user picks before a Practice Conversation starts (e.g. "asking follow-up questions"). The Feedback Summary speaks to it directly.
_Avoid_: Goal, target, objective

**Paused Conversation**:
A Practice Conversation the user left partway through and saved to pick up later. There is at most one at a time, and it isn't in History until it ends.
_Avoid_: Draft, unfinished conversation, saved conversation

**Rewind**:
Taking back the user's last message and the Persona's reply to it, to try a different line. Rewound messages are gone entirely: not in History, and never seen by the Feedback Summary.
_Avoid_: Undo, retry, redo

**Hint**:
A one-line coaching nudge the user can ask for mid-conversation, suggesting a direction rather than words to say. A Hint the user asked for stays in the transcript, where the Feedback Summary can see it.
_Avoid_: Suggestion, script, answer

**Feedback Summary**:
An AI-generated review delivered once a Practice Conversation ends, split into "what you did well" and "what you can do better," each backed by specific examples from the conversation and, where the point isn't self-evident, a short explanation.
_Avoid_: Review, score, report, critique

**Insight**:
A recurring pattern across the user's saved Feedback Summaries, stated in words (never numbers) and citing the Practice Conversations it came from.
_Avoid_: Stat, trend, progress, analytics

**Lesson**:
A static, hand-authored unit of instruction that teaches one communication skill through an ordered sequence of Lesson Steps, independent of any Practice Conversation.
_Avoid_: Module, course

**Lesson Step**:
One screen of a Lesson, of exactly one kind: Explainer, Check, Reply Choice, Written Reply, or Recap.
_Avoid_: Card, page, slide

**Explainer**:
A Lesson Step that teaches one part of the Lesson's idea in a few short paragraphs.
_Avoid_: Learn step, content page

**Check**:
A Lesson Step that asks a multiple-choice question about the Lesson's idea and explains the answer whichever option is picked.
_Avoid_: Quiz, test

**Reply Choice**:
A Lesson Step where someone says a line and the user picks the best reply from a few options, then sees why it works.
_Avoid_: Your turn, scenario question

**Written Reply**:
A Lesson Step where someone says a line and the user types their own reply, which the AI answers with a short verdict and one line of why.
_Avoid_: Grade, score, open answer

**Recap**:
The final Lesson Step: the Lesson's takeaways, ending in an Apply It.
_Avoid_: Summary (collides with Feedback Summary), review

**Apply It**:
A short suggestion, at the end of a Recap, for using the Lesson's idea in a real situation.
_Avoid_: Challenge, homework, task
