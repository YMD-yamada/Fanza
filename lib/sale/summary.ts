import type { ScanResult } from "@/lib/sale/scan";

/** 「動画 12本・アニメ 3本」の形。100件取得の上限に届いた所は「100本以上」 */
export function summarizeScan(scan: ScanResult): string {
  return scan.floors
    .filter((f) => f.items.length > 0)
    .map((f) => `${f.label} ${f.items.length >= 100 ? "100本以上" : `${f.items.length}本`}`)
    .join("・");
}
