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

### Gleam — TODO

The Gleam screenshots did not come through and are not on disk. Rather than invent a read, this
section is left open. Gleam is the app issue #1 names as the paid product Social Pulse replaces,
so its homepage is the most directly relevant reference available — worth filling in.

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

Thirteen tokens. Clay rather than red for "what you can do better" is deliberate: that half of
the Feedback Summary is guidance, not error, and should not read as failure.

**Retire:** the gradient wordmark, `#6c5ce7`, `#ff7edb`, and `#0f0f1a`.

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

Six steps, each doing distinct work — replacing today's six near-identical sizes.

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
--radius-lg:   20px;   /* cards */
--radius-full: 999px;  /* buttons, pills */

--shadow-card: 0 1px 2px rgba(35,48,47,.04), 0 8px 24px rgba(35,48,47,.06);
```

One shadow token, used sparingly. Like the reference, separation comes mainly from canvas/card
contrast and hairlines. Buttons are full-width pills.

## 4. Density, per surface

The brief asks for a calm homepage and richer secondary screens, so density is set per surface
rather than globally.

| Surface | Level | Rules |
|---|---|---|
| **Home** | Airy | `--space-8` between blocks, `--space-6` card padding, `--space-12` above the wordmark. Five elements, hard ceiling. No lists. |
| **Practice picker, Lessons list, History list** | Medium | `--space-4` between rows, `--space-4`–`--space-6` card padding. |
| **Conversation, Feedback Summary, Lesson detail** | Comfortable-dense | `--space-3` between chat bubbles, `--space-4` between feedback points. Content-first; this is where detail is wanted. |

Minimum 44px tap targets everywhere.

## 5. Dial values

Per the `design-taste-frontend` skill's vocabulary. That skill scopes itself to "landing pages,
portfolios, and redesigns. Not... multi-step product UI" — this *is* multi-step product UI, so
its dial vocabulary applies but its landing-page baseline of `8 / 6 / 4` does not.

**`DESIGN_VARIANCE: 4`** — well below the 8 baseline. Asymmetry sells a landing page seen once;
this is a product opened daily, where predictable placement lowers load. 4 leaves room for one
asymmetric moment per screen — the Today's idea card, the ground inversion on Conversation —
while lists and forms stay symmetric and boring on purpose.

**`MOTION_INTENSITY: 3`** — enough for screen transitions, a typing indicator, and staggered
feedback reveals. No physics, no scroll-driven effects. The register is "calm coach"; bounce
would undercut it.

**`VISUAL_DENSITY: 2 on Home, 5 on detail screens`** — deliberately split rather than a single
global value, per §4 and the brief.

## 6. Motion

| Moment | Spec |
|---|---|
| Screen push | 220ms `cubic-bezier(.2,.8,.2,1)`, 16px X-translate + fade. Back reverses. |
| Chat bubble in | 160ms fade + 4px rise |
| Typing indicator | Three dots, 1.2s loop — the only perpetual animation in the app |
| Feedback points | 60ms stagger on reveal, capped around six items |
| Quiz answer | 200ms background fill on the chosen pill. No bounce. |

Every one of these sits inside `@media (prefers-reduced-motion: reduce)` and degrades to
opacity-only.

**`position: fixed` screens apply the screen-push classes directly.** An ancestor element with
an active `transform` becomes the containing block for any `position: fixed` descendant,
breaking full-viewport layout for the animation's duration. A `position: fixed` screen
(Conversation, chrome-free per INFORMATION-ARCHITECTURE.md) can't be wrapped in the shared
`ScreenTransition` component for this reason — it applies `screenTransitionClassName()` to its
own root instead. See `ScreenTransition.tsx` and `screenDirection.ts`. Any future fixed-position
screen needs the same direct-application treatment, not the wrapper.

## 7. Copy tone

Plain, short, second person — as the reference does it.

Two current strings to fix:

- "Past Practice Conversations will appear here soon." — "soon" is a developer apology. Should
  read "Your finished conversations will show up here." (And per INFORMATION-ARCHITECTURE.md it
  moves to the History screen, so a new user never meets an empty box on their first screen.)
- "← Back to categories" → "← Practice".

**Draft-content badge.** The three magenta PLACEHOLDER badges are honest but they are a large
part of why the homepage reads unfinished. Keep the honesty, move and quiet it: the badge lives
on the Lessons list row and Lesson detail, never on Home, restyled as a small `--ink-faint`
outline chip reading "Draft."
