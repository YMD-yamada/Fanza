"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function ShareSearchLink() {
  const sp = useSearchParams();
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "err">("idle");

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams(sp.toString());
    if (!params.get("q")?.trim() && !params.get("view")?.trim()) return null;
    params.set("utm_source", "share");
    params.set("utm_medium", "copy");
    params.set("utm_campaign", "fanza-search-navigator");
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [sp]);

  const onShare = useCallback(async () => {
    const url = buildUrl();
    if (!url) return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Fanza Search Navigator",
          url,
        });
        setStatus("shared");
        window.setTimeout(() => setStatus("idle"), 2000);
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("err");
        window.setTimeout(() => setStatus("idle"), 2500);
      }
    }
  }, [buildUrl]);

  if (!sp.get("q")?.trim() && !sp.get("view")?.trim()) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
      <button
        type="button"
        onClick={() => void onShare()}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-neutral-200 transition-colors hover:border-sky-500/50 hover:text-white"
      >
        この一覧を共有
      </button>
      {status === "copied" && <span className="text-emerald-400">コピーしました</span>}
      {status === "shared" && <span className="text-emerald-400">共有しました</span>}
      {status === "err" && <span className="text-amber-400">共有できませんでした</span>}
    </div>
  );
}
