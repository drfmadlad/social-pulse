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
light; and dark-plus-purple is the specific thing that feels generic. Light is the design's home.

**Dark follows the phone.** At night the paper ground is harsh, so a dark counterpart exists
(issue #50), designed rather than auto-inverted, and chosen by the phone's own light/dark setting
through `prefers-color-scheme`. There's no in-app switch, because there's no settings screen to
put one on. Changing the setting switches the open app live, with no reload. It is still not
dark-plus-purple: the ground is a deep green-cast slate from the primary's family, not a
purple-black (the retired `#0f0f1a`) and not Gleam's warm-tinted dark (§1).

**Own palette, not a copy.** The vocabulary app's seafoam is about paper and study. Social
Pulse is about conversation, nerves and honest feedback. The borrowable part is the warm paper
ground and the two-tone discipline; the hue moves to a deeper slate-teal that can carry
coaching feedback with some authority.

### Color

| Token | Light | Dark | Role |
|---|---|---|---|
| **Grounds** | | | |
| `--canvas` | `#F3F0E8` | `#121A19` | App ground: warm paper, or deep green-cast slate |
| `--surface` | `#FDFBF7` | `#293734` | Raised cards. In dark, raised steps *lighter* |
| `--line` | `#E2DDD2` | `#3C4B48` | Hairline |
| **Ink** | | | |
| `--ink` | `#23302F` | `#E4EBE8` | Warm charcoal with a green cast, never pure black; in dark, a green-grey white, never pure white |
| `--ink-muted` | `#56635F` | `#A4B2AE` | Secondary text |
| `--ink-faint` | `#768380` | `#7F8E8A` | **Never readable text.** The 3:1 tier: input edges, the typing indicator, receded options |
| **Primary** | | | |
| `--primary` | `#2F6F6A` | `#72B8AE` | Deep slate-teal; in dark, lifted so it reads as text and edges |
| `--primary-soft` | `#D7E6E3` | `#132C29` | Tint: the "your move" ground, persona bubble, key-line marker |
| `--on-primary` | `#FDFBF7` | `#0F1A19` | On a `--primary` fill. Dark ink in dark mode, because the lifted primary is light |
| **Feedback semantics** | | | |
| `--positive` | `#4E7A57` | `#8AC498` | Muted forest: "what you did well" |
| `--positive-soft` | `#DDE9DC` | `#1C3224` | |
| `--growth` | `#C97B5A` | `#DE9C7F` | Clay: "what you can do better" |
| `--growth-soft` | `#F5E3D9` | `#332822` | |

Thirteen tokens, each with a light and a dark value, plus four celebration-only brights and the
shadow and scrim below. Clay rather than red for "what you can do better" is deliberate: that half
of the Feedback Summary is guidance, not error, and should not read as failure.

**How dark is built.** It keeps light's structure rather than inverting it. The grounds hold the
same tonal steps (canvas → `--primary-soft` → `--surface` about 1.2:1 each), so the "your move"
ground and the elevation-by-tonal-step principle both survive. The full hues lift so they read on
dark, which makes the filled primary light with dark `--on-primary` text: selected options, the
user's chat bubbles, the pill and the Apply It card. The `-soft` tints become dark tints of the same
hues.

**Only tokens.** Every color is a token defined in `src/index.css`'s two `:root` blocks (the dark
one under `@media (prefers-color-scheme: dark)`), and nothing else in `src/` holds a color literal.
That's what makes the setting switch the whole app at once, and `src/palette.test.ts` enforces it.

#### Contrast

WCAG AA in both modes: text 4.5:1 whatever its size, and 3:1 for control edges and marks that carry
meaning. The table lists every text-and-ground pairing the app uses, and every such edge and mark.
`src/palette.test.ts` enforces the minimums; the ratios are recorded here for reference.

