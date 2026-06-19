# CURSOR HANDOFF

> 移行メモ: 今後の開発は **Claude Code** で続行する想定です。手順は
> `docs/CLAUDE_CODE_MIGRATION.md`、エージェント向けの常設ガイドは `CLAUDE.md` を参照。

## 2026-06-19 Session — Claude Code 移行準備

- Cursor → Claude Code への引き継ぎを整備（コード/Git/GitHub/Vercel はそのまま継続可能）。
- `docs/CLAUDE_CODE_MIGRATION.md` を新規作成（セットアップ、GitHub 連携、Vercel 連携、
  新規プロジェクトの始め方を日本語で記載）。
- `CLAUDE.md` を最小（`@AGENTS.md` のみ）からプロジェクトガイドへ拡充
  （概要・コマンド・構成・規約・Git/PR・デプロイ）。
- クリーンアップ: 誤コミットされていた Cursor デバッグログ `.cursor/debug-*.log`（約4MB）を
  削除し、`.gitignore` に `.cursor/` を追加。
- 検証: `npm run lint` / `npx tsc --noEmit` / `npm run build`（下記参照）。

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
