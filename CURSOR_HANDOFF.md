# CURSOR HANDOFF

## 2026-08-15 Session (FANZA SSO + auto-login)

- FANZA公式の会員ログイン（OAuth/OpenID）は第三者サイト向けに公開されていない。偽のFANZAログインフォームは作らない。
- 実装: セッション約13か月・端末ごとに最大8本・訪問で延長。ログイン済みなら `/login` からホームへ。既定で「この端末では次回から自動で入る」。

## 2026-08-15 Session (R18 web value + legal + store decision)

- Branch `cursor/r18-web-legal-value-be62`: keep shipping as **Web only**. App Store / Google Play / Microsoft Store は成人向けのため出さない（`docs/STORE_AND_LEGAL.md`）。
- Auth: guest はヘッダー「ログイン」→ `/login`（メール＋パスワードのみ）。パスキーはパスワード 401 かつ `canPasskey` のときだけ。ログイン後メニューはパスワード変更と、残存パスキー削除のみ。
- Favorites sync: 初回は local+remote を merge。別ユーザーの local は引き継がない。remote を localStorage にミラー。`getSessionUserId` は期限切れprune時だけ write。
- Discover: 空ホームに人気・新着レール。`view=rank|new` で一覧。詳細に関連作品。カードにメーカー／時間／サンプルあり。クイック検索から「ロリ系」を削除。
- Legal: 年齢確認は 18+ と規約同意チェック。アフィリエイトは「広告 · FANZAで見る」+ `rel=sponsored`。`/legal/notice`。販売者は FANZA。PWA manifest はホーム画面追加用。
- SEO: `rating: adult`、SearchAction JSON-LD、catalog sitemap、robots で `/login` `/reset-password` を disallow。ルート canonical を外した。
- PR #28 merged to `master` (`23f1b49`); production → https://fanza-nine.vercel.app 。ストア申請はしない。`docs/RELEASE_FLOW.md`。

## 2026-08-15 Session (passkey-only recovery)

- Passkey-only 既存口座が iPad 等で入れない: 新規 409 でログインへ切替、メールでパスワード設定を主導線、パスキー失敗時は「この端末に無い」と案内。
- 本番は再設定メール未設定のため、パスキーのみ口座は `POST /api/auth/password/claim-legacy` で今のパスワードを足して入れる（Resend があるときはメール必須）。
- PR #29 merged (`075ff7e`)。PR #30 merged (`97d91a8`) → production https://fanza-nine.vercel.app/login 。既存パスキーのみ口座は `canClaimPassword: true`。

## 2026-08-08 Session (remove passkeys)

- Branch `feat/remove-passkeys-for-password-only` → PR #27 merged (`a777383f`); production → https://fanza-nine.vercel.app
  - Logged-in users can clear all passkeys after setting a password (password confirmation required).
  - API `POST /api/auth/passkey/remove`; `/api/auth/me` returns `hasPassword`/`hasPasskey`.

## 2026-08-07 Session (auth UX recovery)

- Branch `feat/auth-header-and-recovery` → PR #26 merged to `master` (`d5929ed8`); production READY → https://fanza-nine.vercel.app
  - Mid-page AccountPanel removed; header top-right `AccountMenu` (guest OK without login).
  - Email methods hint (`/api/auth/methods`); 409/401 explain password vs passkey.
  - Password forgot/reset (`/api/auth/password/*`, `/reset-password`); optional Resend email.
  - Logged-in: set password + add passkey (`/api/auth/passkey/add/*`).
  - Recovery without Resend: passkey login → set password in menu.
  - Human optional: set `RESEND_API_KEY` + `AUTH_EMAIL_FROM` for email password reset.

## 2026-08-07 Session (password + passkey)

- Branch `feat/password-and-passkey-auth`: restore password register/login as primary path; keep passkey as optional alternate.
- WebAuthn RP uses request Host (not only SITE_URL) so origin matches the URL opened; verify accepts both origins.
- Clearer passkey error messages suggesting password fallback.

## 2026-08-06 Session (passkeys)

