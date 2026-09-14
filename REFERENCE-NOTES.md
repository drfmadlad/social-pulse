# Reference Notes — Gleam

**Status: for review, not authoritative.** Nothing here applies until it is folded into
`DESIGN.md`, `INFORMATION-ARCHITECTURE.md`, `CONTEXT.md` and issue #1. Until then those documents
win wherever they disagree with this one. §5 lists every change folding in would make.

**Source:** 22 App Store–style screenshots in `docs/design-references/gleam-app/`: the home path,
library, practice tab, profile, and every screen of lesson 1.

**Intent:** Gleam is loose inspiration, not a template. Borrowing a *function* is fine. The
*execution* must not be recognisable as Gleam's to someone who has used both apps. Decisions
below were settled in a grilling session on 2026-09-14.

Social Pulse already diverges on the four biggest axes, before any of this: a light paper
ground instead of dark, a slate-teal accent instead of a warm one, a serif-plus-sans type
pairing instead of one heavy sans, and a navigation stack instead of a tab bar. §3 is about
not undoing that in the details.

---

## 1. Feature extraction

Functions only, not UI. **Status** is one of:

- **Exists**: already in Social Pulse.
- **Adopt**: coming in, in Social Pulse's own form (§3).
- **Park**: considered, deferred.
- **Drop**: considered, not wanted.
- **Exclude**: ruled out by a standing constraint.

### Home (IMG_6187)

