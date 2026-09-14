## Screen structure and visual language

Two documents at the repo root are the source of truth for how this app is put together. Read
both before changing any screen, and keep them current when a decision changes.

- **`INFORMATION-ARCHITECTURE.md`** — the screen inventory, what each screen is responsible for,
  and how navigation flows between them. The app is a navigation stack rooted at Home with **no
  tab bar**; detail views take over the screen rather than rendering inside a homepage card.
- **`DESIGN.md`** — the design language: color tokens, type scale, spacing scale, radii,
  per-surface density, motion specs, and the `DESIGN_VARIANCE` / `MOTION_INTENSITY` /
  `VISUAL_DENSITY` dial values.

Two standing constraints these encode, both easy to undo by accident:

- **No gamification.** No streaks, XP, scores, leaderboards or progress charts (issue #1, user
  story 28). The vocabulary app in `docs/design-references/` is built on streak mechanics; only
  its palette discipline, card shapes and copy tone are borrowed.
- **Home stays calm.** Five elements, hard ceiling. New features get their own screen rather
  than another homepage card.

Implementation runs screen by screen, so a session may touch only one screen — the docs, not the
neighbouring code, are what keep the rest consistent with it.

## Coding standards

`CODING_STANDARDS.md` at the repo root holds review-time rules earned by real incidents — the
`api/` deploy gotchas, a spacing default that's undershot the density table more than once. The
`code-review` skill's Standards axis reads it automatically; implementation doesn't need to
carry it.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for drfmadlad/social-pulse, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