| Foreground | On | Light | Dark | Needs |
|---|---|---|---|---|
| `--ink` | `--canvas` | 12.01 | 14.61 | 4.5 |
| `--ink` | `--surface` | 13.23 | 10.26 | 4.5 |
| `--ink` | `--primary-soft` | 10.63 | 12.22 | 4.5 |
| `--ink` | `--positive-soft` | 10.92 | 11.33 | 4.5 |
| `--ink` | `--growth-soft` | 10.99 | 11.82 | 4.5 |
| `--ink-muted` | `--canvas` | 5.51 | 8.05 | 4.5 |
| `--ink-muted` | `--surface` | 6.07 | 5.65 | 4.5 |
| `--ink-muted` | `--primary-soft` | 4.88 | 6.73 | 4.5 |
| `--ink-muted` | `--positive-soft` | 5.01 | 6.24 | 4.5 |
| `--ink-muted` | `--growth-soft` | 5.04 | 6.51 | 4.5 |
| `--primary` | `--canvas` | 5.12 | 7.73 | 4.5 |
| `--primary` | `--surface` | 5.64 | 5.43 | 4.5 |
| `--primary` | `--primary-soft` | 4.53 | 6.47 | 4.5 |
| `--on-primary` | `--primary` | 5.64 | 7.77 | 4.5 |
| `--ink-faint` | `--canvas` | 3.46 | 5.17 | 3 |
| `--ink-faint` | `--surface` | 3.81 | 3.63 | 3 |
| `--ink-faint` | `--primary-soft` | 3.06 | 4.32 | 3 |
| `--positive` | `--surface` | 4.79 | 6.17 | 3 |
| `--positive` | `--primary-soft` | 3.84 | 7.35 | 3 |

What this rules out, in both modes:
- **`--ink-faint` is never text.** Counts, the Draft chip and chat speaker labels use `--ink-muted`;
  the speaker label on the user's own bubble uses `--on-primary`.
- **`--positive` and `--growth` are never text on their own tints.** In light mode neither reaches
  4.5:1 there, so a Feedback Summary quote is `--ink` and the tint says which group it's in.
- **Inputs carry a `--ink-faint` edge,** not `--line`, so the field itself meets 3:1.

Receded options (`--ink-faint` text) are exempt as inactive controls, and still stay above 3:1.
A result block's `--positive` or `--growth` edge isn't held to 3:1 either: the verdict text carries
the meaning, so the edge is a boundary, not a mark. In light mode `--growth` on `--primary-soft` is
2.52:1. Darkening `--growth` to clear that would change the clay everywhere else it appears.

#### Status bar and theme color

`index.html` carries a `theme-color` pair, one per `prefers-color-scheme`, each set to that mode's
`--canvas`, so the installed app's status bar and task-switcher color follow the phone. It also
declares `color-scheme: light dark`, so the browser's own ground before the stylesheet loads, and
its scrollbars and form controls, match. The manifest's `theme_color` and `background_color` can
hold only one value each and stay on light `--canvas`; they color the splash screen, which is
brief.

On iOS, `apple-mobile-web-app-status-bar-style` stays `default`: iOS draws an opaque strip colored
from `theme-color`. `black-translucent` would run the page under white status-bar text, which
disappears on the light canvas. Before iOS 18, an installed web app only picked up a change to the
phone's setting on its next launch; that's the platform, not something the app can fix.

**Retire:** the gradient wordmark, `#6c5ce7`, `#ff7edb`, and `#0f0f1a`.

#### Celebration colors

Celebration only: the finish confetti (§6). Used nowhere else.

| Token | Light | Dark | |
|---|---|---|---|
| `--confetti-teal` | `#12A89A` | `#22C3B3` | Lead: the primary's hue, lit up |
| `--confetti-berry` | `#D8336F` | `#E8528A` | |
| `--confetti-leaf` | `#4DAA3C` | `#5DBE4B` | |
| `--confetti-sunflower` | `#F2B30C` | `#E0A30B` | |

Four brights for one moment. On dark the problem flips: every bright reads (5–8:1 on the dark
canvas), but sunflower becomes the brightest piece. So in dark the teal lifts to keep the lead
and sunflower deepens a little, while berry and leaf lift just enough not to sink into the ground.

- **Nowhere else.** Not on buttons, chips, artwork, the Apply It card or anything else. If a
  brighter color seems wanted somewhere else, that's a new decision, not a reuse.
- **Teal leads.** Piece share is fixed: teal 35%, berry 25%, leaf 20%, sunflower 20%.
- **No orange.** Orange must never be the lead color, and the simplest way to hold that is to
  leave it out. Clay was allowed as a minor color in review, but a muted clay reads as grit among
  brights, and `--growth` is an outcome color. Gleam's accent is warm, so an orange-led burst would
  borrow it just when the user is paying most attention.
- **Sunflower stays at 20%.** Against warm paper it's about 1.6:1. That's fine for decoration,
  but it can't carry the burst. Against the dark canvas it's the opposite, and 20% keeps it from
  taking over.
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
--scrim:       rgba(35,48,47,.4);   /* dims the screen behind a dialog */

