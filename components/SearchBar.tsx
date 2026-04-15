"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const sortOptions = [
  { value: "rank", label: "人気順" },
  { value: "review", label: "レビュー評価順" },
  { value: "match", label: "マッチング順" },
  { value: "-date", label: "新着順" },
  { value: "date", label: "古い順" },
  { value: "price", label: "価格が安い順" },
  { value: "-price", label: "価格が高い順" },
];

const articleOptions = [
  { value: "", label: "指定なし" },
  { value: "actress", label: "女優" },
  { value: "genre", label: "ジャンル" },
  { value: "maker", label: "メーカー" },
  { value: "series", label: "シリーズ" },
  { value: "label", label: "レーベル" },
  { value: "author", label: "監督・作者" },
];

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "rank");
  const [gteDate, setGteDate] = useState((searchParams.get("gte_date") ?? "").slice(0, 10));
  const [lteDate, setLteDate] = useState((searchParams.get("lte_date") ?? "").slice(0, 10));
  const [article, setArticle] = useState(searchParams.get("article") ?? "");
  const [articleId, setArticleId] = useState(searchParams.get("article_id") ?? "");
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(searchParams.get("gte_date") || searchParams.get("lte_date") || searchParams.get("article")),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    params.set("sort", sort);
    params.set("page", "1");
    if (gteDate) params.set("gte_date", gteDate + "T00:00:00");
    if (lteDate) params.set("lte_date", lteDate + "T23:59:59");
    if (article && articleId.trim()) {
      params.set("article", article);
      params.set("article_id", articleId.trim());
    }
    router.push(`/?${params.toString()}`);
  };

  const onReset = () => {
    setGteDate("");
    setLteDate("");
    setArticle("");
    setArticleId("");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="作品名・女優名・キーワードで検索"
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          検索
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
      >
        <span className={`inline-block transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
        詳細検索オプション
      </button>

      {showAdvanced && (
        <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-neutral-400">発売日（以降）</span>
              <input
                type="date"
                value={gteDate}
                onChange={(event) => setGteDate(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-neutral-400">発売日（以前）</span>
              <input
                type="date"
                value={lteDate}
                onChange={(event) => setLteDate(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-neutral-400">絞り込みタイプ</span>
              <select
                value={article}
                onChange={(event) => setArticle(event.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              >
                {articleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-neutral-400">
                {article ? `${articleOptions.find((o) => o.value === article)?.label ?? ""}のID` : "絞り込みID"}
              </span>
              <input
                value={articleId}
                onChange={(event) => setArticleId(event.target.value)}
                disabled={!article}
                placeholder={article ? "例: 1000001" : "タイプを先に選択"}
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-40"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            詳細条件をリセット
          </button>
        </div>
      )}
    </form>
  );
}
