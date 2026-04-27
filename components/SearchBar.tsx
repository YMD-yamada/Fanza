"use client";

import { getCatalog } from "@/lib/catalogs";
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

const pricePresets = [
  { label: "すべて", min: "", max: "" },
  { label: "?500円", min: "", max: "500" },
  { label: "?1000円", min: "", max: "1000" },
  { label: "?2000円", min: "", max: "2000" },
  { label: "?3000円", min: "", max: "3000" },
  { label: "3000円?", min: "3000", max: "" },
] as const;

const videoQuickKeywordGroups = [
  { label: "体型・バスト", keywords: ["巨乳", "美乳", "爆乳", "貧乳・微乳", "スレンダー", "ぽっちゃり", "長身", "ミニ系"] },
  { label: "タイプ", keywords: ["人妻", "熟女", "素人", "女子大生", "OL", "ギャル", "お姉さん", "ロリ系", "痴女", "女教師"] },
  { label: "プレイ・シチュエーション", keywords: ["中出し", "顔射", "ナンパ", "3P・4P", "潮吹き", "イラマチオ", "寝取り・寝取られ", "逆ナンパ", "露出"] },
  { label: "ジャンル・その他", keywords: ["企画", "コスプレ", "VR", "4K", "デビュー作品", "独占配信", "ハイビジョン", "アイドル・芸能人"] },
] as const;

const doujinQuickKeywordGroups = [
  { label: "形式・媒体", keywords: ["同人誌", "同人ゲーム", "CG集", "ボイス", "ASMR", "マンガ"] },
  { label: "ジャンル", keywords: ["RPG", "SLG", "アクション", "ADV", "シミュレーション", "育成", "乙女向け"] },
  { label: "テーマ", keywords: ["ファンタジー", "学園", "寝取り", "制服", "触手", "オリジナル", "フルカラー"] },
] as const;

const gameQuickKeywordGroups = [
  { label: "ジャンル", keywords: ["RPG", "SLG", "アクション", "ADV", "FPS", "TCG", "格闘"] },
  { label: "プレイ", keywords: ["ターン制", "リアルタイム", "Roguelike", "恋愛シミュ", "育成シム"] },
  { label: "テーマ", keywords: ["学園", "異世界", "同人", "フルボイス", "体験版あり"] },
] as const;

function resolveGte(preset: (typeof datePresets)[number]): string {
  const g = preset.gte;
  if (g === "") return "";
  return typeof g === "function" ? g() : g;
}

function matchDatePreset(gteDate: string): number {
  if (!gteDate) return 0;
  const gte = gteDate.slice(0, 10);
  for (let i = 1; i < datePresets.length; i++) {
    if (resolveGte(datePresets[i]) === gte) return i;
  }
  return -1;
}

function matchPricePreset(pMin: string, pMax: string): number {
  return pricePresets.findIndex((p) => p.min === pMin && p.max === pMax);
}

function parseSelectedChips(q: string, groups: readonly { keywords: readonly string[] }[]): Set<string> {
  const all = groups.flatMap((g) => g.keywords);
  const set = new Set<string>();
  for (const kw of all) if (q.includes(kw)) set.add(kw);
  return set;
}

function buildQuery(selected: Set<string>, freeText: string): string {
  const chips = [...selected].join(" ");
  const free = freeText.trim();
  return [free, chips].filter(Boolean).join(" ");
}

