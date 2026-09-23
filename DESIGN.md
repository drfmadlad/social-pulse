# Design Language

## 1. Reference read

### Vocabulary app (`docs/design-references/vocabulary-app/`)

**Palette.** Two grounds and one accent, held with real discipline. A dusty seafoam teal
(~`#9DC3C2`) and a warm bone paper (~`#F2EEE4`) — warm, not grey. One coral (~`#F08C7D`) on a
single screen. Ink is a warm near-black, never pure black. Four colors carry ten screens.

**Ground inversion as the variety mechanism.** Screens alternate: teal ground with a cream
card, then cream ground with a teal card. No gradients anywhere. No glows. Variety comes from
swapping figure and ground, not from adding color.

**Type.** A display serif paired with a small humanist sans. The serif carries the content —
*encumber*, *ineffable*, *lucid*, *indelible* — and the sans carries the chrome. That pairing
is the entire personality: the word is the hero, the UI gets out of the way. Marketing
headlines shift weight mid-line ("Improve **your** vocabulary") to create emphasis without
reaching for color.

**Spacing.** Airy to the point of boldness. The word card is mostly empty: one word, one
pronunciation, one short definition, then nothing until a small icon row at the bottom. Large
internal padding, large corner radii (~16–24px), generous margins around every card.

**Elevation.** Near-flat. Separation comes from card-versus-ground color contrast, not shadow.

**Controls.** Full-width pill buttons. Pill segmented control for word class. Quiz answers are
outlined pills that fill green on correct.

**Copy.** Plain, short, second person. "Only 1 min per day." No hype, no jargon.

**Motion.** *These are App Store stills, so this is inference, not observation.* A thin progress
bar sits above the quiz (implying an animated fill between questions), the "That's correct!"
panel sits below the options (implying a reveal), and the widget screen stacks cards (implying
swipe). Nothing here evidences heavy motion.

**Not borrowed:** the streak calendar, the ranking bell curve, the score tiles, the challenge
grid. That app is built on daily-streak mechanics; per issue #1 user story 28, Social Pulse is not.

### Gleam (`docs/design-references/gleam-app/`, kept local and gitignored)

Gleam is the paid app issue #1 names as the one Social Pulse replaces. It is loose inspiration,
not a template: borrowing a *function* is fine, but the *execution* must not be recognisable as
Gleam's to someone who has used both apps. `REFERENCE-NOTES.md` is the full record: every function
considered, and for each one borrowed, what would still be too close and the alternative taken
(its §3). What follows is the short read.

**Borrowed principles**, each already expressed in this document's own tokens:

- **Elevation by tonal step.** Raised surfaces sit a small lightness step off the ground, with no
  shadow. This is the canvas/surface pair.
- **Color encodes mode.** A step where you must respond looks different from a reading step at a
  glance. Here the ground carries it, not a colored label (§3, "Your move" ground).
- **Outcome colors are reserved.** `--positive` and `--growth` mark results, and never decorate a
  screen that shows results.
- **Emphasis by contrast inside body text,** not by size. Here that's Fraunces italic in full ink
  inside a muted paragraph.
- **One idea per screen, top-anchored.** Empty space below the content stays empty.
- **The primary action never moves.** It's pinned to the same place on every step, and only its
  label changes.
- **Flow screens are modal.** Inside a Lesson there is progress, a way back and a way out, and no
  app chrome.
- **Choose, then commit.** Selecting an option and seeing its result are separate states.
- **Every result carries a reason,** right or wrong, and unchosen options recede once you answer.
- **Exercises borrow conversation grammar.** The other person's line is a chat bubble, so a Lesson
  rehearses the Conversation screen.
- **One consistent visual world.** A single shared vector kit across every Lesson (§8).
- **Celebration is its own moment,** louder than anything else in the app (§6).
- **Second person, short sentences, no hedging.** Already §7.

**Not borrowed:** the dark, warm-tinted ground; one heavy sans for everything; character
illustration and warm, painterly lighting; the signature geometric shape that holds every node,
badge and celebration; tactile buttons with a sinking lower edge; and every scoring surface:
points, streaks, energy, levels, ranks, time studied, lessons-completed counts, locked lessons,
a per-lesson score, and a bigger celebration for a perfect run.

