import type { SearchProvider } from "@/lib/search-providers/types";
import { fanzaProvider } from "@/lib/search-providers/fanza-provider";
import { partnerProvider } from "@/lib/search-providers/partner-provider";

const ALL_PROVIDERS: SearchProvider[] = [fanzaProvider, partnerProvider];

export function getEnabledProviders(): SearchProvider[] {
  return ALL_PROVIDERS.filter((provider) => provider.isEnabled());
}

export function getProviderById(id: string | null | undefined): SearchProvider | null {
  if (!id) return null;
  return ALL_PROVIDERS.find((provider) => provider.id === id) ?? null;
}