| Function | Status | Notes |
|---|---|---|
| Lessons arranged as an ordered path, showing where you are | **Adopt**, reduced | The Lessons list highlights the next unfinished Lesson. No path. |
| A lesson stays locked until the previous one is finished | **Exclude** | Locking turns a lesson list into a game board (issue #1, story 28). |
| One "resume the next lesson" primary action | **Drop** | Home is unchanged. Today's idea already suggests a Lesson, and a second suggestion would compete with it. |
| Header counters for points, streak and energy | **Exclude** | Story 28. |
| Persistent tab navigation | **Exclude** | `INFORMATION-ARCHITECTURE.md` §3: no tab bar. |

### Library (IMG_6188)

| Function | Status | Notes |
|---|---|---|
| Lessons bundled into multi-lesson courses | **Park** | Three Lessons don't need grouping. Revisit when content grows. |
| Courses grouped by skill theme | **Park** | Depends on courses. |
| Lesson count per course | **Park** | Depends on courses. |
| Search | **Park** | Not needed at current content volume. |
| Cover artwork per course | **Adopt**, differently | Artwork lives inside Lessons, not on covers. See §3.4. |

### Practice tab (IMG_6189)

| Function | Status | Notes |
|---|---|---|
| Quick single-prompt reps, filtered by category, with shuffle | **Drop** | Practice Conversation *is* the practice. Lessons get a short Written Reply instead. |
| Answering by voice | **Park** | Out of scope in issue #1, noted there as a likely future addition. |

The screenshot stops before you start a rep, so what happens after that is unknown.

### Profile (IMG_6190)

| Function | Status | Notes |
|---|---|---|
| Level, points, global rank | **Exclude** | Story 28. |
| Streak and streak protection | **Exclude** | Story 28. |
| Time studied, lessons completed | **Exclude** | Cumulative counts are progress charts in miniature. |
| Insights: patterns about the user | **Park** | The Social Pulse version would be recurring patterns across saved Feedback Summaries, worded observations with no numbers. It needs real History volume first. |
| Activity history | **Exists** | History. |

### Lesson flow (IMG_6193–6210, excluding 6199)

| Function | Screens | Status | Social Pulse form |
|---|---|---|---|
| A lesson delivered as short paged steps, one idea per screen | all | **Adopt** | A **Lesson** becomes 8–12 **Lesson Steps**. |
| Progress through the current lesson, resetting each lesson | all | **Adopt** | Wayfinding, not a score. |
| Step back to the previous screen, or exit the lesson | all | **Adopt** | Leaving midway restarts the Lesson. |
| Teaching in small story-led beats: anecdote, definition, evidence, contrast, the one move, the bottom line | 6193, 6200–02, 6205–08, 6210 | **Adopt** | **Explainer** |
| Save an individual step for later | Learn steps | **Park** | |
| An overview of the whole course's stages | 6196 | **Drop** | Courses are parked. |
| A question about the idea, with an explanation after answering | 6203–04 | **Exists → Adopt** | The quiz already has a per-question explanation. It becomes a **Check** step. |
| Someone says a line, you pick the best reply, then see why | 6194–95, 6209 | **Adopt** | **Reply Choice**. Options reshuffle between runs. |
| You write your own reply and the AI responds | — | **New, Social Pulse's own** | **Written Reply**. Gleam's lesson doesn't show this. |
| An ungraded open reflection | 6197 | **Drop** | Written Reply covers "in your own words" with coaching attached. |
| Takeaways, then one thing to try in real life | 6198 | **Adopt** | **Recap** ending in an **Apply It**. Nothing ever checks whether you did it. |
| Flagging a content problem | answer results | **Park** | Needs a server to receive reports, which conflicts with local-only. |
| Nothing moves forward until you choose an option | 6203, 6209 | **Adopt** | |
| Wrong answers | — | — | Not captured. Social Pulse shows the explanation, highlights the better option, and lets you continue. |

### Lesson completion (IMG_6199)

| Function | Status | Notes |
|---|---|---|
| Score, points and time for the lesson | **Exclude** | Story 28. |
| Extra celebration for a perfect run | **Exclude** | Rewards performance. Social Pulse celebrates finishing, the same every time. |
| A celebration moment | **Adopt**, differently | Confetti over the Recap. See §3.7. |
| Go straight to the next lesson | **Adopt** | **Next Lesson** / **Done** on the Recap. |
| Rate the lesson | **Park** | Needs a server. |

### Mapping to the existing spec

- **Already in `CONTEXT.md` / issue #1:** Lesson (to be redefined), the quiz explanation, History,
  Practice Conversation, Scenario Category, Feedback Summary.
- **New concepts:** Lesson Step and its five kinds, Written Reply's AI response, Apply It, Lesson
  done marks, the finish celebration, Lesson artwork.
- **Supersedes:** issue #1 story 18 ("each Lesson includes a multiple-choice quiz").

---

## 2. Design extraction — principles

These are principles to reinterpret through `DESIGN.md`'s tokens. None of them depends on Gleam's
colors, icons, wordmark, copy or proportions. Each is marked **take** or **leave**.

### Color and ground

1. **Elevation by tonal step.** Raised surfaces sit a small lightness step off the ground, with no
   shadow and at most a hairline edge. **Take**: this matches `DESIGN.md`'s canvas/surface pair.
2. **Color encodes mode.** One hue owns "read and move on" (the primary action, progress) and a
   second hue marks "your move" steps where you must respond. **Take the principle**; §3.2 changes
   how it's expressed.
3. **Outcome colors are reserved.** The success color appears only on correct outcomes, never as
   decoration. **Take**: it maps to `--positive`, with `--growth` for "not quite".
4. **Dark, warm-tinted ground everywhere.** **Leave**: Social Pulse is deliberately light.

### Type and hierarchy

5. **Hierarchy through contrast inside body text.** Paragraphs sit in a muted ink and the key
   phrase in full-contrast bold, so emphasis comes from contrast rather than size. **Take**,
   expressed through the serif (§3.3).
6. **A small label names the kind of screen before its title.** **Take the principle**, changed
   in §3.2.
7. **One heavy sans for everything.** **Leave**: Social Pulse's serif carries content and the sans
   carries chrome.

### Layout and rhythm

8. **One idea per screen, top-anchored.** Content starts at the top and empty space below is
   left empty rather than filled. **Take**.
9. **The primary action never moves.** It is full-width, pinned to the same bottom position on
   every step, and changes only its label. **Take**.
10. **Flow screens are modal.** Inside a lesson there is no app chrome, only back, progress and
    exit. **Take**: it matches the Conversation screen's chrome-free treatment.
11. **Teaching uses a small kit of blocks:** paragraph, quote, and one highlighted key line.
    **Take the kit**, reshaped in §3.3.

### Interaction and feedback

12. **Choose, then commit.** Selecting an option and seeing its result are two distinct states.
    **Take**.
13. **The result always carries a reason.** Every answer, right or wrong, is followed by an
    explanation. **Take**: it matches the Feedback Summary principle that feedback is grounded.
14. **Unchosen options recede after answering.** **Take**: it's a common pattern, not a
    signature.
15. **Exercises borrow conversation grammar.** Reply exercises show the other person's line as a
    chat bubble, so the lesson previews the real thing. **Take**, and go further (§3.5).
16. **Tactile buttons** with a visible pressed depth. **Leave**: `DESIGN.md` specifies flat pills.

### Imagery

17. **One consistent visual world across the app.** A single illustration style, warm lighting,
    recurring characters. The consistency is what makes it feel like a place. **Take the
    consistency, leave the characters**: Social Pulse gets a shared vector kit (§3.4).
18. **An image on most teaching screens.** **Take**, with changes (§3.4).
19. **A signature geometric shape** reused as the container for every node, badge and
    celebration. **Leave**: it's Gleam's strongest brand motif.

### Motion (inferred: these are stills)

20. **Celebration is its own moment**, visually louder than anything else in the app. **Take**:
    Social Pulse raises `MOTION_INTENSITY` to 7 and gives finishing a Lesson a confetti burst.

### Tone

21. **Second person, short sentences, no hedging.** **Take**: `DESIGN.md` §7 already says this.

---

## 3. Divergence check

For each adopted idea: how it looks in Social Pulse, what would still be too close to Gleam, and
the alternative that keeps the idea.

### 3.1 The Lesson flow screen

**Social Pulse:** a full-screen route, chrome-free like Conversation. It has progress through the
Lesson, a way to step back, a way to leave, and one pinned full-width primary action.

**Too close:** a continuous rounded progress bar strung between a back chevron on the left and a
close cross on the right; an uppercase primary button with a darker lower lip; a square secondary
button beside it.

**Alternative:**
- **Segmented progress.** One short segment per step (8–12), set as a hairline row across the top
  edge. Steps are countable, so show them as countable.
- **Leave by name.** The top-left action names its destination ("← Lessons"), per
  `INFORMATION-ARCHITECTURE.md` §3. There is no close cross.
- **Step back at the bottom.** A quiet text "Back" sits beside the primary button, where the thumb
  already is.
- **The primary action** is a sentence-case, flat `--primary` pill (`DESIGN.md` §3), with no
  secondary square button (saving steps is parked).

### 3.2 Showing the step kind

**Social Pulse:** the user can tell a reading step from a "your move" step at a glance.

**Too close:** a colored uppercase label with a small icon above the title, warm for reading and
cool for responding.

**Alternative:** carry the mode in the **ground**, not a label. This is the ground inversion
`DESIGN.md` §1 borrows from the vocabulary app.
- **Explainers** sit on `--canvas`.
- **Check, Reply Choice and Written Reply** invert to a `--primary-soft` ground.
- **The Recap** returns to `--canvas`.

A small label may stay for accessibility, but in sentence case, `--ink-muted`, with no icon and no
color coding.

### 3.3 The Explainer's teaching blocks

**Social Pulse:** short paragraphs, an optional quote, and at most one highlighted key line.

**Too close:** quotes as bold text against a vertical rule; the key line in a labelled dark card
with an uppercase caption.

**Alternative:**
- **Quotes** set in Fraunces at `--text-title`, with hanging quotation marks and no rule.
- **The key line** highlighted inline with a `--primary-soft` marker band behind the text, not
  lifted into a separate captioned card.
- **Emphasis** inside paragraphs through Fraunces italic rather than bold, so a Social Pulse
  Explainer reads like a well-set essay rather than a dark card stack.

### 3.4 Artwork on Explainers

**Decided:** vector artwork on most Explainer steps. It's built from a shared kit of **gesture
shapes** (abstract forms acting out a dynamic: leaning in, turning away, one lighting another up)
plus a few **flat objects** (a cup, a chair, a door), colored with palette tokens and composed per
Lesson when its content is written.

**Too close:**
- **The rhythm.** Every teaching screen puts a same-shaped rounded image slot directly under the
  text. This is Gleam's rhythm, and the decision to put art on most Explainers makes it the
  biggest remaining risk in these notes.
- **A lone object as the hero.** A single warmly-lit object on a colored field is exactly one of
  Gleam's course covers.
- **Painterly or softly lit rendering**, which drifts toward generated-illustration style.

**Alternative:**
- **Unframed.** Artwork sits directly on the ground, with no rounded image rectangle and no
  background plate.
- **Placement varies, by rule.** Art may sit above the title, to the side of the key line, or
  bleed off one edge. Two consecutive Explainers never use the same placement.
- **Scale varies too.** Some steps get a full-width composition, others a small mark in the
  margin beside the key line.
- **Objects never stand alone.** A flat object appears only inside a gesture composition.
- **Flat and on-palette.** Solid fills from `--primary`, `--positive`, `--growth` and their
  soft tints, with no gradients, glows or lighting effects.
- **Motion carries personality.** Under `MOTION_INTENSITY: 7`, gesture shapes animate into place
  when the step enters (a lean, a turn). Moving art is something the reference's still images
  don't do.

### 3.5 "Someone says a line": Reply Choice and Written Reply

**Social Pulse:** a short line from another person, then either a few reply options or a text box.

**Too close:** a speaker label beside a colored circle holding an initial, a dark bubble, and
options as full-width rows with radio circles.

**Alternative:** make the Lesson a literal rehearsal of the **Conversation screen**.
- **The line** uses the persona bubble from `ChatScreen`, with no avatar. The speaker is set up by a
  context sentence in `--ink-muted` above it ("After a meeting, a coworker says…").
- **Reply Choice options** are outlined pills with no radio circle. The chosen pill fills, as
  `DESIGN.md` §1 already describes for quiz answers.
- **Written Reply** uses the Conversation composer (the same input and send button), so typing a
  reply in a Lesson feels like the practice it prepares you for.

### 3.6 The result reveal

**Social Pulse:**
- **Check and Reply Choice:** right or wrong, you see the explanation, the better option is
  highlighted, and you continue.
- **Written Reply:** you see a short verdict plus one line of why, then continue with no rewrite.
  Offline, or if the AI call fails, you see the Lesson's own example reply instead, with Try again
  on a failure (issue #1, story 21).

**Too close:** a sheet rising from the bottom, tinted by outcome, holding a verdict line, a
captioned explanation box and a report-issue control.

**Alternative:** no sheet. The result **grows in place under the chosen answer**, like a reply
threading beneath a message.
- **Tint:** `--positive-soft` for right, `--growth-soft` for "not quite". It's clay, not red, the
  same guidance-not-failure semantics the Feedback Summary uses.
- **The explanation** is set in `--text-body` directly under the answer, with no caption.
- **The primary button** changes its label in place, and nothing covers the screen.
- **Motion:** the chosen pill springs as it fills, and the explanation unfolds beneath it.

### 3.7 Finishing a Lesson

**Decided:** the Recap is the last step. **Finish** marks the Lesson done and plays **classic
confetti in new bright colors**, the same burst on every finish however the answers went. The
button area then becomes **Next Lesson** / **Done**.

**Too close:**
- Any separate completion screen.
- A badge or checkmark inside a shape at the center.
- Radial light rays.
- Stat tiles.
- A full-width "next" button stacked over an outlined "done" button.
- **The celebration's colors.** If orange leads the confetti, it borrows Gleam's accent family
  exactly when the user is paying most attention.

**Alternative:**
- **Over the Recap itself.** Confetti falls over the Recap, with no new screen, badge or stats.
- **The button area** becomes one `--primary` pill (**Next Lesson**) and a text link (**Done**),
  not two stacked full-width buttons.
- **Confetti palette.** A small set of celebration-only brights, used nowhere else: bright teal,
  sunflower yellow, berry pink, leaf green. Clay-orange may appear, but never as the lead color.
  Exact tokens come at fold-in.
- **Reduced motion:** the confetti doesn't play (`DESIGN.md` §6 rule).

### 3.8 The Recap and Apply It

**Social Pulse:** the Lesson's takeaways, then an **Apply It**, a short suggestion for using the
idea in a real situation. It's never tracked.

**Too close:** a numbered list in filled circles, a captioned card below it for the real-world
action, and a hero image above.

**Alternative:**
- **Takeaways** as two or three short Fraunces lines separated by hairlines, with no numbers and no
  circles.
- **Apply It** as the screen's one **inverted card** (`--primary` ground, `--on-primary` text), so
  the thing to do outside the app is the most prominent element.
- **No artwork** on the Recap: the confetti is its moment.
- **The on-screen label** reads along the lines of "Apply it in the real world". Final wording
  comes in the copy pass.

### 3.9 Lessons list: done marks and "next up"

**Social Pulse:** a quiet mark on finished Lessons, and the next unfinished Lesson highlighted.

**Too close:** a winding path of nodes, a "you are here" callout bubble, and lock icons.

**Alternative:** keep the existing list rows (`DESIGN.md` §4, medium density).
- **Done Lessons** get a small `--positive` check at the row's end.
- **The next unfinished Lesson** gets a `--primary-soft` row ground.

No counts, no path and no locks. The Draft chip stays where it is.

### 3.10 Motion at intensity 7

**Decided:** `MOTION_INTENSITY` goes from 3 to 7 app-wide, with bounce allowed.

**Too close:** unknown. The reference is stills, so there's no motion to copy or avoid. The one
inferred risk is a pressed-button depth effect (§2.16). Social Pulse's pills should respond with a
scale or spring, not a sinking lower edge.

**Guardrail kept:** under `prefers-reduced-motion: reduce`, every animation still falls back to
fading only, and the confetti doesn't play.

---

## 4. Proposed glossary changes (`CONTEXT.md`)

Apply at fold-in, not before: `CONTEXT.md` currently matches the code.

**Lesson** *(redefined)*:
A static, hand-authored instructional module that teaches one communication skill through an
ordered sequence of Lesson Steps, independent of any Practice Conversation.
_Avoid_: Module, course

**Lesson Step**:
One screen of a Lesson, of exactly one kind: Explainer, Check, Reply Choice, Written Reply, or
Recap.
_Avoid_: Card, page, slide

**Explainer**:
A Lesson Step that teaches one part of the Lesson's idea in a few short paragraphs.
_Avoid_: Learn step, content page

**Check**:
A Lesson Step that asks a multiple-choice question about the Lesson's idea and explains the answer
whichever option is picked.
_Avoid_: Quiz, test

**Reply Choice**:
A Lesson Step where someone says a line and the user picks the best reply from a few options, then
sees why it works.
_Avoid_: Your turn, scenario question

**Written Reply**:
A Lesson Step where someone says a line and the user types their own reply, which the AI answers
with a short verdict and one line of why.
_Avoid_: Grade, score, open answer

**Recap**:
The final Lesson Step: the Lesson's takeaways, ending in an Apply It.
_Avoid_: Summary (collides with Feedback Summary), review

**Apply It**:
A short suggestion, at the end of a Recap, for using the Lesson's idea in a real situation.
_Avoid_: Challenge, homework, task

---

## 5. Proposed changes at fold-in

### `DESIGN.md`

- **§1:** replace "Gleam — TODO" with a short read of the **take** principles from §2 above, and
  a line on what is deliberately not borrowed (dark ground, a single heavy sans, character
  illustration, the signature shape, tactile buttons, every scoring surface).
- **§3 Color:** add the celebration-only confetti tokens (§3.7). Record the ground inversion
  for "your move" steps (§3.2).
- **§4 Density:** add a row for **Lesson Steps**. One idea per screen suggests airy-to-medium,
  unlike today's comfortable-dense Lesson detail.
- **§5 Dials:** `MOTION_INTENSITY: 3 → 7`. Rewrite the rationale, since "calm coach; bounce would
  undercut it" no longer holds.
- **§6 Motion:**
  - Revisit screen push and chat bubble values under 7.
  - Drop "No bounce" from the quiz answer row.
  - Add: finish confetti, the in-place result reveal (§3.6), and gesture-art entrances (§3.4).
  - Keep the reduced-motion rule.
- **New section, Lesson artwork:** the gesture-shape and flat-object kit, the placement and scale
  variation rule, "objects never stand alone", flat fills on palette tokens only.
- **§7 Copy:** the Apply It label, and the Written Reply verdict wording (short and warm, never a
  grade).

### `INFORMATION-ARCHITECTURE.md`

- **Lesson detail → Lesson flow:**
  - A full-screen, chrome-free stepped route.
  - Stepping back moves one step. Leaving by name goes to wherever the Lesson was opened from, and
    restarts the Lesson.
  - The Recap offers Next Lesson / Done after Finish.
- **Lessons list:** done marks, and the next unfinished Lesson highlighted.
- **Home:** unchanged. Today's idea still uses a Lesson's title and one-line summary, which the
  stepped model keeps.
- **§5 Out of scope:** add locked Lessons and correctness-scaled celebration next to the existing
  gamification exclusion.

### `CLAUDE.md`

- **No gamification:** add one clause, *"celebrations never scale with right answers"*. The
  confetti is exactly the kind of feature that could quietly grow a score.

### Issue #1

Comment recording:
- **Story 18** is superseded by stepped Lessons, with Check and Reply Choice replacing the quiz.
- **Story 20** (offline Lessons) still holds: Written Reply falls back to the Lesson's example
  reply offline.
- **Further Notes:** "a clone of the core mechanic of Gleam" becomes "inspired by", per this
  review.

### What this implies in code

Descriptive only, not a work order:
- The `Lesson` model moves from `passage` + `quiz` to `steps`, while keeping `title`, `summary`
  and `isPlaceholder`. The existing quiz question shape maps onto Check and Reply Choice.
- Placeholder Lesson content is rewritten to 8–12 steps each.
- Written Reply uses the existing AI proxy, with a new prompt returning a verdict plus a reason.
- The motion layer from #15 is revisited against the new §6 values.
- Lesson done state is stored locally, next to History.