## 2. What the current design gets wrong

`src/index.css` today: near-black `#0f0f1a` ground, `#6c5ce7` purple, `#ff7edb` pink, and a
purple→pink gradient-filled wordmark. Dark-plus-purple-gradient is the default look of
generated apps — it is most of why the app reads vibe-coded rather than chosen.

Mechanically: six font sizes with no system (`1.75 / 0.9 / 0.85 / 0.8 / 0.75 / 0.7rem`, three
of them within a hair of each other), spacing values picked per-rule rather than from a scale,
and `--color-accent` doing double duty as both decoration and error text.

## 3. Direction

**Go light.** The reference is light, warm and calm; "calm habit-tracking app" density reads
light; and dark-plus-purple is the specific thing that feels generic. Dark mode stays possible
later as a properly designed counterpart, not an auto-inversion.

**Own palette, not a copy.** The vocabulary app's seafoam is about paper and study. Social
Pulse is about conversation, nerves and honest feedback. The borrowable part is the warm paper
ground and the two-tone discipline; the hue moves to a deeper slate-teal that can carry
coaching feedback with some authority.

### Color

```css
/* Grounds */
--canvas:        #F3F0E8;  /* app ground — warm paper */
--surface:       #FDFBF7;  /* raised cards */
--line:          #E2DDD2;  /* hairline */

/* Ink */
--ink:           #23302F;  /* warm charcoal, green cast — never pure black */
--ink-muted:     #5E6B69;
--ink-faint:     #8E9895;

/* Primary */
--primary:       #2F6F6A;  /* deep slate-teal */
--primary-soft:  #D7E6E3;
--on-primary:    #FDFBF7;

/* Feedback semantics */
--positive:      #4E7A57;  /* muted forest — "what you did well" */
--positive-soft: #DDE9DC;
--growth:        #C97B5A;  /* clay — "what you can do better" */
--growth-soft:   #F5E3D9;
```

Thirteen tokens, plus four celebration-only brights below. Clay rather than red for "what you can do better" is deliberate: that half of
the Feedback Summary is guidance, not error, and should not read as failure.

**Retire:** the gradient wordmark, `#6c5ce7`, `#ff7edb`, and `#0f0f1a`.

#### Celebration colors

```css
/* Celebration only: the finish confetti (§6). Used nowhere else. */
--confetti-teal:      #12A89A;  /* lead: the primary's hue, lit up */
--confetti-berry:     #D8336F;
--confetti-leaf:      #4DAA3C;
--confetti-sunflower: #F2B30C;
```

Four brights for one moment.

- **Nowhere else.** Not on buttons, chips, artwork, the Apply It card or anything else. If a
  brighter color seems wanted somewhere else, that's a new decision, not a reuse.
- **Teal leads.** Piece share is fixed: teal 35%, berry 25%, leaf 20%, sunflower 20%.
- **No orange.** Orange must never be the lead color, and the simplest way to hold that is to
  leave it out. Clay was allowed as a minor color in review, but a muted clay reads as grit among
  brights, and `--growth` is an outcome color. Gleam's accent is warm, so an orange-led burst would
  borrow it just when the user is paying most attention.
- **Sunflower stays at 20%.** Against warm paper it's about 1.6:1. That's fine for decoration,
  but it can't carry the burst.
- **Berry is not the retired `#ff7edb`.** It's deeper and redder, and appears only in the confetti.

#### "Your move" ground

A Lesson Step's mode is carried by its ground, not a label. This is the vocabulary app's ground
inversion used as a signal:

| Lesson Step | Ground |
|---|---|
| Explainer, Recap | `--canvas` |
| Check, Reply Choice, Written Reply | `--primary-soft` |

On the inverted ground, each element keeps the look it has elsewhere and shifts just enough not
to disappear into it:

- **The other person's chat bubble** takes `--surface`. On Conversation it's `--primary-soft`.
- **The composer input** takes `--surface`.
- **Result blocks and progress segments** shift too; their values are under Lesson Steps below.

The step needs no kind label. If one is added for accessibility, it's sentence case, `--text-sm`,
`--ink-muted`, with no icon and no color coding.

### Type

