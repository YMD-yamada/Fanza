# Fanza Search Navigator - Claude Code notes

Read `AGENTS.md` first. This project uses a Next.js version with breaking changes, so check the relevant guide under `node_modules/next/dist/docs/` before editing Next.js-specific APIs, routing, rendering, caching, middleware, or config.

## Project overview

- Next.js app for FANZA/DMM affiliate item search, detail pages, recent searches, favorites, affiliate links, and legal/compliance pages.
- Search is FANZA-only in the current product. Do not reintroduce removed multi-provider adapters unless the task explicitly asks for that architecture again.
- The app defaults to local-device favorites only. Account sync is disabled unless `NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC=1` and persistent storage are configured.

## Common commands

- Install: `npm install`
- Dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Production build: `npm run build`

## Environment

- Copy `.env.example` to `.env.local` for local development.
- Required secrets: `DMM_API_ID`, `DMM_AFFILIATE_ID`.
- Never commit `.env.local` or real API credentials.
- On Vercel, set the same required environment variables in the project settings.

## Deployment notes

- `next.config.ts` sets `output: "standalone"` for Docker/VPS deployment.
- Vercel/serverless operation should keep account sync off unless a database-backed storage path is implemented.
- Server-side FANZA API calls should run on Node serverless functions, not Edge runtime.

## Handoff process

- Read `CURSOR_HANDOFF.md` at the start of each session.
- Update `CURSOR_HANDOFF.md` at the end of each session with the work performed, validation, and any known caveats.

## 3D printing work

- Keep 3D printing models and generated STL/STEP/G-code in a separate repository unless the user explicitly asks to add them here.
- Prefer parametric, code-first CAD sources such as OpenSCAD, CadQuery, or build123d so dimensions and printer tolerances remain reviewable.
- Export STL/3MF only after rendering or validating the model, then use a slicer such as Cura, PrusaSlicer, or Bambu Studio for printer-specific G-code.