/* Dark */
--shadow-card: 0 1px 2px rgba(6,10,9,.3), 0 8px 24px rgba(6,10,9,.4);
--scrim:       rgba(6,10,9,.6);
```

One shadow token, used sparingly. Like the reference, separation comes mainly from canvas/card
contrast and hairlines. Buttons are full-width pills. In dark, a shadow cast in the ink's color
would glow, so both take the dark ground's deepest shade, and more of it; the lighter `--surface`
does most of the lifting there.

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

### Scenario brief

An ordinary scrolling screen in the `.home-section` card, not chrome-free: nothing has started yet.
Medium density (§4), top to bottom with `--space-6` between blocks:

- **"← Practice"**, the back action.
- **The category** as a label: `--text-xs` uppercase, `--ink-muted`.
- **The Persona's name** as the screen title: `--text-title` Fraunces, `--ink`. Then what they're
  like in `--text-body` `--ink-muted`.
- **The chooser**, legend "Situation" in `--text-sm` 600. Its options are the Check option pills
  (Lesson Steps above): outlined in `--primary`, the chosen one filled, `--space-4` apart. No radio
  circle and no badge on Surprise me; it's just the first option.
- **The situation panel**, a `--primary-soft` block with `--radius-md` and `--space-4` padding: "The
  situation" and "Your role" as `--text-xs` uppercase `--ink-muted` labels, each followed by its
  text in `--text-body` `--ink`. With Surprise me chosen, it holds one line instead (§7).
- **The Focus picker**, legend "Focus" styled like the chooser's, then one line of explanation in
  `--text-sm` `--ink-muted` (§7). Its options are the same outlined pills, but sized to their label
  and wrapping, `--space-2` apart, in `--text-sm` with `--radius-full` and a 44px minimum height:
  eight full-width pills would double the screen's length for an optional setting. **None** comes
  first and is chosen by default, with no badge.
- **Start**, a full-width `--primary` pill.

The screen pushes in like any other (§6); choosing an option uses Option select.

**On the Conversation,** the Scenario's situation and the user's role open the transcript as one
quiet block: `--text-sm` `--ink-muted`, centred, with a `--line` hairline under it. It isn't a
notice (no ground, no edge) and scrolls away with the transcript.

**The Focus line,** on the Feedback Summary (under its title) and the History entry detail (under
its timestamp), reads "Your focus:" in `--text-sm` `--ink-muted`, then the Focus's label in 600
`--ink`, with `--space-6` below it. It's neutral on purpose: no ground, no edge, and never
`--positive` or `--growth`, which mark results, since the Focus is never marked achieved. It adds no
heading.

**Try again,** on the Feedback Summary and the History entry detail, is the outlined pill
(`button-secondary`): 1px `--primary` edge, `--primary` text in `--text-sm` 600, no fill, 44px
minimum. It sits on its own line after the feedback, with `--space-6` above it, since the user reads
down to it.
- **Secondary to Done, so sized to its label.** Done is the Feedback Summary's quiet way out, a
  `--primary` text action at the top. A full-width pill at the foot would outrank it, so Try again is
  the one pill not stretched to the content width (an exception to "Buttons are full-width pills"
  above). It's never filled either: the filled `--primary` pill on these screens belongs to getting
  the feedback (Get feedback, and the retry when it fails).
- **On the History entry detail** it sits above the quiet Delete, which keeps its own `--space-6`
  gap, so the two never read as a pair.
- **The label is only "Try again".** Never "2nd try", "Try to beat it", or anything that counts or
  compares attempts (INFORMATION-ARCHITECTURE.md §5). When the feedback fails, its retry inside the
  error block reads "Try again" too, so this one's accessible name says what it starts: "Try again in
  a new conversation". It begins with the visible label, so voice control still finds it.
- **It moves like any navigation**, by URL depth (`screenDirection.ts`). From the Feedback Summary
  the Conversation is a shallower URL, so it plays as back; from a History entry, as forward.

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
| **Practice picker, Scenario brief, Lessons list, History list** | Medium | `--space-4` between rows, `--space-4`–`--space-6` card padding. |
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
| **Update offer** | 240ms. `transform` from 8px Y on `--ease-out`, with no spring: it's a status note arriving unasked, and calm is the point. Opacity 0→1 over 200ms `--ease-out`. It has no exit animation: Reload and Not now remove it at once. | 160ms fade |
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
`--line` outline chip reading "Draft." in `--ink-muted` (it was `--ink-faint`, which is too faint
to be text; see §3, Contrast).

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

**Save failures.** When a save to History fails, the screen says so in a `HistorySaveNotice`: a
`--text-sm` note on `--surface` with a `--line` edge and `--ink` text, announced politely
(`role="status"`, not an alert), with no retry action. It's neutral on purpose: `--positive` and
`--growth` mark verdicts on the Feedback Summary screen, and a failed save isn't one. It says what
was lost, never promises what isn't guaranteed yet, and never blocks the feedback itself:
- **Conversation not saved:** "This conversation couldn't be saved, so it won't show up in
  History." It makes no claim about the feedback, which may still be generating or may itself fail.
- **Feedback not saved:** "This feedback couldn't be saved, so it won't be here if you come back to
  this conversation later. The conversation itself is still in History."

**Offline Practice.** Offline, the Practice picker reads "You're offline — Practice needs a
connection. Lessons work offline." between its heading and the category cards, in the same quiet
notice as a save failure: `--text-sm` `--ink` on `--surface` with a `--line` edge, polite
(`role="status"`), with no retry action, since reconnecting is what brings Practice back. It's a
statement of fact, not an error: no error colour, no icon, no apology. The cards stay, dimmed to
the disabled pill's 50% opacity with a not-allowed cursor.

**Scenario brief.** The chooser's default reads "Surprise me". With it chosen, the situation panel
says "One of Jordan's situations, picked when you start. You'll see it at the top of the
conversation." It never hints at which. A chosen Scenario's labels are "The situation" and "Your
role"; on the Conversation the role reads "Your role: …". Scenario titles are plain descriptions
("A first date over coffee"), never a level, difficulty or rating (INFORMATION-ARCHITECTURE.md §5).
The Focus picker explains itself in one line: "Optional. Pick something to practise, and your
feedback will speak to it." Its first option reads "None". Focus labels are things to practise
("Staying calm"), never targets ("Ask three questions") and never a goal, score or streak.

**Conversation length.** A Practice Conversation holds a limited number of messages, and the
Conversation screen says so quietly rather than letting the server refuse a line
(INFORMATION-ARCHITECTURE.md, Conversation). Both notes are neutral, like `HistorySaveNotice`:
`--text-sm` `--ink`, announced politely (`role="status"`), never an error colour and never a count
of lines left.
- **A few lines before it:** a note at the foot of the transcript, in the same quiet notice as a
  save failure (`--surface` with a `--line` edge): "This conversation is nearly as long as it can
  go. You've got a few more lines."
- **At it:** the composer row gives way to "This conversation is as long as it can go." and an
  **End & get feedback** `--primary` pill. The top bar's End & get feedback stays too. A failed
  reply's Try again still works here.
- **Per line:** the composer and Lesson Written Reply inputs stop at the server's per-message
  length, so a long paste is cut short rather than refused.

**Render errors.** The "Something went wrong" screen reuses the `.home-section` card, with the
`--ink-muted` `--text-sm` body line the empty states use and a `button-primary` link, "Go to
Home". It's a plain statement, not an alarm: no error colour, no icon, no apology, no error text
or code. It says what's true and what's safe: "This screen couldn't load. Anything you'd already
finished is still saved in History." It doesn't say that an unfinished conversation is safe,
because it isn't.

**Update offer.** When a new version of the app is waiting, an `AppUpdateOffer` says so in a quiet
note pinned to the bottom of the screen: `--surface` with a `--line` edge, `--radius-lg`,
`--shadow-card` and `--space-4` padding, at most as wide as the content column, above the bottom
safe area. It's a polite status region, never a modal, so nothing dims and nothing is trapped.
- **Copy:** "A new version is ready." in `--text-body` 600 `--ink`, with a quiet **Not now** text
  action (`--text-sm` 600 `--ink-muted`, 44px tap target) and a **Reload** `--primary` pill. Never
  "Update required", never a version number, never anything urgent.
- **Reload** applies the update and reloads the page, in that tab only. Nothing else ever does: the
  app never reloads itself, and taking the update in one tab never reloads another. **Not now**
  hides the note until the app is next opened or another update lands, and the app stays fully
  usable either way.
- **Room for it:** while the note is showing, the page keeps `--space-16` × 2 of extra space under
  its content, so the note never covers a last row or a primary action.
- **Where it doesn't appear:** the Conversation and the Lesson flow. A Practice Conversation lives
  only in memory and a Lesson's step position isn't kept, so a reload there loses something. The
  note waits and shows on the next screen the user reaches. It also stays off Home's five elements:
  it's an overlay on any screen, not a card in one.

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
  Never the `--confetti-*` colors. Because the fills are tokens, the artwork takes the dark
  palette with everything else: full hues lift and soft tints darken, so a soft shape still reads
  as the quieter one.
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