Two families. **Fraunces** for display — wordmark, screen titles, persona names, the Today's
idea card. **Inter** for everything else. Same division of labor as the reference: serif
carries content, sans carries chrome. (Conservative swap if Fraunces reads too characterful:
Source Serif 4.)

| Token | Size / line-height | Face | Use |
|---|---|---|---|
| `--text-display` | 32px / 1.15 | Fraunces | Today's idea, one per screen at most |
| `--text-title` | 24px / 1.25 | Fraunces | Screen titles |
| `--text-heading` | 18px / 1.35 | Inter 600 | Card and section headings |
| `--text-body` | 16px / 1.55 | Inter 400 | Reading text, chat bubbles |
| `--text-sm` | 14px / 1.45 | Inter 400 | Secondary text, metadata |
| `--text-xs` | 12px / 1.40 | Inter 500 | Labels, timestamps — uppercase, `0.04em` |

Six steps, each doing distinct work — replacing today's six near-identical sizes. The one
variant is weight 600 on `--text-body` or `--text-sm` for emphasis in the UI face, as list-row
titles already use.

Type tokens are independent of heading level. Each screen has exactly one `h1` and headings below
it descend without skipping, but a screen's `h1` may render at `--text-heading` (Practice picker,
Lessons list, History list) or be visually hidden (Lesson flow). The rule and the per-screen list
are in INFORMATION-ARCHITECTURE.md (Heading structure).

### Spacing

4px base; a restrained subset so values can't drift.

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-6: 24px;  --space-8: 32px;  --space-12: 48px; --space-16: 64px;
```

### Radius and elevation

```css
--radius-sm:   8px;    /* chips, inputs */
--radius-md:   14px;   /* list rows, chat bubbles */
--radius-lg:   20px;   /* cards, answer options that may wrap to two lines */
--radius-full: 999px;  /* buttons, pills */

