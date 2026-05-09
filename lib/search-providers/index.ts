import type { SearchProvider } from "@/lib/search-providers/types";
import { fanzaProvider } from "@/lib/search-providers/fanza-provider";
import { createHttpJsonProvider } from "@/lib/search-providers/http-json-provider";

function addHttpProvider(
  list: SearchProvider[],
  usedIds: Set<string>,
  provider: SearchProvider | null,
): void {
  if (!provider) return;
  if (provider.id === "fanza") {
    console.warn(`[search-providers] reserved id skipped: ${provider.id}`);
    return;
  }
  if (usedIds.has(provider.id)) {
    console.warn(`[search-providers] duplicate provider id skipped: ${provider.id}`);
    return;
  }
  usedIds.add(provider.id);
  list.push(provider);
}

function parsePriority(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function buildExtraHttpProviders(): SearchProvider[] {
  const out: SearchProvider[] = [];
  const usedIds = new Set<string>();

  const partnerBase = (process.env.R18_PARTNER_API_BASE_URL ?? "").trim();
  if (partnerBase) {
    addHttpProvider(
      out,
      usedIds,
      createHttpJsonProvider({
        id: "partner",
        label: (process.env.R18_PARTNER_LABEL ?? "").trim() || "R18 Partner",
        baseUrl: partnerBase,
        apiKey: (process.env.R18_PARTNER_API_KEY ?? "").trim() || undefined,
        apiKeyHeader: process.env.R18_PARTNER_API_KEY_HEADER,
        affiliateFallbackUrl: process.env.R18_PARTNER_AFFILIATE_FALLBACK_URL,
        mergePriority: parsePriority(process.env.R18_PARTNER_MERGE_PRIORITY, 10),
      }),
    );
  }

  for (let i = 1; i <= 5; i += 1) {
    const base = process.env[`R18_HTTP_PROVIDER_${i}_BASE_URL`]?.trim();
    if (!base) continue;

    const id = (process.env[`R18_HTTP_PROVIDER_${i}_ID`] ?? "").trim() || `r18_http_${i}`;
    const label =
      (process.env[`R18_HTTP_PROVIDER_${i}_LABEL`] ?? "").trim() || `Partner ${i}`;
    const mergePriority = parsePriority(process.env[`R18_HTTP_PROVIDER_${i}_MERGE_PRIORITY`], 20 + (i - 1) * 5);

    addHttpProvider(
      out,
      usedIds,
      createHttpJsonProvider({
        id,
        label,
        baseUrl: base,
        apiKey: (process.env[`R18_HTTP_PROVIDER_${i}_API_KEY`] ?? "").trim() || undefined,
        apiKeyHeader: process.env[`R18_HTTP_PROVIDER_${i}_API_KEY_HEADER`],
        affiliateFallbackUrl: process.env[`R18_HTTP_PROVIDER_${i}_AFFILIATE_FALLBACK_URL`],
        mergePriority,
      }),
    );
  }

  return out;
}

const EXTRA_HTTP_PROVIDERS = buildExtraHttpProviders();

const ALL_PROVIDERS: SearchProvider[] = [fanzaProvider, ...EXTRA_HTTP_PROVIDERS];

export function getRegisteredSourceIds(): string[] {
  return ALL_PROVIDERS.map((p) => p.id);
}

/** True when `source` is a registered provider id (FANZA + configured HTTP adapters). */
export function isProviderSourceId(value: string | null | undefined): boolean {
  return Boolean(value && ALL_PROVIDERS.some((p) => p.id === value));
}

export function getMergePriority(source: string): number {
  const provider = ALL_PROVIDERS.find((p) => p.id === source);
  return provider?.mergePriority ?? 100;
}

export function getEnabledProviders(): SearchProvider[] {
  return ALL_PROVIDERS.filter((provider) => provider.isEnabled());
}

export function getProviderById(id: string | null | undefined): SearchProvider | null {
  if (!id) return null;
  return ALL_PROVIDERS.find((provider) => provider.id === id) ?? null;
}
