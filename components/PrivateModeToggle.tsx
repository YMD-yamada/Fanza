"use client";

import { setPrivateModeClient } from "@/lib/privateMode";
import { usePrivateModeEnabled } from "@/components/usePrivateMode";

export function PrivateModeToggle() {
  const enabled = usePrivateModeEnabled();

  const onToggle = () => {
    const next = !enabled;
    setPrivateModeClient(next);
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fixed bottom-4 right-4 z-50 rounded-full border px-4 py-2 text-xs font-semibold shadow-lg transition-colors md:bottom-6 md:right-6 ${
        enabled
          ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
          : "border-neutral-600 bg-neutral-900/90 text-neutral-100 hover:bg-neutral-800"
      }`}
      aria-label="プライベートモード切り替え"
    >
      {enabled ? "プライベートモード: ON" : "プライベートモード: OFF"}
    </button>
  );
}
