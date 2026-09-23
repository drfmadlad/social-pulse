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

Stepped Lessons leave Home unchanged. Today's idea still shows a Lesson's title and one-line
summary, and opens that Lesson's flow. The Lessons row counts Lessons, never finished ones.

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

**Navigation:** from Conversation's end action, at `/practice/:categoryId/feedback/:entryId`. Done
→ **Home**, not back to the category grid. You finished something; you should land somewhere that
reflects that.

**Saving.** The conversation saves to History the moment it ends, before its feedback exists.
The Feedback Summary is added to that same entry when it arrives. So a summary that fails, or
that the user leaves before it lands, never loses the conversation. A summary still generating
when the user taps Done is kept once it arrives. Coming back to this screen shows the saved
summary without asking the AI again.

**When saving fails.** A save can fail (a private window, blocked site data, a full disk), whether
of the conversation or of its summary. The screen says so in a quiet notice (DESIGN.md §7, Save
failures) and carries on: the Feedback Summary still generates and shows, and Done still goes Home.
If the conversation itself couldn't be saved, that one notice covers its summary too, since
neither will reach History.

**Reload.** The entry id lives in the URL, not just router state, so a reload — or a bookmarked
or shared link — re-reads the saved entry from History instead of bouncing to the Practice picker.
It shows that entry's transcript and generates or shows its Feedback Summary as appropriate, the
same as a fresh Done from Conversation. An id that doesn't resolve to a saved entry redirects to
the Practice picker rather than erroring.

### Lessons list
**Responsible for:** browsing Lessons, showing which are finished, and where to pick up.

**Moves here:** the three-row list. The draft-content badge comes with it — it belongs next to
the lesson, not on the homepage.

- **Done marks.** A finished Lesson shows a quiet done mark at the end of its row.
- **Up next.** The first unfinished Lesson in list order gets a highlighted row. Once every Lesson
  is finished, no row is highlighted.
- **No counts, percentages, path or locks.** Every Lesson opens at any time.
- **Live.** A Lesson finished while the list sits below it in the stack shows its mark on return.

**Navigation:** from Home's Lessons row. A row → Lesson flow. Back → Home.

### Lesson flow
**Responsible for:** taking the user through one Lesson a Lesson Step at a time, and marking it
finished. It replaces Lesson detail on the same route, `/lessons/:lessonId`.

Chrome-free and full viewport, like Conversation. A Lesson is 8–12 Lesson Steps: Explainers,
Checks, Reply Choices and Written Replies, ending in exactly one Recap. DESIGN.md §3 (Lesson
Steps) has the layout.

- **Top:** segmented progress, one segment per step, and the leave action, which names its
  destination.
- **Bottom:** one pinned primary action whose label follows the step, and a quiet Back from step
  2 onward.
- **Check and Reply Choice:**
  - The primary action stays disabled until an option is selected.
  - Committing shows the result in place.
  - There's no retry, and a wrong pick never blocks continuing.
- **Written Reply:** Send is disabled while the reply is empty. Nothing the user types is saved.
- **No score or tally of answers** appears anywhere in the flow: no "X of Y correct" and no
  percentage. The progress bar counts steps, not answers.

**Navigation:**
- **Entry.** A Lesson opens from:
  - a Lessons list row
  - Home's Today's idea card
  - **Next lesson** on another Lesson's Recap
  - a direct link

  It always starts at step 1. An unknown Lesson id redirects to the Lessons list.
- **The leave action names its destination.** It reads "← Home" when the Lesson was opened from
  Today's idea, and "← Lessons" otherwise. The opener travels with the navigation. With none, as
  on a direct link, it's the Lessons list. A Lesson opened by Next lesson keeps the destination
  of the Lesson before it, so leaving still returns you to where you started.
- **Back moves one step** inside the Lesson and isn't browser history. The system back gesture
  leaves the Lesson, the same as the leave action.
- **Leaving restarts the Lesson.** Step position lives only inside the flow. Leaving by any means
  (the leave action, system back, navigating elsewhere) discards it, and the next visit starts at
  step 1. There's no confirmation: unlike a Practice Conversation, nothing is lost that can't be
  redone in a minute.
- **Finish leads to Next lesson / Done.** Finish on the Recap:
  1. marks the Lesson finished on-device, next to History;
  2. plays the celebration, the same every time;
  3. turns the bottom row into **Next lesson** and **Done**.

  Reaching the Recap without tapping Finish doesn't count. Finishing a Lesson again plays the same
  celebration and leaves its done mark as it was.
  - **Next lesson** opens the first Lesson in list order that isn't finished and isn't this one.
    It replaces the finished Lesson in history, so system back from the new Lesson goes where you
    started, not into a restarted copy of the one you just finished. When there's no such Lesson,
    only Done is offered.
  - **Done** goes to the leave action's destination.