--shadow-card: 0 1px 2px rgba(35,48,47,.04), 0 8px 24px rgba(35,48,47,.06);
```

One shadow token, used sparingly. Like the reference, separation comes mainly from canvas/card
contrast and hairlines. Buttons are full-width pills.

### Lesson Steps

The Lesson flow is chrome-free and full-viewport, like Conversation (INFORMATION-ARCHITECTURE.md
§2). `REFERENCE-NOTES.md` §3 gives the Gleam pattern each choice below steers away from.

**Top of every step**
- **Segmented progress:** one segment per step, `3px` tall, `--space-1` gaps, spanning the content
  width. Done and current segments are `--primary`; the rest are `--line` (`--surface` on the
  inverted ground). To assistive technology it's a progress bar with `aria-valuetext` "Step 3 of
  10". That counts steps, not answers, so it's wayfinding and not the "X of Y" score the flow
  forbids. It is never a percentage.
- **Below it:** the leave action naming its destination ("← Lessons" or "← Home") on the left,
  and the Draft chip on the right for placeholder Lessons. There's no close cross.

**Bottom of every step**
- **One pinned row** above the bottom safe area: a quiet text **Back** (`--ink-muted`, 44px tap
  target) on the left, and the `--primary` pill filling the rest of the row.
- **The pill never moves.** On step 1 the Back slot stays reserved and empty. Only the label
  changes, and the pill is sentence case, flat, with no pressed lower edge.
- **After Finish:** the pill becomes **Next lesson** and the Back slot becomes a **Done** text link.
  With no next Lesson to offer, **Done** takes the pill and the slot stays empty.

**Explainer**
- **Title** in `--text-title`.
- **Paragraphs** in `--text-body`, `--ink-muted`. Emphasis is Fraunces italic in `--ink`, never
  bold.
- **A quote** is Fraunces at `--text-title` in `--ink`, with hanging quotation marks and no
  vertical rule.
- **A key line** (at most one) sits inline in `--text-body` 600 `--ink`, on a `--primary-soft`
  marker band behind the text itself (`box-decoration-break: clone`). It is never lifted into a
  captioned card.
- **Artwork** per §8.

**Reply Choice and Written Reply**
- **A context sentence** in `--text-sm` `--ink-muted` sets up the speaker: "After a meeting, a
  coworker says…"
- **The line** is Conversation's persona bubble, with no avatar and no speaker label.
- **Reply Choice and Check options** are outlined: 1px `--primary` edge, `--ink` text, no radio
  circle, full content width, `--radius-lg` so a two-line reply still reads as a pill. The
  selected option fills `--primary` with `--on-primary` text.
- **Written Reply** uses Conversation's composer input, and the pinned pill is its send button
  ("Send"). That keeps one primary action in one place, even though `REFERENCE-NOTES.md` §3.5
  asked for the composer's own send button. The sent reply becomes a user bubble, and the typing
  indicator shows beneath it while the AI responds.

**Result block** (Check, Reply Choice, Written Reply)
- **It grows in place** under the chosen option or the sent reply. It's never a sheet, and
  nothing covers the screen.
- **Tint:** `--positive-soft` with a 1px `--positive` edge when right or landed, and
  `--growth-soft` with a 1px `--growth` edge when not. `--radius-md`. The edge is there because
  `--positive-soft` sits almost on top of the `--primary-soft` ground.
- **Content:** the verdict phrase (§7) in `--text-body` 600, then the explanation in
  `--text-body`, both `--ink`, with no caption.
- **After a wrong pick,** the better option gains a 2px `--positive` edge. Other unchosen options
  recede to `--ink-faint` text with a `--line` edge. The chosen option stays filled.
- **Written Reply's fallback** (offline or failed) uses the same block on `--surface` with a
  `--line` edge. It shows the Lesson's example reply and a Try again text action.

**Recap**
- **On `--canvas`, with no artwork:** the confetti is its moment.
- **Takeaways:** two or three Fraunces lines at `--text-title`, separated by `--line` hairlines,
  with no numbers, bullets or circles.
- **Apply It** is the screen's one inverted card: `--primary` ground, `--on-primary` text,
  `--radius-lg`. It holds its label (§7) in `--text-sm` 600, then the suggestion in `--text-body`.

**Lessons list rows** keep §4's medium density.
- **A finished Lesson** shows a small `--positive` check (16px) at the row's end, announced as
  "Done".
- **The next unfinished Lesson's row** takes a `--primary-soft` ground, announced as "Up next"
  with no visible callout.
- **No counts, percentages, path or locks.** The Draft chip is unchanged.

## 4. Density, per surface

The brief asks for a calm homepage and richer secondary screens, so density is set per surface
rather than globally.

| Surface | Level | Rules |
|---|---|---|
| **Home** | Airy | `--space-8` between blocks, `--space-6` card padding, `--space-12` above the wordmark. Five elements, hard ceiling. No lists. |
| **Practice picker, Lessons list, History list** | Medium | `--space-4` between rows, `--space-4`–`--space-6` card padding. |
| **Lesson Steps** | Airy-to-medium | One idea per screen, top-anchored, with empty space below left empty. `--space-4` side padding. `--space-6` between blocks: title, paragraphs, quote, key line, artwork, the line, options, result. `--space-4` between paragraphs, between options, inside option pills and inside result blocks. `--space-6` inside the Apply It card. Scrolling content reserves the pinned bottom row's height, so nothing hides behind it. |
| **Conversation, Feedback Summary** | Comfortable-dense | `--space-3` between chat bubbles, `--space-4` between feedback points. Content-first; this is where detail is wanted. |

Minimum 44px tap targets everywhere.

## 5. Dial values

Per the `design-taste-frontend` skill's vocabulary. That skill scopes itself to "landing pages,
portfolios, and redesigns. Not... multi-step product UI" — this *is* multi-step product UI, so
its dial vocabulary applies but its landing-page baseline of `8 / 6 / 4` does not.

**`DESIGN_VARIANCE: 4`** — well below the 8 baseline. Asymmetry sells a landing page seen once;
this is a product opened daily, where predictable placement lowers load. 4 leaves room for one
asymmetric moment per screen — the Today's idea card, the ground inversion on Conversation, an
Explainer's artwork — while lists and forms stay symmetric and boring on purpose.

**`MOTION_INTENSITY: 7`** — raised from 3 when Lessons became a stepped flow. The earlier
rationale was "calm coach; bounce would undercut it". That fit an app of reading and chat, and
it no longer holds. A Lesson is now a run of small commitments: choose, commit, see why, finish.
Each lands better with a physical response, and finishing should be the loudest moment in the
app. 7 buys:
- **Springs with a small overshoot** on things the user touched and things arriving on screen:
  pills, bubbles, feedback points, artwork.
- **Artwork that acts out its gesture** as a step enters.
- **One confetti burst** on Finish.

It stops short of:
- Bounce on whole screens.
- Parallax, or scroll-driven effects.
- Anything perpetual beyond the typing indicator.
- Any animation that makes input wait.

Calm is kept by where motion lands: nothing on Home moves on its own. If Conversation starts to
feel busy at this level, revisit its rows in §6 first.

**`VISUAL_DENSITY: 2 on Home, 3 on Lesson Steps, 5 on other detail screens`** — deliberately
split rather than a single global value, per §4 and the brief.

## 6. Motion

Values for `MOTION_INTENSITY: 7` (§5).

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);    /* entrances, reveals, fills */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* looping and on-screen movement */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* overshoots ~10%, then settles */
```

