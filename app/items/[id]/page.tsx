import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AffiliateButton } from "@/components/AffiliateButton";
import { VideoPreview } from "@/components/VideoPreview";
import { getFanzaItemById } from "@/lib/fanza";

type ItemDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemDetailPage({ params }: ItemDetailProps) {
  const { id } = await params;
  const item = await getFanzaItemById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
      >
        ← 検索に戻る
      </Link>

      <section className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 md:grid-cols-[240px_1fr]">
        <div className="relative mx-auto h-80 w-56 overflow-hidden rounded-xl border border-neutral-700 md:mx-0 md:h-[340px] md:w-full">
          {item.largeImageUrl || item.packageImageUrl ? (
            <Image
              src={item.largeImageUrl ?? item.packageImageUrl ?? ""}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 224px, 240px"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-800 text-neutral-500">
              NO IMAGE
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h1 className="text-xl font-bold leading-snug md:text-2xl">{item.title}</h1>

          {item.description && (
            <p className="text-sm leading-relaxed text-neutral-300">{item.description}</p>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {item.actressNames.length > 0 && (
              <>
                <dt className="text-neutral-500">出演</dt>
                <dd className="text-neutral-200">{item.actressNames.join("、")}</dd>
              </>
            )}
            {item.genres.length > 0 && (
              <>
                <dt className="text-neutral-500">ジャンル</dt>
                <dd className="flex flex-wrap gap-1">
                  {item.genres.map((g) => (
                    <span key={g} className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300">
                      {g}
                    </span>
                  ))}
                </dd>
              </>
            )}
            {item.releaseDate && (
              <>
                <dt className="text-neutral-500">発売日</dt>
                <dd className="text-neutral-200">{item.releaseDate.slice(0, 10)}</dd>
              </>
            )}
            {item.listPrice && (
              <>
                <dt className="text-neutral-500">価格</dt>
                <dd className="text-neutral-200">{item.listPrice}</dd>
              </>
            )}
            {item.reviewAverage != null && (
              <>
                <dt className="text-neutral-500">評価</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="text-yellow-400">{"★".repeat(Math.round(item.reviewAverage))}</span>
                  <span className="tabular-nums font-medium text-yellow-300">{item.reviewAverage.toFixed(1)}</span>
                  {item.reviewCount != null && (
                    <span className="text-neutral-500">({item.reviewCount}件)</span>
                  )}
                </dd>
              </>
            )}
          </dl>

          <AffiliateButton href={item.affiliateUrl} itemId={item.id} title={item.title} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">サンプル動画</h2>
        <VideoPreview url={item.sampleVideoUrl} />
      </section>

      {item.sampleImages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">サンプル画像</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {item.sampleImages.map((url, index) => (
              <div key={`${url}-${index}`} className="relative h-40 overflow-hidden rounded-lg border border-neutral-700">
                <Image
                  src={url}
                  alt={`${item.title} sample ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