- Branch `feat/passkey-auth`: WebAuthn passkeys replace password UI for account sync.
  - `@simplewebauthn/server` + `browser`; APIs under `/api/auth/passkey/*`.
  - Passkeys stored in Blob/file user store; password optional for legacy accounts.
  - AccountPanel: register/login with passkey + discoverable “保存済みパスキーで続行”.
  - `NEXT_PUBLIC_SITE_URL=https://fanza-nine.vercel.app` set on Vercel for RP ID.

## 2026-08-06 Session (account sync)

- Branch `feat/sync-favorite-terms`: cross-browser favorites via login.
  - Vercel private Blob store `fanza-user-data` + `BLOB_READ_WRITE_TOKEN`.
  - `NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC=1` on Production/Preview/Development.
  - `lib/userStore.ts`: Blob backend when token present; file backend for Docker/local.
  - Sync **works + people + keywords** (`/api/favorites`, `/api/favorite-terms`).
- Prior: favorite people/keywords UI shipped on master (PR #22) → https://fanza-nine.vercel.app

## 2026-08-06 Session

- Confirmed production baseline is `master`. Previous WIP on `cursor/http-json-search-provider` (DUGA multi-API) was stashed as `wip: duga provider on http-json branch`.
- Branch `feat/favorite-people-and-keywords` (from master):
  - Favorite **people** (出演者) and **keywords/項目** (ジャンル・クイック検索語) in localStorage (`lib/favorite-terms.ts`, `useFavoriteTerms`).
  - Star buttons on result cards / detail (people + genres) and on SearchBar quick chips.
  - SearchBar section「お気に入りから検索」— one-tap search buttons for saved people/keywords.
  - Home FavoritesSection lists people/keywords alongside saved works.
  - Fixed `RecentQueriesBar` lint (`useSyncExternalStore`).
- Validation: `npx tsc --noEmit`, `npm run lint`, `npm run build` ok.
- Published: PR #22 merged to `master` (`5ef03694`); Vercel production READY → https://fanza-nine.vercel.app
- Restore DUGA WIP later with `git stash list` / `git stash apply` on `cursor/http-json-search-provider` if needed.

## 2026-08-03 Session

- Workspace moved to `C:\Users\cz7\Projects\Fanza` (Synology path unavailable).
- Branch `cursor/http-json-search-provider`: completed multi-API wiring.
  - Native DUGA provider (`lib/search-providers/duga-provider.ts`).
  - Registry: FANZA + DUGA + optional `R18_PARTNER_*` / `R18_HTTP_PROVIDER_1..5_*`.
  - `makerNames` + title/date/maker merge.
  - DUGA credit in `ApiCredit` when configured.
  - `.env.example` / `README.md` updated.
- User still needs: DUGA credentials, live search check, legal review.

## 2026-05-07 Session

- Added legal/compliance hardening:
  - `components/AgeGate.tsx`: client-side 18+ age confirmation overlay.
  - `app/legal/terms/page.tsx`: clearer affiliate/rights/disclaimer wording.
  - `app/legal/privacy/page.tsx`: added note about age-confirmation state storage.
- Added SEO basics:
  - `app/layout.tsx`: expanded metadata (`metadataBase`, OG/Twitter, robots, canonical).
  - `app/items/[id]/page.tsx`: added `generateMetadata` for detail pages.
  - `app/robots.ts`: robots policy + sitemap pointer.
  - `app/sitemap.ts`: sitemap entries for top/legal pages.
- Validation run:
  - `npx tsc --noEmit` passed
  - `npm run lint` passed
  - `npm run build` passed

## 2026-05-08 Session

- Added multi-provider search architecture:
  - `lib/search-providers/types.ts`: provider contracts.
  - `lib/search-providers/fanza-provider.ts`: FANZA provider adapter.
  - `lib/search-providers/partner-provider.ts`: optional partner API adapter (`R18_PARTNER_*` envs).
  - `lib/search-providers/index.ts`: provider registry.
  - `lib/search-aggregate.ts`: fan-in aggregation, timeout handling, partial-success warnings, auto fallback mode.
- Extended API/UI models:
  - `lib/types.ts`: `source`, `sourceLabel`, `score`, `warnings`, `mode`.
  - `app/api/search/route.ts`: now uses aggregate search.
  - `app/api/items/[id]/route.ts`: source-aware item lookup.
  - `app/items/[id]/page.tsx`: source-aware metadata and item retrieval.
  - `components/SearchResultsInfinite.tsx`: warnings banner + source tab fallback.
  - `components/ItemCard.tsx`: source badge + source-aware detail links.
- Updated storage/linking for multi-source IDs:
  - `lib/item-link.ts`, `lib/savedItem.ts`, `lib/useStorage.ts`, `components/FavoriteButton.tsx`, `components/RecordHistory.tsx`, `components/SavedSection.tsx`.
- Updated docs/config:
  - `.env.example`: added multi-provider and timeout settings.
  - `README.md`: added multi-API setup and legal-check reminders per API.
- Validation run:
  - `npx tsc --noEmit` passed
  - `npm run lint` passed
  - `npm run build` passed

## 2026-05-09 Session

- Plan completion / hardening:
  - `lib/search-merge.ts`: cross-provider duplicate collapse by normalized title + release date (FANZA wins).
  - `lib/search-aggregate.ts`: applies merge after per-source dedupe + sort.
  - `lib/fanza.ts`: optional `AbortSignal` on ItemList fetch for cancellable timeouts.
  - `lib/search-providers/fanza-provider.ts` / `partner-provider.ts`: AbortController timeouts (removed `withTimeout`; deleted `lib/search-providers/utils.ts`).
  - `app/page.tsx`: initial SSR search uses `aggregateSearch` so multi-provider results match `/api/search`.
  - `README.md`: documented cross-source merge behavior.
- Follow-up verification:
  - `npm run lint` exit 0
  - `npm run build` exit 0 (SWC `win32-arm64-msvc` load warning on this machine; Next falls back to WASM)

## 2026-05-11 Session

- FANZA-only product: removed extra HTTP providers (`http-json-provider` deleted); `lib/search-providers/index.ts` registers **fanza** only.
- UX / growth: `lib/recent-queries.ts` + `RecentQueriesBar`, `ShareSearchLink` (UTM on copy), SearchBar **/** focus + `rememberRecentQuery`, `GrowthFooter` + `NEXT_PUBLIC_FEEDBACK_URL`, improved empty / no-hit copy in `home-copy.ts`.
- `SearchResultsInfinite`: hide redundant source tabs when a single provider.
- `.env.example` / `README.md`: FANZA-only docs; dropped `R18_*` partner envs.
- Validation: `npx tsc --noEmit`, `npm run build` ok.

## 2026-05-10 Session

- README: **調査メモ（国内）** — DMM/FANZA, DUGA official Web API link, SOKMIL/SOD/DLsite notes; clarifies most vendors need a BFF to match `http-json-provider` contract.
- Multi extra R18 HTTP adapters:
  - `lib/search-providers/http-json-provider.ts`: factory for optional official HTTP JSON APIs (`/search`, `/items/{id}`).
  - `lib/search-providers/index.ts`: wires legacy `R18_PARTNER_*` plus `R18_HTTP_PROVIDER_1..5_*`; exports `isProviderSourceId`, `getMergePriority`.
  - `lib/search-providers/fanza-provider.ts` + `lib/search-providers/types.ts`: `mergePriority` on providers.
  - Removed `lib/search-providers/partner-provider.ts` (replaced by factory).
  - `lib/types.ts`: `SourceId` is a slug string; API routes validate via `isProviderSourceId`.
  - `lib/search-merge.ts`: merge priority from registry (not a fixed fanza/partner map).
  - `components/SearchResultsInfinite.tsx`: source tabs show `sourceLabel`.
  - `lib/savedItem.ts`: accept any valid source slug.
  - `.env.example` / `README.md`: how to add multiple providers + note that other shops rarely publish a public API index (contract/developer portals).
- Validation: `npx tsc --noEmit` ok; `npm run lint` ok.