`--ease-spring` is the standard ease-out-back curve. Four rules:

- **Springs apply to `transform` only, on small deltas:** scale within 4%, translate within 16px,
  rotate within 12°. The overshoot should be felt, not seen.
- **Opacity on entrances and reveals rides `--ease-out`.** The typing indicator's loop uses
  `--ease-in-out` throughout.
- **Whole screens never spring.**
- **No `ease-in` on UI.** The confetti's fall is gravity, not UI.

Everything animates `transform`, `opacity` or a color. The one exception is the result reveal's
height, which animates `grid-template-rows`. No animation holds up input: controls respond the
moment they appear, subject only to their own enabled state.

| Moment | Spec | Reduced motion |
|---|---|---|
| **Screen push** | 280ms. `transform` from 24px X on `--ease-out`, with no spring. Opacity 0→1 over 200ms `--ease-out`. Back reverses, from −24px. | 200ms fade |
| **Lesson Step change** | Screen push values, applied to the step's content only. The progress row and pinned bottom row don't move. The newly current segment fills over 200ms `--ease-out`. The ground crossfades between `--canvas` and `--primary-soft` over 280ms `--ease-out`. | Content fades over 200ms; the ground and segment crossfades stay |
| **Chat bubble in** | 240ms. `transform` from 8px Y and scale 0.96 on `--ease-spring`, with the origin at the bubble's bottom corner on its speaker's side. Opacity over 160ms `--ease-out`. It also brings in the other person's line on Reply Choice and Written Reply. | 160ms fade |
| **Typing indicator** | Three 6px dots on a 1.2s loop, `--ease-in-out`, 150ms apart. Each rises 4px and goes from 0.4 to full opacity at its peak. It's the only perpetual animation in the app, and it's also Written Reply's waiting state. | Dots hold still at 0.7 opacity |
| **Feedback Summary points** | Each point takes 280ms: `transform` from 12px Y and scale 0.98 on `--ease-spring`, opacity over 200ms `--ease-out`. 70ms stagger, capped at six; later points enter with the first. Each group staggers from its own start. | 160ms fades, same stagger |
| **Option select** | The chosen option fills over 160ms `--ease-out` while it springs: scale 0.97→1 over 240ms `--ease-spring`. Choosing a different option moves the fill with the same values. | Fill color change only |
| **Result reveal, in place** | On commit, the result block unfolds under the chosen option: `grid-template-rows` 0fr→1fr over 280ms `--ease-out`. Its content starts 80ms in, fading over 200ms `--ease-out` and rising 8px on `--ease-spring`. Unchosen options recede over 200ms `--ease-out`, and the better option's edge fades in with the block. The pill's label crossfades over 120ms. Written Reply's verdict and fallback use the same reveal under the sent reply. | The block appears at full height and fades in over 200ms; the recede and label change are fades |
| **Artwork entrance** | Starts 120ms after the step begins entering. Each gesture shape plays its gesture once, pivoting from its base, over 520ms on `--ease-spring`, 80ms apart: a **lean** (rotate in from up to 12°), a **turn away** (rotate up to 12° while drifting up to 16px apart), a **rise** (from 16px Y). A shape **lighting up** crossfades its fill from soft tint to full over 320ms `--ease-out`. At most three shapes move, and everything settles within 900ms. Flat objects don't move; they fade in over 200ms `--ease-out`. It plays each time the step enters, forward or back, and never loops. Longer than UI motion because it's decorative, and it never holds up the pill. | The composition fades in over 200ms; nothing moves |
| **Finish confetti** | One burst of 120 pieces exploding outward from the pill's own on-screen position, the same on every finish. **Pieces:** 70% 6×12px rectangles and 30% 8px squares, colored by the §3 celebration shares. It reads as a cannon fired from the pill, not a fountain. **Launch:** spread over the first 120ms; each piece gets its own angle across an upward-facing fan of ±72° (not a narrow near-vertical spread, and not a full circle — the pill sits at the screen's bottom edge, so there's nowhere for a downward launch to go) and its own reach, sized in viewport units so the burst fills most of the screen on any device: 52–92vh of climb and up to 66vw of sideways throw. **The two axes run on separate curves,** on nested elements, because one transform can only hold one curve at a time and a shared one flares the pieces back outward as they drop. **Sideways:** the throw decays against drag on `cubic-bezier(0.08, 0.7, 0.2, 1)`, spending nearly all its distance in the first third and then all but stopping. **Rise:** near-instant muzzle velocity on `cubic-bezier(0.05, 0.7, 0.25, 1)`, decelerating to a hang at the peak by 28% of the piece's life. **Fall:** the remaining ~70%, starting from that standstill and accelerating into a steady drift on `cubic-bezier(0.4, 0, 0.8, 0.8)` — gravity settling to terminal velocity, not a plummet — timed to each piece's own duration so it's still visibly falling right up to removal, past the bottom edge. **Spin:** 360–1080° while flipping on X. Each piece lives 1.8–2.6s, scaled to how high it was thrown so everything comes down at about the same speed, and all are removed by 2.6s. Built dependency-free from DOM pieces colored with the `--confetti-*` tokens, with `pointer-events: none`. The bottom row changes at once, without waiting for the burst. The pill's label crossfades to Next lesson over 120ms, and a Done text link fades into the Back slot over 200ms `--ease-out`. With no next Lesson, the label crossfades to Done and nothing else appears. | Not rendered. The Lesson is marked done, and the bottom row changes with fades |

