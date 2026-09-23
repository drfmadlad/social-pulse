# 0001. In-memory, per-instance rate limiting for the AI proxy

## Status

Accepted

## Context

`api/conversation.ts` is public and unauthenticated: any caller who finds the URL can hold the
whole Gemini quota, and nothing stops another site from calling it cross-origin and spending the
app's API key on someone else's traffic (issue #30).

Rejecting a caller past a rate limit needs somewhere to keep the count. This app deliberately has
no external services — everything is client-side IndexedDB plus stateless Vercel functions (see
`CONTEXT.md`, `README.md`). Two options exist for where that count lives:

- **In-memory, per-serverless-instance counters.** Free, no new infrastructure, no new secret.
  The trade-off: the count resets whenever an instance cold-starts, and each concurrently warm
  instance keeps its own count, so the real limit a determined caller experiences is
  `threshold × warm instance count`, not the threshold itself. It's a soft, best-effort limit.
- **A shared external store** (Vercel KV, Upstash Redis). Gives one true count across every
  instance, so the limit is a hard guarantee. The trade-off: a new paid dependency, a new secret
  to provision and rotate, and a real integration to maintain, for an app whose one stated
  external dependency so far is the AI provider itself.

This ticket is abuse mitigation, not a correctness or billing-accuracy guarantee — the goal is to
stop a single caller (or a stray script on another origin) from casually draining the quota, not
to enforce an exact request budget. Nothing else in this repo's ADRs or docs argues for taking on
a new paid service for that.

## Decision

Use an in-memory counter, keyed by caller IP, inside `api/_lib/rateLimiter.ts`. Each serverless
instance tracks its own fixed 60-second window and allows at most 20 requests per caller in that
window; a caller over the limit gets `429` with a `Retry-After` header until the window rolls
over. 20 requests/minute is well above what one real Practice Conversation needs — a session is a
handful of exchanges, not a burst of dozens of calls a minute — so normal use never hits it.

This is explicitly a **soft limit**: it resets on cold start and doesn't sum across concurrently
warm instances, so a caller spread across enough instances can exceed the nominal threshold. That
gap is acceptable for abuse mitigation on a hobby-scale app; it would not be acceptable if this
limit needed to bound cost or usage exactly.

Combined with the origin check (requests must come from the app's own deployed origin, with an
allowance for `localhost`), this closes the two gaps #30 calls out without adding a dependency.

The per-instance map is unbounded by construction — a distinct caller adds a new key — so
`checkRateLimit` sweeps out expired windows itself (throttled to once per window, so the sweep
doesn't turn every call into an O(n) scan) rather than relying on the instance recycling to bound
memory. It's the same in-memory-only trade-off as the count itself: cheap, no new service, bounded
well enough for this traffic level, not a hard guarantee.

The `localhost` allowance in the origin check is gated on `VERCEL_ENV` being unset or
`"development"` — i.e. an actual local `vercel dev`/`vitest` run, never a real deployment. Without
that gate, the allowance would have been a standing bypass: nothing stops a non-browser caller
from just sending `Origin: http://localhost` to the live production or preview URL, since only a
real browser's same-origin policy makes the header trustworthy in the first place.

## Consequences

- No new service, secret, or paid dependency.
- The limit can be undercounted across instances; it should not be relied on for a hard cap on
  spend. If the app ever needs a hard guarantee (e.g. a real per-user quota tied to billing),
  revisit this decision in favor of a shared store — Vercel KV or Upstash Redis, per the options
  above.
- The counter map is bounded by periodic sweeping, not by an entry limit — a large enough burst of
  distinct callers within one window still grows it temporarily. Acceptable at this traffic level;
  an LRU cap would be the next step if that ever changes.
- Revisiting the threshold (`RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` in
  `api/_lib/rateLimiter.ts`) is a one-line change if real usage patterns turn out different from
  what's assumed here.
