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

Ten screens. One job each.

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

- **Your own.** A seventh card, after the six categories, for Own Scenarios.
- **Paused Conversation.** When one is waiting, its card reads "Continue with Jordan" and opens
  straight back into it, skipping the Scenario brief. Only one card can show this.
- **Offline.** Practice needs a connection. Offline, the screen says so ("You're offline — Practice
  needs a connection. Lessons work offline.") instead of letting a Conversation fail on its first
  line. The category cards stay on screen but can't be opened: each is a disabled link, still reachable
  by keyboard and described by the notice, so a screen reader hears the category, that it's
  unavailable, and why. Focus stays on a card as the connection changes. The screen
  follows the connection live, so the notice appears if it drops while the picker is showing and
  goes when it returns, without a reload. Lessons and History don't change offline.

**Navigation:** from Home's primary action. A card → Scenario brief (or a Paused Conversation →
Conversation). Back → Home.

### Scenario brief
**Responsible for:** setting up one Practice Conversation before it starts.

- The Persona and what they're like, and the chosen Scenario's situation and the user's role in it.
- **Scenario chooser.** The category's 3–4 Scenarios, defaulting to **Surprise me**, which picks
  one at random when Start is tapped.
- **Focus.** Optional, a short list of aims plus none. Leaving it empty is the default.
- **Start** → Conversation.
- **Paused Conversation waiting elsewhere.** Start asks first: starting this one discards the
  paused one.

For **Your own**, the chooser lists saved Own Scenarios instead, with **Write your own**: who
you're talking to (a name and one line about them) and the situation, about 500 characters in
all. Own Scenarios are kept on-device and can be edited or deleted from here.

**Try again** (from a Feedback Summary or History entry) skips this screen and starts a fresh
Conversation with the same Scenario and Focus.

- **Only those two carry over.** The new Conversation is started from the Scenario and Focus alone,
  so nothing of the last one reaches it, and its History entry is like any other.
- **Old and outdated entries.** An entry saved before Scenarios existed tries again in its
  category's default Scenario (`scenarioOfEntry`). An entry naming a Focus since removed tries
  again without one, the same as its Feedback Summary shows none. An entry whose category the app
  no longer has offers no Try again, since there's nothing to start.
- **Paused Conversation waiting elsewhere.** Not built yet: today Try again starts straight away.
  Once Paused Conversations exist (#76) it will ask first, the same as Start. Both screens start it
  through `TryAgainButton`, so that's the one place the ask goes.

- **What the brief shows.** The category's name as a small label, the Persona's name as the
  screen's `h1`, and one line on what they're like (`personaDescription`, the same in every
  Scenario). Below the chooser, the chosen Scenario's situation and the user's role. With Surprise
  me chosen, nothing is given away: a line says one of the Persona's situations is picked when you
  start, and that it'll show at the top of the conversation.
- **Where the Scenario lives.** Each Scenario's user-facing text (title, situation, role) is in
  `src/practice/scenarios.ts`; its prompt situation is server-side only (`scenariosByCategory` in
  `api/_lib/scenarioPrompts.ts`), keyed by the same category and Scenario ids. The conversation
  request names both ids, and the server builds the prompt as the category's Persona sheet, then
  that Scenario's situation, then the shared Persona rules. It rejects a Scenario it doesn't know,
  including a real one named under another category.
- **Default Scenario.** Each category names its default Scenario explicitly, on both sides (a test
  checks they agree): the situation every conversation had before Scenarios existed. A History
  entry saved then has no Scenario of its own and reads as its category's default
  (`scenarioOfEntry`). A request with no Scenario gets the default too, as a safety net for an
  installed app still on the version from before Scenarios until it reloads.
- **Focus.** Seven aims, each worded as something to practise rather than a target to hit, after
  **None** (the default): Asking follow-up questions, Showing you're listening, Sharing about
  yourself, Reading the room, Staying calm, Handling silences, Wrapping up gracefully. They follow the
  Lessons' skills and fit every category. The list is fixed in the app (`src/practice/focuses.ts`,
  ids and labels only). What each one means to the Feedback Summary is server-side only
  (`api/_lib/focusPrompts.ts`), keyed by the same ids, so the request names a Focus by id, no free
  text reaches the prompt, and the server rejects an id it doesn't know. A test checks the two lists
  agree.
