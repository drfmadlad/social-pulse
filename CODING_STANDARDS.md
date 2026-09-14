# Coding standards

Read by the `code-review` skill's Standards axis. These are repo-specific rules earned by a
real incident each; the Fowler smell baseline (in the `code-review` skill itself) covers
everything else.

## `api/` deploys as native Node ESM

Vercel runs everything under `api/` as real Node ESM (`package.json` has `"type": "module"`),
which requires explicit `.js` extensions on relative imports. `tsconfig.api.json` now uses
`moduleResolution: "NodeNext"`, so a missing extension is a typecheck error, not a
`FUNCTION_INVOCATION_FAILED` discovered after deploy. Flag any relative import under `api/`
that omits its `.js` extension, even in a test file — nothing in `api/` is exempt from this
rule, whether or not it's excluded from deployment.

## Every file under `api/` is a public endpoint unless excluded

Vercel auto-detects each file in `api/` as its own serverless function. A test file placed
alongside a handler deploys as a live, public endpoint that 500s on every request. The one
exclusion Vercel honors is a `_`-prefixed file or folder (`api/_lib/`, `api/_tests/`) —
`vercel.json`'s `functions` block only configures matched functions, it does not exclude
siblings. Flag any new non-handler file added directly under `api/` without a `_` prefix.

## Medium-density surfaces default to `--space-4` padding

DESIGN.md §4 sets every non-Home list surface (Practice picker, Lessons list, History list) to
medium density: `--space-4`–`--space-6` card padding. `--space-3` has shipped as the first draft
more than once and undershoots the spec every time. Flag `--space-3` or smaller on a list
row/card outside Home.
