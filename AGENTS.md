<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview

Single-service Next.js 16 app (App Router) using the DMM/Fanza affiliate API. No database, no Docker, no secondary services. All data is fetched at runtime from the external DMM API.

### Required environment variables

The app needs `DMM_API_ID` and `DMM_AFFILIATE_ID` in `.env.local` to return search results. Without valid credentials, search requests return a 500 error. Copy `.env.example` to `.env.local` and fill in real values (see README for details).

### Common commands

See `package.json` scripts:
- `npm run dev` — starts the dev server on port 3000 (uses `next dev --webpack`)
- `npm run build` — production build (uses `next build --webpack`)
- `npm run lint` — runs ESLint
- `npm run start` — serves the production build

### Caveats

- The `--webpack` flag is required for both `dev` and `build` (already configured in `package.json` scripts). Do not drop it.
- Next.js 16 is used — consult `node_modules/next/dist/docs/` for API differences before making code changes.
- Google Fonts (Geist, Geist Mono) are loaded via `next/font/google`; an internet connection is needed during dev for font loading on first request.