function PillRow({ label, options, activeIdx, color = "sky", onPick }: {
  label: string;
  options: readonly { label: string }[];
  activeIdx: number;
  color?: "sky" | "violet" | "emerald" | "amber";
  onPick: (idx: number) => void;
}) {
  const colors: Record<string, string> = {
    sky: "bg-sky-600 text-white",
    violet: "bg-violet-600 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-600 text-white",
  };
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium tracking-wide text-neutral-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o, i) => (
          <button key={o.label} type="button" onClick={() => onPick(i)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeIdx === i ? colors[color] : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const catKey = sp.get("cat") ?? "";
  const catalogSpec = useMemo(() => getCatalog(catKey || null), [catKey]);

  const quickKeywordGroups = catalogSpec.id === "doujin"
    ? doujinQuickKeywordGroups
    : catalogSpec.id === "game"
      ? gameQuickKeywordGroups
      : videoQuickKeywordGroups;

  const initialQ = sp.get("q") ?? "";

  const [freeText, setFreeText] = useState(() => {
    const all = quickKeywordGroups.flatMap((g) => g.keywords);
    let text = initialQ;
    for (const kw of all) text = text.replaceAll(kw, "");
    return text.replace(/\s+/g, " ").trim();
  });
  const [selectedChips, setSelectedChips] = useState(() => parseSelectedChips(initialQ, quickKeywordGroups));
  const [sort, setSort] = useState(sp.get("sort") ?? "rank");
  const [gteDate, setGteDate] = useState(sp.get("gte_date") ?? "");
  const [activeDateIdx, setActiveDateIdx] = useState(() => matchDatePreset(sp.get("gte_date") ?? ""));
  const [priceMin, setPriceMin] = useState(sp.get("price_min") ?? "");
  const [priceMax, setPriceMax] = useState(sp.get("price_max") ?? "");
  const [activePriceIdx, setActivePriceIdx] = useState(() => Math.max(0, matchPricePreset(sp.get("price_min") ?? "", sp.get("price_max") ?? "")));
  const [hasVideo, setHasVideo] = useState(sp.get("has_video") === "1");

  const currentQuery = useMemo(() => buildQuery(selectedChips, freeText), [selectedChips, freeText]);

  const placeholder = catalogSpec.id === "doujin"
    ? "タイトル・サークル名などで検索"
    : catalogSpec.id === "game"
      ? "タイトル・メーカー名などで検索"
      : "作品名・女優名で検索";

  const navigate = useCallback((overrides: { q?: string; sort?: string; gte?: string; pMin?: string; pMax?: string; video?: boolean; }) => {
    const q = (overrides.q ?? currentQuery).trim();
    if (!q) {
      router.push(catalogSpec.id === "video" ? "/" : `/?cat=${catalogSpec.id}`);
      return;
    }
    const s = overrides.sort ?? sort;
    const g = overrides.gte ?? gteDate;
    const pmn = overrides.pMin ?? priceMin;
    const pmx = overrides.pMax ?? priceMax;
    const hv = overrides.video ?? hasVideo;

    const params = new URLSearchParams();
    params.set("cat", catalogSpec.id);
    params.set("q", q);
    params.set("sort", s);
    if (g) params.set("gte_date", g.includes("T") ? g : `${g}T00:00:00`);
    if (pmn) params.set("price_min", pmn);
    if (pmx) params.set("price_max", pmx);
    if (hv) params.set("has_video", "1");
    router.push(`/?${params.toString()}`);
  }, [catalogSpec.id, currentQuery, sort, gteDate, priceMin, priceMax, hasVideo, router]);

  const onSubmit = (event: FormEvent) => { event.preventDefault(); navigate({}); };
  const pickSort = (idx: number) => { const value = sortOptions[idx].value; setSort(value); if (currentQuery.trim()) navigate({ sort: value }); };
  const pickDate = (idx: number) => { const gte = resolveGte(datePresets[idx]); setGteDate(gte); setActiveDateIdx(idx); if (currentQuery.trim()) navigate({ gte }); };
  const pickPrice = (idx: number) => { const p = pricePresets[idx]; setPriceMin(p.min); setPriceMax(p.max); setActivePriceIdx(idx); if (currentQuery.trim()) navigate({ pMin: p.min, pMax: p.max }); };
  const toggleVideo = () => { const next = !hasVideo; setHasVideo(next); if (currentQuery.trim()) navigate({ video: next }); };

  const toggleChip = (kw: string) => {
    const next = new Set(selectedChips);
    if (next.has(kw)) next.delete(kw); else next.add(kw);
    setSelectedChips(next);
    navigate({ q: buildQuery(next, freeText) });
  };

  const sortIdx = sortOptions.findIndex((o) => o.value === sort);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30" />
        <button type="submit" className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 active:bg-sky-700 sm:w-auto">検索</button>
      </form>

      <PillRow label="並び替え" options={sortOptions} activeIdx={sortIdx} color="sky" onPick={pickSort} />
      <PillRow label="公開時期" options={datePresets} activeIdx={activeDateIdx} color="violet" onPick={pickDate} />
      <PillRow label="価格帯" options={pricePresets} activeIdx={activePriceIdx} color="emerald" onPick={pickPrice} />

      {catalogSpec.supportsSampleVideo && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium tracking-wide text-neutral-500">サンプル動画</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { if (hasVideo) toggleVideo(); }} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!hasVideo ? "bg-amber-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"}`}>すべて</button>
            <button type="button" onClick={() => { if (!hasVideo) toggleVideo(); }} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${hasVideo ? "bg-amber-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"}`}>動画ありのみ</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500">クイック検索（複数選択可）</span>
        {quickKeywordGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <span className="text-[10px] text-neutral-600">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.keywords.map((kw) => (
                <button key={kw} type="button" onClick={() => toggleChip(kw)} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${selectedChips.has(kw) ? "border-pink-500/60 bg-pink-500/20 text-pink-300" : "border-neutral-700/60 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"}`}>{kw}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}