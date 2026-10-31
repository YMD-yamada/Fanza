import Image from "next/image";

import { SaleNotifyPanel } from "@/components/sale/SaleNotifyPanel";
import { scanSales, type SaleItem } from "@/lib/sale/scan";
import { summarizeScan } from "@/lib/sale/summary";

export const revalidate = 1800;

function formatJst(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function ItemTile({ item }: { item: SaleItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-colors hover:border-amber-600"
    >
      <div className="relative aspect-[4/3] w-full bg-neutral-800">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
        ) : null}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-neutral-950">
          {item.price}円
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <p className="line-clamp-2 text-xs leading-snug text-neutral-200">{item.title}</p>
        <p className="mt-auto text-[11px] text-neutral-500">
          {item.listPrice && item.listPrice > item.price ? <s className="mr-1">{item.listPrice}円</s> : null}
          {item.campaignEnd ? `〜${formatJst(item.campaignEnd)}` : null}
        </p>
        <span className="text-[11px] text-pink-400">広告 · FANZAで見る</span>
      </div>
    </a>
  );
}

export default async function SalePage() {
  const scan = await scanSales();
  const active = scan.floors.filter((f) => f.items.length > 0);
  const summary = summarizeScan(scan);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sale/icon.svg" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl" />
        <div>
          <h1 className="text-xl font-bold">10円ベル</h1>
          <p className="text-sm text-neutral-400">FANZAで10円になった作品を見つけて、スマホに知らせます。</p>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-4 ${active.length > 0 ? "border-amber-500/60 bg-amber-500/10" : "border-neutral-800 bg-neutral-900"}`}
      >
        {active.length > 0 ? (
          <p className="text-base font-semibold text-amber-300">いま10円: {summary}</p>
        ) : (
          <p className="text-base font-semibold text-neutral-200">いまは10円の作品はありません</p>
        )}
        <p className="mt-1 text-xs text-neutral-500">最終確認 {formatJst(scan.scannedAt)}（1日4回ほど確認しています）</p>
      </section>

      <SaleNotifyPanel />

      {active.map((floor) => (
        <section key={floor.floorId} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-300">
            {floor.label}（{floor.items.length >= 100 ? "100本以上" : `${floor.items.length}本`}）
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {floor.items.slice(0, 40).map((item) => (
              <ItemTile key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-400">
        <h2 className="mb-1 text-sm font-semibold text-neutral-300">しくみ</h2>
        <p>
          1日4回、FANZAの作品一覧を安い順に確かめて、10円以下の作品を集めています（同人は「10円」キャンペーンの作品だけ）。
          価格は確かめた時点のものです。買う前にFANZAの表示を確認してください。
        </p>
      </section>
    </div>
  );
}
