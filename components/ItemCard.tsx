import Image from "next/image";
import Link from "next/link";

import type { NormalizedItem } from "@/lib/types";
import { AffiliateButton } from "@/components/AffiliateButton";

type ItemCardProps = {
  item: NormalizedItem;
};

export function ItemCard({ item }: ItemCardProps) {
  return (
    <article className="grid gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:grid-cols-[160px_1fr]">
      <div className="relative h-56 w-40 overflow-hidden rounded-lg border border-neutral-700">
        {item.packageImageUrl ? (
          <Image
            src={item.packageImageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-neutral-800 text-xs text-neutral-400">
            NO IMAGE
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="line-clamp-2 text-base font-semibold md:text-lg">{item.title}</h2>
        <p className="text-sm text-neutral-300">
          {item.actressNames.length > 0 ? item.actressNames.join(" / ") : "女優情報なし"}
        </p>
        <p className="text-sm text-neutral-400">
          {item.genres.length > 0 ? item.genres.slice(0, 4).join(" / ") : "ジャンル情報なし"}
        </p>
        <div className="text-sm text-neutral-300">
          <span>発売日: {item.releaseDate ?? "不明"}</span>
          <span className="ml-4">価格: {item.listPrice ?? "不明"}</span>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Link
            href={`/items/${encodeURIComponent(item.id)}`}
            className="inline-flex rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            詳細を見る
          </Link>
          {item.sampleVideoUrl && (
            <Link
              href={item.sampleVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
            >
              サンプル動画
            </Link>
          )}
          <AffiliateButton href={item.affiliateUrl} itemId={item.id} title={item.title} />
        </div>
      </div>
    </article>
  );
}
