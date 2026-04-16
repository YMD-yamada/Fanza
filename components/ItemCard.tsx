import Link from "next/link";

import type { NormalizedItem } from "@/lib/types";
import { AffiliateButton } from "@/components/AffiliateButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { SafeThumbnail } from "@/components/SafeMedia";

type ItemCardProps = {
  item: NormalizedItem;
  returnTo?: string;
  privateMode?: boolean;
};

function StarRating({ avg, count }: { avg: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-yellow-400">{"★".repeat(Math.round(avg))}</span>
      <span className="tabular-nums font-medium text-yellow-300">{avg.toFixed(1)}</span>
      {count != null && (
        <span className="text-neutral-500">({count})</span>
      )}
    </span>
  );
}

export function ItemCard({ item, returnTo, privateMode = false }: ItemCardProps) {
  const detailPath = `/items/${encodeURIComponent(item.id)}`;
  const detailHref = returnTo
    ? {
        pathname: detailPath,
        query: { returnTo },
      }
    : detailPath;

  return (
    <article className="group grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 transition-colors hover:border-neutral-700 sm:gap-4 sm:p-4 md:grid-cols-[140px_1fr]">
      {/* thumbnail */}
      <Link
        href={detailHref}
        className="relative mx-auto h-44 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-700 sm:h-52 sm:w-36 md:mx-0"
      >
        <SafeThumbnail
          src={item.packageImageUrl}
          alt={item.title}
          privateMode={privateMode}
          fallbackText={privateMode ? "SAFE MODE" : "NO IMAGE"}
          fill
          sizes="(max-width: 640px) 128px, 140px"
          className="object-cover transition-transform group-hover:scale-105"
        />
      </Link>

      {/* info */}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-start gap-2">
          <Link
            href={detailHref}
            className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug hover:text-sky-400 sm:text-[15px]"
          >
            {item.title}
          </Link>
          <FavoriteButton
            id={item.id}
            title={item.title}
            imageUrl={item.packageImageUrl}
            actressNames={item.actressNames}
          />
        </div>

        {item.actressNames.length > 0 && (
          <p className="text-sm text-neutral-300">
            {item.actressNames.join("、")}
          </p>
        )}

        {item.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.genres.slice(0, 5).map((g) => (
              <span
                key={g}
                className="rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] text-neutral-400"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
          {item.releaseDate && <span>{item.releaseDate.slice(0, 10)}</span>}
          {item.listPrice && <span>{item.listPrice}</span>}
          {item.reviewAverage != null && (
            <StarRating avg={item.reviewAverage} count={item.reviewCount} />
          )}
        </div>

        {/* actions */}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1 sm:gap-2">
          <Link
            href={detailHref}
            className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-neutral-800 sm:px-3 sm:text-xs"
          >
            詳細
          </Link>
          {item.sampleVideoUrl && (
            <Link
              href={item.sampleVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neutral-700 px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-neutral-800 sm:px-3 sm:text-xs"
            >
              サンプル動画
            </Link>
          )}
          <AffiliateButton
            href={item.affiliateUrl}
            itemId={item.id}
            title={item.title}
            className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-pink-500"
          />
        </div>
      </div>
    </article>
  );
}
