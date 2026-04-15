"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useMemo, useState } from "react";

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

const quickKeywordGroups = [
  {
    label: "体型・バスト",
    keywords: ["巨乳", "美乳", "爆乳", "貧乳・微乳", "スレンダー", "ぽっちゃり", "長身", "ミニ系"],
  },
  {
    label: "タイプ",
    keywords: ["人妻", "熟女", "素人", "女子大生", "OL", "ギャル", "お姉さん", "ロリ系", "痴女", "女教師"],
  },
  {
    label: "プレイ・シチュエーション",
    keywords: ["中出し", "顔射", "ナンパ", "3P・4P", "潮吹き", "イラマチオ", "寝取り・寝取られ", "逆ナンパ", "露出"],
  },
  {
    label: "ジャンル・その他",
    keywords: ["企画", "コスプレ", "VR", "4K", "デビュー作品", "独占配信", "ハイビジョン", "アイドル・芸能人"],
  },
] as const;

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

function parseSelectedChips(q: string): Set<string> {
  const all = quickKeywordGroups.flatMap((g) => g.keywords);
  const set = new Set<string>();
  for (const kw of all) {
    if (q.includes(kw)) set.add(kw);
  }
  return set;
}

function buildQuery(selected: Set<string>, freeText: string): string {
  const chips = [...selected].join(" ");
  const free = freeText.trim();
  return [free, chips].filter(Boolean).join(" ");
}

export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";
  const [freeText, setFreeText] = useState(() => {
    const all = quickKeywordGroups.flatMap((g) => g.keywords);
    let text = initialQ;
    for (const kw of all) text = text.replaceAll(kw, "");
    return text.replace(/\s+/g, " ").trim();
  });
  const [selectedChips, setSelectedChips] = useState<Set<string>>(() => parseSelectedChips(initialQ));
  const [sort, setSort] = useState(sp.get("sort") ?? "rank");
  const [gteDate, setGteDate] = useState(sp.get("gte_date") ?? "");
  const [activeDateIdx, setActiveDateIdx] = useState(() => matchDatePreset(sp.get("gte_date") ?? ""));

  const currentQuery = useMemo(() => buildQuery(selectedChips, freeText), [selectedChips, freeText]);

  const navigate = useCallback(
    (overrides: { q?: string; sort?: string; gte?: string }) => {
      const q = (overrides.q ?? currentQuery).trim();
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
    [currentQuery, sort, gteDate, router],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate({});
  };

  const pickSort = (value: string) => {
    setSort(value);
    if (currentQuery.trim()) navigate({ sort: value });
  };

  const pickDate = (idx: number) => {
    const gte = resolveGte(datePresets[idx]);
    setGteDate(gte);
    setActiveDateIdx(idx);
    if (currentQuery.trim()) navigate({ gte });
  };

  const toggleChip = (kw: string) => {
    const next = new Set(selectedChips);
    if (next.has(kw)) {
      next.delete(kw);
    } else {
      next.add(kw);
    }
    setSelectedChips(next);
    const q = buildQuery(next, freeText);
    if (q.trim()) navigate({ q });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
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

      {/* quick keyword chips — grouped */}
      <div className="space-y-3">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500">クイック検索（複数選択可）</span>
        {quickKeywordGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <span className="text-[10px] text-neutral-600">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.keywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => toggleChip(kw)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedChips.has(kw)
                      ? "border-pink-500/60 bg-pink-500/20 text-pink-300"
                      : "border-neutral-700/60 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