- **Start replaces the brief** in history rather than pushing on top of it, so back from the
  Conversation — its back action and the system back gesture alike — lands on the Practice picker.

**Navigation:** from Practice picker, at `/practice/:categoryId`. Back → Practice picker. Start →
Conversation, at `/practice/:categoryId/:scenarioId`, with `?focus=<id>` when a Focus was picked. An
unknown category redirects to the Practice picker.

### Conversation
**Responsible for:** one live Practice Conversation. Chrome-free, full viewport.

- Compact top bar: back, persona name, and **End & get feedback** as a top-bar action
- Transcript fills the screen. It opens with a quiet note of the Scenario's situation and the
  user's role, so a Surprise me pick is known from the first line; it scrolls away with the
  transcript.
- Composer pinned to the bottom, above the keyboard
- Typing indicator sits in the transcript, not as a floating status line

**Moves here:** `ChatScreen`, currently squeezed into the Practice card.

- **Saved as it goes.** Every turn is kept on-device, so a reload, a crash or the phone closing
  the app loses nothing. Opening the same Conversation's URL again restores the transcript and
  carries on from it. The copy is kept from the user's first line (before it, there is nothing to
  lose), one per Scenario, and it stays out of History until the conversation ends; ending or
  leaving clears it. A deliberate start (Start on the brief, Try again) is never a reload: it
  begins a new transcript and drops any copy left in that Scenario, which is why those two
  navigations carry a start token in router state, kept across a reload so the conversation it
  began still restores. If the device can't save, the conversation runs in memory as before.
  Leaving asks **Save for later** (it becomes the Paused Conversation) or
  **Discard**. If the user hasn't said anything yet, leaving doesn't ask.
- **Hint.** A quiet action for a one-line coaching nudge. It appears in the transcript, marked as
  a Hint, and stays there for the Feedback Summary.
- **Rewind.** Takes back the user's last message and the Persona's reply. Repeatable.
- **Voice.** A mic button records the user's reply and fills the composer with the transcription
  to send or edit. A speaker toggle in the top bar reads the Persona's replies aloud.
- **Replies stream in** as they're written, rather than appearing whole.
- **Length limit.** A quiet note a few turns before the limit; at the limit, the composer gives
  way to **End & get feedback**. The user never sees a raw validation error.
