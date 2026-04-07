const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID ?? "";

export function getAffiliateId(): string {
  return AFFILIATE_ID;
}

export function buildAffiliateUrl(fanzaUrl?: string): string {
  if (!fanzaUrl) return "#";
  if (!AFFILIATE_ID) return fanzaUrl;

  const encoded = encodeURIComponent(fanzaUrl);
  return `https://al.dmm.co.jp/?lurl=${encoded}&af_id=${encodeURIComponent(AFFILIATE_ID)}&ch=link_tool`;
}
