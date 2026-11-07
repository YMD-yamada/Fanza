<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview
Single-service Next.js 16 app (App Router, React 19, Tailwind CSS v4). No database, no Docker, no microservices. Uses npm as package manager (`package-lock.json`).

### Required secrets
`DMM_API_ID` and `DMM_AFFILIATE_ID` must be available as environment variables and written to `.env.local`. Without them, search and item-detail API routes return errors.

### Running the app
- `npm run dev` — starts the dev server on port 3000 (uses `--webpack` flag)
- `npm run build` — production build (also uses `--webpack` flag)
- `npm run lint` — runs ESLint (flat config, no args needed)
- No automated test suite exists in this repo.

### Environment setup
Copy `.env.example` to `.env.local` and fill in real values. If `DMM_API_ID` and `DMM_AFFILIATE_ID` are set as shell env vars, inject them:
```
sed -i "s/^DMM_API_ID=.*/DMM_API_ID=$DMM_API_ID/" .env.local
sed -i "s/^DMM_AFFILIATE_ID=.*/DMM_AFFILIATE_ID=$DMM_AFFILIATE_ID/" .env.local
```

### Gotchas
- The dev script uses `next dev --webpack` (not the default Turbopack). Always include `--webpack` when invoking Next.js commands.
- API routes (`/api/search`, `/api/items/[id]`, `/api/track-click`) call the external DMM API; responses depend on valid credentials.
- No automated tests exist — validate changes via lint, build, and manual browser testing.