### History list
**Responsible for:** browsing finished conversations, newest first.

Empty state lives here, not on Home — so a new user never sees an empty box on their first
screen.

**Navigation:** from Home's History row. Back → Home.

### History entry detail
**Responsible for:** one past conversation — transcript plus its saved Feedback Summary.
Reuses the Feedback Summary screen's components.

If the feedback never arrived, a quiet note says so and offers **Get feedback**. The summary is
generated only on that tap, never just by opening the entry, and is saved to the entry once it
arrives.

**Deleting.** A quiet **Delete** action at the bottom of the entry removes the conversation, its
transcript and its Feedback Summary together. It asks first and says the entry can't be recovered,
then returns to the History list with the entry gone — or to the empty state if it was the last.
If the delete fails, the entry stays and a calm note says so.

**Navigation:** from History list. Back → History list.

### Something went wrong
**Responsible for:** catching a render error on any screen and offering a way back. Without it
React unmounts everything and leaves a blank page, and an installed PWA has no address bar to
recover from. It is the route tree's `errorElement` (`RouteErrorScreen`), not a screen the user
navigates to, and it has no URL of its own.

It says the screen couldn't load and that anything already finished is still saved in History,
with one **Go to Home** action. It never shows the error's message or a stack trace; those still
reach the console. It makes no claim about a conversation in progress, which isn't saved until it
ends and is lost with the screen. Saved History is untouched, because nothing here writes to it.

Home itself stays at five elements; this isn't a Home card.

**Last resort.** A render error in `App` or the router itself is outside the route tree, so
`AppErrorBoundary` in `main.tsx` catches it with the same wording and a **Reload** button in place
of Go to Home. It uses no router context, since that's what may have failed.

**Known limitation.** If Home itself throws every time it renders, Go to Home lands on the same
error again. Navigation can't recover from a deterministic crash on the destination.

**Navigation:** none in. Go to Home → Home.

### Heading structure

Every screen has exactly one `h1`, naming it, and it opens the screen's outline. Headings below it
descend a level at a time, never skipping. A screen reader user navigating by headings gets an
outline that matches what's on screen and a landmark for where they are.

| Screen | `h1` | Below it |
|---|---|---|
| Home | Social Pulse | none |
| Practice picker | Practice | none |
| Conversation | the persona's name | none |
| Feedback Summary | Feedback on your conversation with the persona | `h2` for each of the two groups |
| Lessons list | Lessons | none |
| Lesson flow | the Lesson's title, **visually hidden** | `h2` for the step's title or prompt; on the Recap a visually hidden `h2` "Recap" with `h3` for Apply it |
| History list | History | none |
| History entry detail | the category with the persona | `h2` for each Feedback Summary group |
| Something went wrong | Something went wrong | none |

A heading's level is semantics only. Its size and weight come from the type scale in DESIGN.md
(Type), so changing a level never changes how it looks. The Lesson flow's `h1` is visually hidden
because the screen is chrome-free and has no room for a title. `src/headingStructure.test.tsx`
renders every screen, and every kind of Lesson step, and fails if any breaks these rules.

## 3. Navigation model

No tab bar, consistent with issue #1. Navigation is a stack: Home is the root, everything else
pushes onto it.

```
Home
├── Practice picker → Conversation → Feedback Summary ──→ (Done) Home
├── Lessons list ──→ Lesson flow ──→ (Next lesson) Lesson flow
│                        └──→ (Done or ← Lessons) Lessons list
├── (Today's idea) Lesson flow ──→ (Next lesson) Lesson flow
│                        └──→ (Done or ← Home) Home
└── History list ──→ History entry detail
```

Lesson Steps change inside the Lesson flow screen, not as pushes onto the stack (DESIGN.md §6).

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

Stepped Lessons add these exclusions:
- **No locked Lessons.** Every Lesson opens at any time, and none waits on finishing another.
  Locking turns a lesson list into a game board.
- **No correctness-scaled celebration.** Finishing plays the same celebration every time, however
  the answers went. No screen reports how a Lesson's answers went, and there's no extra reward
  for a perfect run.
- **No tracking of Apply It.** The app never asks whether you did it.

`REFERENCE-NOTES.md` §1 lists the Gleam functions excluded for these reasons.
