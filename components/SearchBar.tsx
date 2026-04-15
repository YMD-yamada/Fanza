"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";

const sortOptions = [
  { value: "rank", label: "人気" },
  { value: "review", label: "高評価" },
  { value: "-date", label: "新着" },
  { value: "date", label: "古い順" },
  { value: "price", label: "安い順" },
  { value: "-price", label: "高い順" },
] as const;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const datePresets = [
  { label: "すべて", gte: "" },
  { label: "1週間", gte: () => daysAgo(7) },
  { label: "1ヶ月", gte: () => daysAgo(30) },
  { label: "3ヶ月", gte: () => daysAgo(90) },
  { label: "半年", gte: () => daysAgo(180) },
  { label: "1年", gte: () => daysAgo(365) },
] as const;

const quickKeywords = [
  "巨乳", "美乳", "スレンダー", "中出し",
  "人妻", "熟女", "素人", "女子大生",
  "OL", "ナンパ", "3P", "痴女",
  "コスプレ", "企画", "VR",
];

function resolveGte(preset: (typeof datePresets)[number]): string {
  if (preset.gte === "") return "";
  return typeof preset.gte === "function" ? preset.gte() : preset.gte;
}

function matchDatePreset(gteDate: string): number {
  if (!gteDate) return 0;
  const gte = gteDate.slice(0, 10);
  for (let i = 1; i < datePresets.length; i++) {
    if (resolveGte(datePresets[i]) === gte) return i;
  }
  return -1;
}

export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [keyword, setKeyword] = useState(sp.get("q") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "rank");
  const [gteDate, setGteDate] = useState(sp.get("gte_date") ?? "");
  const [activeDateIdx, setActiveDateIdx] = useState(() => matchDatePreset(sp.get("gte_date") ?? ""));

  const navigate = useCallback(
    (overrides: { q?: string; sort?: string; gte?: string }) => {
      const q = (overrides.q ?? keyword).trim();
      if (!q) return;
      const s = overrides.sort ?? sort;
      const g = overrides.gte ?? gteDate;
      const params = new URLSearchParams();
      params.set("q", q);
      params.set("sort", s);
      params.set("page", "1");
      if (g) params.set("gte_date", g.includes("T") ? g : `${g}T00:00:00`);
      router.push(`/?${params.toString()}`);
    },
    [keyword, sort, gteDate, router],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate({});
  };

  const pickSort = (value: string) => {
    setSort(value);
    if (keyword.trim()) navigate({ sort: value });
  };

  const pickDate = (idx: number) => {
    const gte = resolveGte(datePresets[idx]);
    setGteDate(gte);
    setActiveDateIdx(idx);
    if (keyword.trim()) navigate({ gte });
  };

  const pickKeyword = (kw: string) => {
    setKeyword(kw);
    navigate({ q: kw });
  };

  return (
    <div className="space-y-4">
      {/* search input */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="作品名・女優名で検索"
          className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 active:bg-sky-700"
        >
          検索
        </button>
      </form>

      {/* sort pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500">並び替え</span>
        <div className="flex flex-wrap gap-1.5">
          {sortOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pickSort(o.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sort === o.value
                  ? "bg-sky-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* date presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500">公開時期</span>
        <div className="flex flex-wrap gap-1.5">
          {datePresets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => pickDate(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeDateIdx === i
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* quick keyword chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500">クイック検索</span>
        <div className="flex flex-wrap gap-1.5">
          {quickKeywords.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => pickKeyword(kw)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                keyword === kw
                  ? "border-pink-500/50 bg-pink-500/15 text-pink-300"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
