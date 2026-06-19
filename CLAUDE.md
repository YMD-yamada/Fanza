@AGENTS.md

# Claude Code Project Guide — Fanza Search Navigator

This file is read automatically by Claude Code at the start of a session. It gives
the agent the context it needs to work in this repository. Cursor users migrating to
Claude Code: see `docs/CLAUDE_CODE_MIGRATION.md` for setup and GitHub/Vercel wiring.

## What this project is

A Next.js 16 (App Router, React 19) web app that searches FANZA (DMM ItemList Web
Service) and surfaces images, sample videos, and affiliate purchase links. Source is
**FANZA only**; other vendors are intentionally not wired in.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start dev server at http://localhost:3000 (Webpack)
npm run build      # production build (Webpack, output: standalone)
npm run start      # run the production build
npm run lint       # ESLint (eslint-config-next)
npx tsc --noEmit   # type-check only
```

There is no unit-test runner configured. `scripts/private-mode-walkthrough.mjs` is a
Playwright walkthrough helper. Treat `npm run lint`, `npx tsc --noEmit`, and
`npm run build` as the standard verification gate before committing.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values. Never commit real secrets —
`.gitignore` excludes `.env*` except `.env.example`.

- Required: `DMM_API_ID`, `DMM_AFFILIATE_ID`
- Common optional: `FANZA_HITS`, `MULTI_SEARCH_MODE`, `PROVIDER_TIMEOUT_MS`,
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_FEEDBACK_URL`, `NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC`

## Architecture (where things live)

- `app/` — App Router pages and API routes (`app/api/search`, `app/api/items/[id]`,
  legal pages, `robots.ts`, `sitemap.ts`).
- `components/` — UI (search results, item cards, favorites, age gate, etc.).
- `lib/` — core logic: `fanza.ts` (DMM client), `search-providers/` (provider
  registry; currently FANZA only), `search-aggregate.ts` / `search-merge.ts`
  (fan-in + dedupe), `types.ts`, client storage helpers.

## Conventions

- This is Next.js 16 with breaking changes vs. older versions. Read the relevant guide
  in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).
- Search/detail must run on the Node serverless runtime, not Edge (DMM API is called
  server-side).
- Keep the app FANZA-only unless explicitly asked to add providers.
- Follow legal/compliance basics: keep the 18+ age gate and legal pages intact.

## Git / PR workflow

- Use feature branches; do not commit directly to `master`.
- One logical change per commit, with descriptive messages.
- Push, then open a PR. CI (`.github/workflows/ci.yml`) runs `npm run lint` and
  `npm run build` on pushes/PRs to `master`/`main`.

## Deployment

- **Vercel (recommended):** connect the GitHub repo; pushing to `master` auto-deploys.
  Set the same env vars from `.env.example` in the Vercel project. Use the Node runtime.
- **Docker/VPS:** `next.config.ts` uses `output: "standalone"`; see `README.md`.
