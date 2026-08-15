import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AffiliateButton } from "@/components/AffiliateButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FavoriteGenreChip, FavoriteTermLink } from "@/components/FavoriteTermLink";
import { RecordHistory } from "@/components/RecordHistory";
import { RelatedWorks } from "@/components/RelatedWorks";
import { SafeDetailImage, SafeSampleImage } from "@/components/SafeMedia";
import { VideoPreview } from "@/components/VideoPreview";
import { formatVolume } from "@/lib/browse";
import { getCatalog } from "@/lib/catalogs";
import { aggregateGetById, aggregateSearch } from "@/lib/search-aggregate";
import { isProviderSourceId } from "@/lib/search-providers";
import { itemJsonLd } from "@/lib/seo";
import type { NormalizedItem, SourceId } from "@/lib/types";

type ItemDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string; source?: string; returnTo?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ItemDetailProps): Promise<Metadata> {
  const { id } = await params;
  const detailParams = await searchParams;
  const catalog = getCatalog(detailParams.cat).id;
  const source = isProviderSourceId(detailParams.source) ? (detailParams.source as SourceId) : undefined;
  const item = await aggregateGetById({
    id,
    catalog,
    ...(source ? { source } : {}),
  });

  if (!item) {
    return {
      title: "作品情報",
      description: "作品情報を取得できませんでした。",
    };
  }

  const description =
    item.description?.slice(0, 120) ??
    `${item.title} の作品情報ページです。出演者・ジャンル・価格・サンプル情報を確認できます。`;
  const image = item.largeImageUrl ?? item.packageImageUrl ?? undefined;
  const queryParams = new URLSearchParams();
  if (catalog !== "video") queryParams.set("cat", catalog);
  if (source) queryParams.set("source", source);
  const path = `/items/${item.id}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return {
    title: item.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: item.title,
      description,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: item.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ItemDetailPage({ params, searchParams }: ItemDetailProps) {
  const { id } = await params;
  const detailParams = await searchParams;
  const catalog = getCatalog(detailParams.cat).id;
  const source = isProviderSourceId(detailParams.source) ? (detailParams.source as SourceId) : undefined;

  const item = await aggregateGetById({
    id,
    catalog,
    ...(source ? { source } : {}),
  });

  if (!item) {
    notFound();
  }

  const homeHref = catalog === "video" ? "/" : `/?cat=${catalog}`;
  const returnTo = detailParams.returnTo;
  const backHref = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : homeHref;
  const relatedLabel = item.actressNames[0] ?? item.genres[0] ?? "";
  let relatedItems: NormalizedItem[] = [];
  if (relatedLabel) {
    try {
      const related = await aggregateSearch({
        keyword: relatedLabel,
        page: 1,
        catalog,
        sort: "rank",
      });
      relatedItems = related.items.filter((entry) => entry.id !== item.id).slice(0, 8);
    } catch {
      relatedItems = [];
    }
  }

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            itemJsonLd({
              id: item.id,
              title: item.title,
              description: item.description,
              largeImageUrl: item.largeImageUrl,
              packageImageUrl: item.packageImageUrl,
              actressNames: item.actressNames,
              affiliateUrl: item.affiliateUrl,
              listPrice: item.listPrice,
              releaseDate: item.releaseDate,
              catalog: getCatalog(catalog),
            }),
          ),
        }}
      />
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white">
        ← 検索に戻る
      </Link>

      <section className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center md:justify-start">
          <SafeDetailImage
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
            catalog={catalog}
            source={item.source}
          />
          <div className="flex items-start gap-3">
            <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug md:text-2xl">{item.title}</h1>
            <FavoriteButton
              id={item.id}
              title={item.title}
              imageUrl={item.packageImageUrl}
              actressNames={item.actressNames}
              catalog={catalog}
              source={item.source}
              size="md"
            />
          </div>

          {item.description && <p className="text-sm leading-relaxed text-neutral-300">{item.description}</p>}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {item.actressNames.length > 0 && (
              <>
                <dt className="text-neutral-500">出演</dt>
                <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {item.actressNames.map((name) => (
                    <FavoriteTermLink key={name} kind="person" name={name} catalog={catalog} />
                  ))}
                </dd>
              </>
            )}
            {item.genres.length > 0 && (
              <>
                <dt className="text-neutral-500">ジャンル</dt>
                <dd className="flex flex-wrap gap-1">
                  {item.genres.map((g) => (
                    <FavoriteGenreChip key={g} name={g} catalog={catalog} />
                  ))}
                </dd>
              </>
            )}
            {item.makerNames && item.makerNames.length > 0 && (
              <>
                <dt className="text-neutral-500">メーカー</dt>
                <dd className="text-neutral-200">{item.makerNames.join(" / ")}</dd>
              </>
            )}
            {item.seriesNames && item.seriesNames.length > 0 && (
              <>
                <dt className="text-neutral-500">シリーズ</dt>
                <dd className="text-neutral-200">{item.seriesNames.join(" / ")}</dd>
              </>
            )}
            {formatVolume(item.volume) && (
              <>
                <dt className="text-neutral-500">収録時間</dt>
                <dd className="text-neutral-200">{formatVolume(item.volume)}</dd>
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
                  {item.reviewCount != null && <span className="text-neutral-500">({item.reviewCount}件)</span>}
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
          <VideoPreview url={item.sampleVideoUrl} />
        </section>
      )}

      {item.sampleImages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">サンプル画像</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {item.sampleImages.map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-video overflow-hidden rounded-lg border border-neutral-700">
                <SafeSampleImage
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

      <RelatedWorks items={relatedItems} catalog={catalog} label={relatedLabel || "関連"} />
    </div>
  );
}