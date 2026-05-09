"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Copies the current search URL with light UTM tags for share analytics.
 */
export function ShareSearchLink() {
  const sp = useSearchParams();
  const [status, setStatus] = useState<"idle" | "copied" | "err">("idle");

  const onCopy = useCallback(async () => {
    try {
      const params = new URLSearchParams(sp.toString());
      if (!params.get("q")?.trim()) return;
      params.set("utm_source", "share");
      params.set("utm_medium", "copy");
      params.set("utm_campaign", "fanza-search-navigator");
      const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("err");
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  }, [sp]);

  if (!sp.get("q")?.trim()) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
      <button
        type="button"
        onClick={() => void onCopy()}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-neutral-200 transition-colors hover:border-sky-500/50 hover:text-white"
      >
        この検索のリンクをコピー（共有用）
      </button>
      {status === "copied" && <span className="text-emerald-400">コピーしました</span>}
      {status === "err" && <span className="text-amber-400">コピーできませんでした</span>}
    </div>
  );
}
