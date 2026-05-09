import type { SearchProvider } from "@/lib/search-providers/types";
import { fanzaProvider } from "@/lib/search-providers/fanza-provider";

/**
 * FANZA（DMM ItemList）専用。このアプリは追加の外部検索プロバイダを登録しません。
 */
const ALL_PROVIDERS: SearchProvider[] = [fanzaProvider];

export function getRegisteredSourceIds(): string[] {
  return ALL_PROVIDERS.map((p) => p.id);
}

/** True when `source` is a registered provider id（本アプリでは fanza のみ）。 */
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
