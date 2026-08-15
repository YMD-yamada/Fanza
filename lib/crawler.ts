const CRAWLER_UA =
  /Googlebot|Google-InspectionTool|Bingbot|bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot|Applebot|Bytespider/i;

/** Age-gate overlay should not hide SSR content from search/social crawlers. */
export function isSearchCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA.test(userAgent);
}
