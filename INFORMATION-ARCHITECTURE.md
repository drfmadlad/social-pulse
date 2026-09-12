# Information Architecture

## Why this document exists

The homepage currently tries to be four screens at once. This proposes splitting it into
focused screens so the homepage can be simple, scannable and calm.

This reverses part of issue #1. User story 3 asked for "a single scrollable home feed (not a
tab bar)." That intent is preserved — there is still no tab bar, and Home is still one scroll.
What changes is that detail views stop rendering *inside* homepage cards and take over the
screen instead.

## 1. What the homepage does today

Visible on first paint:

| # | Element | Source |
|---|---|---|
| 1 | "Social Pulse" gradient wordmark | `App.tsx` |
| 2 | "Lessons" heading | `LessonsSection` |
| 3–5 | Three lesson rows, each title + PLACEHOLDER badge + summary | `LessonList` |
| 6 | "Practice" heading | `PracticeSection` |
| 7–12 | Six Scenario Category buttons, 2×3 grid | `scenarioCategories` |
| 13 | "History" heading | `HistorySection` |
| 14 | History empty-state line | `HistorySection` |

Fourteen elements, three competing section headings, and three magenta PLACEHOLDER badges —
which are a developer signal shown to a user.

Actions the homepage also hosts, *inline, inside the cards*:

- **Lesson detail + quiz** renders inside the Lessons card
- **Practice Conversation chat** renders inside the Practice card
- **Feedback Summary** renders inside the Practice card
- **History entry transcript + summary** renders inside the History card

### Consequences

- A Practice Conversation — the app's main event — gets a 640px card with two unrelated
  sections still on screen around it.
- Back affordances describe a state, not a place: "← Back to categories" while the user is
  looking at a page that still says "Lessons" above it.
- No router means no URL per screen, no browser history, and on an installed PWA the system
  back gesture exits the app mid-conversation.
- Ending a conversation returns to the category grid, so finishing something lands you where
  you started rather than somewhere that acknowledges you finished.

## 2. Proposed screens

Eight screens. One job each.

### Home
**Responsible for:** answering "what do I want to do right now?" Nothing else.

Contents, top to bottom:
1. Small "Social Pulse" wordmark
2. **Today's idea** — one card carrying a single communication idea drawn from a Lesson,
   tappable through to that Lesson. This is the homepage's one hero moment.
3. **Start practicing** — the single primary action, to the Practice picker
4. **Lessons** — one quiet row with a count
5. **History** — one quiet row with a count

Five elements, down from fourteen. No lists, no 6-button grid, no PLACEHOLDER badges.

**Moves off Home:** the lesson list, the category grid, the history list, the empty-state
sentence, and all four inline detail views.

**Navigation:** the root. No back.

> The "Today's idea" card is the structural borrow from the vocabulary app — its home is one
> word on one card, not a dashboard. It is *not* a streak: no counter, no calendar, no "day 4."

### Practice picker
**Responsible for:** choosing a Scenario Category.

Six category cards. Each shows the category, the persona name, and a one-line setting —
"Jordan · a first date at a coffee shop." Today the persona and setting exist only inside
`systemPrompt` and are never shown, so the user picks blind from a bare word. Surfacing them
needs a user-facing `blurb` field on `ScenarioCategory`.

**Moves here:** the 2×3 button grid, with more per item than the homepage could afford.

**Navigation:** from Home's primary action. Back → Home.

### Conversation
**Responsible for:** one live Practice Conversation. Chrome-free, full viewport.

- Compact top bar: back, persona name, and **End & get feedback** as a top-bar action
- Transcript fills the screen
- Composer pinned to the bottom, above the keyboard
- Typing indicator sits in the transcript, not as a floating status line

**Moves here:** `ChatScreen`, currently squeezed into the Practice card.

**Navigation:** from Practice picker. Back → confirm, then Practice picker. Today backing out
silently discards the conversation with no warning; it should ask.

### Feedback Summary
**Responsible for:** the review of one finished conversation. The app's payoff screen, and the
one place richer density is wanted.

Two clearly-separated groups — what you did well, what you can do better — each point showing
its quote and, where present, its explanation.

**Navigation:** from Conversation's end action. Done → **Home**, not back to the category grid.
You finished something; you should land somewhere that reflects that. The entry saves to
History automatically, as it does today.

### Lessons list
**Responsible for:** browsing Lessons.

**Moves here:** the three-row list. The draft-content badge comes with it — it belongs next to
the lesson, not on the homepage.

**Navigation:** from Home's Lessons row. Back → Home.

### Lesson detail
**Responsible for:** reading one Lesson and taking its quiz. Full width for the passage, quiz
below.

**Navigation:** from Lessons list, or from Home's Today's-idea card. Back → wherever you came
from.

### History list
**Responsible for:** browsing finished conversations, newest first.

Empty state lives here, not on Home — so a new user never sees an empty box on their first
screen.

**Navigation:** from Home's History row. Back → Home.

### History entry detail
**Responsible for:** one past conversation — transcript plus its saved Feedback Summary.
Reuses the Feedback Summary screen's components.

**Navigation:** from History list. Back → History list.

## 3. Navigation model

No tab bar, consistent with issue #1. Navigation is a stack: Home is the root, everything else
pushes onto it.

```
Home
├── Practice picker → Conversation → Feedback Summary ──→ (Done) Home
├── Lessons list ──→ Lesson detail
└── History list ──→ History entry detail
```

**Routing.** The app has no router today. Recommendation: `react-router-dom`. It gives a real
URL per screen, so browser back and the Android system back gesture both work on the installed
PWA — which is the actual bug, not a nicety. Roughly 15KB gzipped against the current
`react` + `react-dom` only dependency list. The alternative is a hand-rolled hash router of
about 40 lines, which avoids the dependency but puts the history edge cases on us.

**Back affordance.** Top-left chevron naming the destination — "← Lessons", "← Practice" —
never "← Back to categories."

**Screen transitions.** Forward pushes from the right, back reverses. See DESIGN.md.

## 4. What this changes in code

Descriptive only — not a work order.

- `src/App.tsx` becomes the router and app shell.
- The three `src/sections/*.tsx` components stop owning view state; each screen becomes a route.
- `src/App.test.tsx` encodes the current IA directly — "renders a single scrollable home feed
  with Lessons, Practice, and History sections in order" and "does not render tab navigation."
  The first must be rewritten. The second still passes and should stay: there is still no tab bar.
- `scenarioCategories.ts` gains a user-facing `blurb`.
- Issue #1 user story 3 should get a comment recording this refinement.

## 5. Explicitly out of scope

No streaks, XP, scores, leaderboards or progress charts. Issue #1 user story 28 stands. The
vocabulary app's streak calendar and ranking curve are visible in the reference screenshots and
are deliberately not borrowed.
