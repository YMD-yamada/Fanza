"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const sortOptions = [
  { value: "rank", label: "人気順" },
  { value: "-date", label: "新着順" },
  { value: "price", label: "価格が安い順" },
  { value: "-price", label: "価格が高い順" },
];

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "rank");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    params.set("sort", sort);
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:grid-cols-[1fr_200px_auto]">
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
    </form>
  );
}