Under `@media (prefers-reduced-motion: reduce)`, every row loses its movement: no translate,
scale, rotate or spring. What's left is fades and color changes, per the last column. The
confetti isn't rendered, and artwork doesn't move.

**Press states.** Pills never show a sinking lower edge, which is Gleam's tactile button. If a
press state is added, it's a scale to 0.97.

**`position: fixed` screens apply the screen-push classes directly.** An ancestor element with
an active `transform` becomes the containing block for any `position: fixed` descendant,
breaking full-viewport layout for the animation's duration. A `position: fixed` screen
(Conversation, chrome-free per INFORMATION-ARCHITECTURE.md) can't be wrapped in the shared
`ScreenTransition` component for this reason — it applies `screenTransitionClassName()` to its
own root instead. See `ScreenTransition.tsx` and `screenDirection.ts`. The Lesson flow is the
second fixed-position screen and gets the same direct-application treatment, as will any after it.

## 7. Copy tone

Plain, short, second person — as the reference does it.

Two current strings to fix:

- "Past Practice Conversations will appear here soon." — "soon" is a developer apology. Should
  read "Your finished conversations will show up here." (And per INFORMATION-ARCHITECTURE.md it
  moves to the History screen, so a new user never meets an empty box on their first screen.)
- "← Back to categories" → "← Practice".

**Draft-content badge.** The three magenta PLACEHOLDER badges are honest but they are a large
part of why the homepage reads unfinished. Keep the honesty, move and quiet it: the badge lives
on the Lessons list row and in the Lesson flow's top bar, never on Home, restyled as a small
`--ink-faint` outline chip reading "Draft."

**Lesson flow labels.** On-screen labels are sentence case, even where a spec capitalizes an
action's name:
- **The pill:** "Continue", "Check" (commits a Check or Reply Choice), "Send" (Written Reply),
  "Finish" (Recap), "Next lesson".
- **Text actions:** "Back", "Done", "Try again".
- **Leaving:** "← Lessons" or "← Home".

