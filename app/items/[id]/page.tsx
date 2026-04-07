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
      <Link href="/" className="text-sm text-sky-400 hover:text-sky-300">
        ← 検索に戻る
      </Link>

      <section className="grid gap-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4 md:grid-cols-[260px_1fr]">
        <div className="relative h-96 w-full overflow-hidden rounded-xl border border-neutral-700 md:h-[360px]">
          {item.largeImageUrl || item.packageImageUrl ? (
            <Image
              src={item.largeImageUrl ?? item.packageImageUrl ?? ""}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 260px"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-800 text-neutral-400">
              NO IMAGE
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h1 className="text-xl font-bold md:text-2xl">{item.title}</h1>
          <p className="text-sm text-neutral-300">{item.description ?? "説明文はありません。"}</p>
          <div className="grid gap-2 text-sm text-neutral-300">
            <p>女優: {item.actressNames.join(" / ") || "不明"}</p>
            <p>ジャンル: {item.genres.join(" / ") || "不明"}</p>
            <p>発売日: {item.releaseDate ?? "不明"}</p>
            <p>価格: {item.listPrice ?? "不明"}</p>
          </div>
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
