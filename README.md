# Social Pulse

A personal EQ/communication-coaching PWA. See [CONTEXT.md](./CONTEXT.md) for domain vocabulary.

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

## Deploying to Vercel

This is a zero-config Vite project — Vercel autodetects the framework from `package.json`.

1. Import this GitHub repo in the [Vercel dashboard](https://vercel.com/new) (one-time, manual — requires your own Vercel account login, so it isn't automated here).
2. Leave the default build settings (`npm run build`, output directory `dist`).
3. Every push to `main` deploys automatically after that.
