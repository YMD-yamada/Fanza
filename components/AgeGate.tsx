"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fanza_age_gate_ok_v1";

export function AgeGate() {
  const [resolved, setResolved] = useState(false);
  const [allowed, setAllowed] = useState(false);

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
    window.localStorage.setItem(STORAGE_KEY, "1");
    setAllowed(true);
  };

  const denyAdult = () => {
    window.location.href = "https://www.google.com/";
  };

  if (!resolved || allowed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-neutral-100 shadow-xl">
        <h2 className="text-lg font-semibold">年齢確認（18+）</h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          このサイトは成人向け情報（R18）を含みます。18歳未満の方は利用できません。
          18歳以上であることを確認してから閲覧してください。
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={confirmAdult}
            className="flex-1 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pink-500"
          >
            18歳以上です
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