- **Natural ending.** When the Persona wraps up in character, a quiet note ("Jordan's wrapping
  up") offers **Get feedback** as the primary action and **Keep talking** as secondary.

**Navigation:** from Scenario brief, a Paused Conversation's card, or Try again, at
`/practice/:categoryId/:scenarioId` (plus `?focus=<id>` with a Focus). Back → Save for later /
Discard, then Practice picker. A URL naming a Scenario the category doesn't have, or a Focus the app
doesn't offer, redirects to that category's Scenario brief. Ending
goes to the Feedback Summary, which the leave confirmation doesn't ask about; every other way out
(the brief included) is leaving. The Feedback Summary replaces the ended Conversation in history, so
back from it goes to what was under the Conversation, never into a fresh one at the ended one's URL.

**The Focus rides along, unseen.** The Focus lives in the Conversation's URL, so a reload keeps it,
and ending hands it to the Feedback Summary with the transcript and Scenario. The Persona never hears
about it: it shapes the feedback, not the conversation.

**Recording the Scenario and Focus.** The History entry records the Focus (`focusId`) only when there
was one, so an entry without a Focus is stored exactly as before; like `scenarioId`, it needed no
database upgrade. It also records the Scenario the conversation was set in (`scenarioId`). Entries saved before Scenarios existed are read as they were stored, with no
database upgrade or rewrite, and open as usual; wherever their Scenario is needed, it's their
category's default (see Scenario brief).

### Feedback Summary
**Responsible for:** the review of one finished conversation. The app's payoff screen, and the
one place richer density is wanted.

Two clearly-separated groups — what you did well, what you can do better — each point showing
its quote and, where present, its explanation.

- **Focus.** When one was set, a line under the title names it ("Your focus: Staying calm"), and at
  least one point speaks to it: a moment that shows it, or one where it would have helped. Focus
  points can sit in either group, and in both where the conversation has both kinds of moment, so
  where they fall isn't a verdict. Nothing says whether it was achieved, not overall and not for one
  moment, and the line itself is neutral. After a reload the Focus is read back
  off the saved History entry. An entry naming a Focus since removed shows none, and asks for
  feedback without one.
- **Try saying it this way.** Each "can do better" point also shows a rewritten version of the
  quote.
- **A Lesson for it.** A "can do better" point may link to the one Lesson that teaches its skill.
  A point with no matching Lesson has no link.
- **Try again** starts a fresh Conversation with the same Scenario and Focus. It isn't linked to
  this one. It sits after the feedback, secondary to Done. It appears once the conversation has
  saved to History, and stays while the feedback is still generating or has failed: leaving before
  the save settled would drop the request for feedback, leaving the entry without any. It
  **replaces** this screen in history: the conversation and its
  feedback are already in History, so back from the new Conversation leaves Practice the way one
  started from the brief does, and attempts never pile up in the back stack.

**Navigation:** from Conversation's end action, at `/practice/:categoryId/feedback/:entryId`. Done
→ **Home**, not back to the category grid. You finished something; you should land somewhere that
reflects that. Try again → Conversation. A Lesson link → Lesson flow.

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

Chrome-free and full viewport, like Conversation. A Lesson is about 20 Lesson Steps: Explainers,
Checks, Reply Choices and Written Replies, ending in exactly one Recap. The weight sits on practice
(Reply Choice and Written Reply), not on more reading. DESIGN.md §3 (Lesson
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

  It starts at step 1, unless it was left partway (see below). An unknown Lesson id redirects to
  the Lessons list.
- **The leave action names its destination.** It reads "← Home" when the Lesson was opened from
  Today's idea, and "← Lessons" otherwise. The opener travels with the navigation. With none, as
  on a direct link, it's the Lessons list. A Lesson opened by Next lesson keeps the destination
  of the Lesson before it, so leaving still returns you to where you started.
- **Back moves one step** inside the Lesson and isn't browser history. The system back gesture
  leaves the Lesson, the same as the leave action.
- **Leaving keeps your place.** At about 20 steps, restarting costs too much. The step position
  is kept on-device when the Lesson is left by any means (the leave action, system back,
  navigating elsewhere). Reopening it offers **Pick up at step N** or **Start over**. There's no
  confirmation on leaving, since nothing is lost. Finishing clears the kept position. Answers
  aren't kept, only the position.
  - **How it's kept.** The position is saved as the user moves between steps, not on the way out,
    so every way of leaving (a closed tab included) keeps it. Back moves it back too. Step 1 isn't
    a place to pick up, so a Lesson on step 1 keeps nothing. Reaching the Recap without tapping
    Finish keeps the Recap as the place. Each Lesson keeps its own.
  - **The offer** stands in for the step on reopening, from any entry point. Its heading reads
    "Pick up where you left off?" with the line "You stopped at step N.". The progress row shows
    how far they got, and the bottom row carries **Pick up at step N** as the pill and **Start
    over** as the text action in the Back slot. Pick up goes to that step with nothing answered.
    Start over goes to step 1 and clears the kept position. Leaving from the offer keeps it.
  - **When it can't be kept.** If the device can't save or read the position, the Lesson works the
    same and starts at step 1 next time. The Lesson doesn't wait on a slow device: after 1.5
    seconds it opens at step 1.
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

- **Insights row.** At the top, once 5 conversations have a Feedback Summary. Opens Insights.
- **Filter** by Scenario Category, plus Own Scenarios as one group.
- **Your data**, a quiet group at the bottom:
  - **Export** saves every entry as one file, as a backup.
  - **Import** merges a backup in, skipping entries already here. It never replaces.
  - **Delete everything** asks first, saying it can't be undone, then shows the empty state.

The app also asks the browser to keep its storage permanently, so saved History isn't cleared for
lack of use. Nothing on screen depends on the answer.

**Navigation:** from Home's History row. Back → Home. Insights row → Insights.

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

Shows the entry's Focus, when it had one, and offers **Try again** (see Scenario brief) after the
feedback, above the quiet Delete. It **pushes** the new Conversation, so back from it returns to this
entry: the entry is a place the user browsed to, and it's still there.

**Navigation:** from History list or an Insight's citation. Back → where it was opened from. Try
again → Conversation.

### Insights
**Responsible for:** recurring patterns across the user's saved Feedback Summaries.

2–4 Insights, each a worded observation citing the conversations it came from, which open their
History entries. Never numbers, counts, charts or trends over time.

Generated only when the user taps **Refresh**, never by opening the screen, and saved until the
next Refresh. The first visit shows only Refresh and a line about what it does.

**Navigation:** from the History list's Insights row. Back → History list.

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
| Scenario brief | the persona's name | none |
| Conversation | the persona's name | none |
| Feedback Summary | Feedback on your conversation with the persona | `h2` for each of the two groups |
| Lessons list | Lessons | none |
| Lesson flow | the Lesson's title, **visually hidden** | `h2` for the step's title or prompt; on the Recap a visually hidden `h2` "Recap" with `h3` for Apply it |
| History list | History | none |
| History entry detail | the category with the persona | `h2` for each Feedback Summary group |
| Insights | Insights | none |
| Something went wrong | Something went wrong | none |

A heading's level is semantics only. Its size and weight come from the type scale in DESIGN.md
(Type), so changing a level never changes how it looks. The Lesson flow's `h1` is visually hidden
because the screen is chrome-free and has no room for a title. `src/headingStructure.test.tsx`
renders every screen, and every kind of Lesson step, and fails if any breaks these rules.

### Update offer (app-wide, not a screen)

**Responsible for:** telling the user a new version of the app is waiting and letting them take it,
without interrupting what they're doing. It lives in the app shell, so it overlays whichever screen
is showing rather than being a screen or a Home card: Home's five elements are unchanged. Visuals
are in DESIGN.md §7 (Update offer).

- The service worker registers in `prompt` mode. A new version installs in the background and waits;
  it takes over only when the user taps **Reload**. **Not now** dismisses the note for the session.
- **Noticing an update.** A long-lived or resumed app isn't navigated, so the browser wouldn't look
  for a new version. The app checks when it becomes visible again and once an hour while open.
- **The app never reloads itself.** Neither the note nor the service worker reloads the page unasked,
  and that includes other tabs: the generated register script would reload every open tab when one
  of them took an update, so registration is the app's own (`src/useAppUpdate.ts`) and a tab reloads
  only after its own user tapped Reload.
- **Held back on the Conversation and the Lesson flow.** A Lesson keeps its step position on-device, but a reload
  there still breaks the user's train of thought mid-exchange, and a Lesson's answers aren't kept, so the note doesn't show on those screens and appears on the next
  screen the user reaches. The Feedback Summary shows it: that conversation is already saved.
- It adds no heading and no navigation, so it doesn't touch the heading structure above or the
  navigation model below.

## 3. Navigation model

No tab bar, consistent with issue #1. Navigation is a stack: Home is the root, everything else
pushes onto it.

```
Home
├── Practice picker → Scenario brief → Conversation → Feedback Summary ──→ (Done) Home
│        └── (Paused Conversation) Conversation          ├──→ (Try again) Conversation
│                                                        └──→ (A Lesson for it) Lesson flow
├── Lessons list ──→ Lesson flow ──→ (Next lesson) Lesson flow
│                        └──→ (Done or ← Lessons) Lessons list
├── (Today's idea) Lesson flow ──→ (Next lesson) Lesson flow
│                        └──→ (Done or ← Home) Home
└── History list ──→ History entry detail ──→ (Try again) Conversation
         └──→ Insights ──→ History entry detail
```

Lesson Steps change inside the Lesson flow screen, not as pushes onto the stack (DESIGN.md §6).

Practice's URLs deepen one level per push: `/practice` (picker), `/practice/:categoryId` (Scenario
brief), `/practice/:categoryId/:scenarioId` (Conversation), `/practice/:categoryId/feedback/:entryId`
(Feedback Summary). A Focus is a query parameter on the Conversation's URL, `?focus=<id>`, not a
level. `src/practice/practicePaths.ts` spells them out. The brief is replaced by the
Conversation it starts, so it isn't on the stack under it. Likewise a Conversation is replaced by
its Feedback Summary, and a Feedback Summary by the Conversation its Try again starts, so however
many times the user tries again, back never walks through an earlier attempt.

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

Practice additions add these:
- **No difficulty levels.** A harder Scenario is a situation (the Persona is already upset), not
  a setting to climb.
- **No verdict on a Focus.** The Feedback Summary speaks to it, never marks it achieved.
- **No linked attempts.** Try again starts a fresh conversation; nothing compares it with the last.
- **Insights have no numbers.** No counts, charts or trends over time.

`REFERENCE-NOTES.md` §1 lists the Gleam functions excluded for these reasons.