**Check and Reply Choice results.** "That's it." when right and "Not quite." when not, followed
by the explanation. Never "Correct", "Wrong" or "Incorrect".

**Written Reply verdicts.** Short and warm, never a grade. Each verdict value has one fixed
phrase:

| Verdict | Phrase |
|---|---|
| `landed` | "That lands." |
| `not_yet` | "Not quite yet." |

- **The reason** follows as one sentence in second person. It names what the reply did, and for
  "not yet", what the Lesson's move would add. For example: "You jumped to advice; naming their
  worry first would let it land."
- **Never:** right or wrong, correct, pass or fail, a number, stars, a percentage, "Great job!",
  or a rewritten version of the reply.
- **Fallback:** "You're offline, so here's one way to say it." or "Couldn't get feedback just
  now. Here's one way to say it." Then the Lesson's example reply, and "Try again".

**Missing feedback.** A History entry whose Feedback Summary never arrived reads "Feedback didn't
come through for this one." in `--ink-muted`, then a "Get feedback" pill. It's a note, not an
error: the conversation itself was saved.

**Apply It.** The label reads "Apply it in the real world", in sentence case and never as an
uppercase caption.
- **The suggestion** is one or two sentences that name a real situation and start with a verb or
  "Next time…": "Next time someone tells you about their week, ask one follow-up before you share
  yours."
- **Never:** "Challenge", "Task", "Homework", a deadline, or any later question about whether you
  did it.

**Finishing.** Nothing refers to how the answers went: no "You got X of Y", no "Perfect!", no
count of Lessons done.

## 8. Lesson artwork

Most Explainers carry vector artwork from one shared kit, so every Lesson feels like the same
place. It is also the biggest remaining risk of looking like Gleam (`REFERENCE-NOTES.md` §3.4):
a same-shaped image slot under the text on every teaching screen is Gleam's rhythm. The rules
below exist to break that rhythm.

### The kit

- **Gesture shapes** are abstract forms (pebbles, capsules, arcs) acting out a social dynamic
  through tilt, spacing, overlap and fill. Two forms lean in, one turns away, one lights another
  up. No faces, eyes, limbs or human silhouettes: characters are Gleam's world, not this one.
- **Flat objects** are a few everyday props that set a scene: a cup, a chair, a door.
- **Compositions** are built from both, named and registered in one place. An Explainer
  references one by name, with a placement and a scale. The kit only has to cover the Lessons
  that exist, and grows as new ones are written.

### Color and rendering

- **Palette tokens only:** solid fills from `--primary`, `--positive`, `--growth` and their
  `-soft` tints. No hard-coded colors, gradients, glows, shadows, outlines, lighting or texture.
  Never the `--confetti-*` colors.
- **Only on Explainers.** Explainers never show a result, so the outcome hues read as color there,
  not as a verdict. Check, Reply Choice, Written Reply and the Recap never carry artwork.

### Composition rules

- **Objects never appear alone.** A flat object only appears in a composition that also has at
  least one gesture shape. A lone object on a colored field is one of Gleam's course covers.
- **Unframed.** Artwork sits directly on the step's ground, with no rounded image rectangle,
  background plate or border.
- **Decorative.** It's hidden from assistive technology (`aria-hidden`), and the Explainer's text
  carries the meaning without it.

### Placement and scale

| Placement | Where it sits | Scales allowed |
|---|---|---|
| `above-title` | Above the title, from the content's leading edge | Full or marginal |
| `beside-key-line` | In the margin beside the key line, with the line wrapping around it | Marginal only, and only on an Explainer with a key line |
| `bleed-edge` | After the step's text, pushed a third past the left or right edge of the Lesson column. On a phone that edge is the screen edge, so 25–40% of it is cropped; on a wider screen the overhang shows in the margin beside the column, never detached from it. Never centered. | Full only |

- **Full** spans the content width, at most 180px tall.
- **Marginal** fits a 64px square.

**No two consecutive Explainers share a placement.** Compare each Explainer's artwork with the
artwork on the previous Explainer that has any, whatever steps sit between them. Size isn't
enough variety on its own: a full `above-title` followed by a marginal `above-title` still
breaks the rule.

**Motion:** see §6, Artwork entrance.
