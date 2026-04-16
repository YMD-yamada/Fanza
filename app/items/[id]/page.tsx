import Link from "next/link";
import { notFound } from "next/navigation";

import { AffiliateButton } from "@/components/AffiliateButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RecordHistory } from "@/components/RecordHistory";
import { VideoPreview } from "@/components/VideoPreview";
import { SafeDetailImage, SafeSampleImage } from "@/components/SafeMedia";
import { getFanzaItemById } from "@/lib/fanza";
import { getPrivateModeFromCookie } from "@/lib/privateMode";

type ItemDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function ItemDetailPage({ params, searchParams }: ItemDetailProps) {
  const { id } = await params;
  const detailParams = await searchParams;
  const privateMode = await getPrivateModeFromCookie();
  const returnTo = detailParams.returnTo;
  const backHref =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const item = await getFanzaItemById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
      >
        ← 検索に戻る
      </Link>

      <section className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 md:grid-cols-[auto_1fr]">
        {/* package image — contain, not cover, so nothing is cropped */}
        <div className="flex justify-center md:justify-start">
          <SafeDetailImage
            privateMode={privateMode}
            imageUrl={item.largeImageUrl ?? item.packageImageUrl}
            alt={item.title}
            className="h-auto max-h-[480px] w-auto rounded-xl border border-neutral-700 object-contain"
          />
        </div>

        <div className="space-y-4">
          <RecordHistory
            id={item.id}
            title={item.title}
            imageUrl={item.packageImageUrl}
            actressNames={item.actressNames}
          />
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug md:text-2xl">{item.title}</h1>
            <FavoriteButton
              id={item.id}
              title={item.title}
              imageUrl={item.packageImageUrl}
              actressNames={item.actressNames}
              size="md"
            />
          </div>

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

      {item.sampleVideoUrl && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">サンプル動画</h2>
          <VideoPreview url={item.sampleVideoUrl} privateMode={privateMode} />
        </section>
      )}

      {item.sampleImages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">サンプル画像</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {item.sampleImages.map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-video overflow-hidden rounded-lg border border-neutral-700">
                <SafeSampleImage
                  privateMode={privateMode}
                  imageUrl={url}
                  alt={`${item.title} sample ${index + 1}`}
                  fill
                  className="object-contain bg-neutral-900"
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
