/**
 * Homepage copy encoded as ASCII + Unicode escapes so UTF-8 corruption in tooling
 * (cloud sync/editors on Windows, etc.) cannot mangle literals.
 */

export const HOME_HEADING_TITLE = `Fanza \u691c\u7d22\u30ca\u30d3`;
export const HOME_HEADING_DESCRIPTION =
  "FANZA\u4f5c\u54c1\u3092\u4eba\u6c17\u30fb\u65b0\u7740\u304b\u3089\u63a2\u3057\u3001\u51fa\u6f14\u30fb\u4fa1\u683c\u30921\u753b\u9762\u3067\u6bd4\u8f03\u3067\u304d\u307e\u3059\u3002R18\uff0818\u6b73\u672a\u6e80\u5229\u7528\u4e0d\u53ef\uff09\u3002\u8868\u793a\u306b\u306f\u5e83\u544a\u3092\u542b\u307f\u307e\u3059\u3002";

export const HOME_EMPTY_PROMPT =
  "\u691c\u7d22\u3057\u306a\u304f\u3066\u3082\u4eba\u6c17\u30fb\u65b0\u7740\u304b\u3089\u63a2\u305b\u307e\u3059\u3002\u30ad\u30fc\u30ef\u30fc\u30c9\u3084\u4e0a\u306e\u30af\u30a4\u30c3\u30af\u9078\u629e\u3067\u7d5e\u308a\u8fbc\u3080\u3053\u3068\u3082\u3067\u304d\u307e\u3059\u3002";

export const HOME_NO_RESULTS_MESSAGE =
  "\u6761\u4ef6\u306b\u4e00\u81f4\u3059\u308b\u4f5c\u54c1\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002";

/** Shown under HOME_NO_RESULTS_MESSAGE (client-side filters may zero out hits). */
export const HOME_NO_RESULTS_HINT =
  "\u65e5\u4ed8\u30fb\u4fa1\u683c\u5e2f\u30fb\u300c\u52d5\u753b\u3042\u308a\u306e\u307f\u300d\u3092\u7de9\u3081\u308b\u3001\u3042\u308b\u3044\u306f\u30ad\u30fc\u30ef\u30fc\u30c9\u3092\u77ed\u304f\u3059\u308b\u3068\u30d2\u30c3\u30c8\u3057\u3084\u3059\u304f\u306a\u308a\u307e\u3059\u3002";

export function badgeReleaseDateJa(isoSliceYmd10: string) {
  return `${isoSliceYmd10}\u4ee5\u964d`;
}

export function badgePriceRangeJa(priceMinYen: number, priceMaxYen: number) {
  if (priceMinYen > 0 && priceMaxYen > 0) {
    return `${priceMinYen}\u301c${priceMaxYen}\u5186`;
  }
  if (priceMaxYen > 0) return `\u301c${priceMaxYen}\u5186`;
  return `${priceMinYen}\u5186\u301c`;
}

export const BADGE_HAS_SAMPLE_VIDEO_LABEL = "\u30b5\u30f3\u30d7\u30eb\u52d5\u753b\u3042\u308a";
