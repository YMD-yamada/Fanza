"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "fanza_age_gate_ok_v1";

export function AgeGate() {
  const pathname = usePathname();
  const [resolved, setResolved] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "1") {
        setAllowed(true);
      }
    } finally {
      setResolved(true);
    }
  }, []);

  const confirmAdult = () => {
    if (!agreed) return;
    window.localStorage.setItem(STORAGE_KEY, "1");
    setAllowed(true);
  };

  const denyAdult = () => {
    window.location.href = "https://www.google.com/";
  };

  if (pathname.startsWith("/legal/")) return null;
  if (!resolved || allowed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-neutral-100 shadow-xl">
        <h2 className="text-lg font-semibold">年齢確認（18+）</h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          このサイトは成人向け情報（R18）を含みます。18歳未満の方は利用できません。
          本サイトは作品の販売・配信は行わず、FANZA公式ページへの案内（広告を含む）を提供します。
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-neutral-200">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-1"
          />
          <span>
            私は18歳以上であり、
            <Link href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">
              利用規約
            </Link>
            ・
            <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">
              プライバシー
            </Link>
            に同意します。
          </span>
        </label>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={!agreed}
            onClick={confirmAdult}
            className="flex-1 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            入場する
          </button>
          <button
            type="button"
            onClick={denyAdult}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900"
          >
            18歳未満
          </button>
        </div>
      </section>
    </div>
  );
}
