# Social Pulse

A personal EQ/communication-coaching PWA. See [CONTEXT.md](./CONTEXT.md) for domain vocabulary.

Live at [social-pulse-ruby.vercel.app](https://social-pulse-ruby.vercel.app).

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck and build for production
- `npm run test` — run the test suite once
- `npm run typecheck` — typecheck without emitting
- `npm run gen-icons` — regenerate the placeholder PWA icons in `public/icons/`

## Configuration

The `api/conversation` serverless function proxies AI calls so the provider API key never reaches the browser or this public repo. Copy `.env.example` to `.env` and fill in a real key for local development:

```bash
cp .env.example .env
```

- `AI_PROVIDER` — which provider to call (only `gemini` is currently supported)
- `AI_MODEL` — the model name, swappable without a code change (defaults to `gemini-3.5-flash-lite`)
- `GEMINI_API_KEY` — server-side only secret, get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Deploying to Vercel

This is a zero-config Vite project — Vercel autodetects the framework from `package.json` and the serverless function under `api/`.

1. Import this GitHub repo in the [Vercel dashboard](https://vercel.com/new) (one-time, manual — requires your own Vercel account login, so it isn't automated here).
2. Leave the default build settings (`npm run build`, output directory `dist`).
3. Set `AI_PROVIDER`, `AI_MODEL`, and `GEMINI_API_KEY` as environment variables in the Vercel project settings (same names as `.env.example`).
4. Every push to `main` deploys automatically after that.
