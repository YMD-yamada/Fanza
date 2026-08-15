import type { Metadata } from "next";

import { type CatalogSpec, getCatalog } from "@/lib/catalogs";

export const SITE_NAME = "Fanza Search Navigator";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanza-nine.vercel.app").replace(
  /\/$/,
  "",
);

export const DEFAULT_DESCRIPTION =
  "FANZA作品を広告表示つきで検索・比較できるR18ナビ（18歳未満利用不可）。人気・新着から探せ、出演・価格を並べて公式購入ページへ進めます。";

export function siteUrl(): string {
  return SITE_URL;
}

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function searchPath(params: { q?: string; cat?: string }): string {
  const query = new URLSearchParams();
  const q = params.q?.trim();
  if (q) query.set("q", q);
  const catalog = getCatalog(params.cat);
  if (catalog.id !== "video") query.set("cat", catalog.id);
  const encoded = query.toString();
  return encoded ? `/?${encoded}` : "/";
}

export function homeMetadata(params: { q?: string; cat?: string; view?: string }): Metadata {
  const catalog = getCatalog(params.cat);
  const q = params.q?.trim() ?? "";
  const view = params.view === "new" ? "new" : params.view === "rank" ? "rank" : "";
  const path = searchPath({ q, cat: params.cat });
  const title = q
    ? `「${q}」の検索結果（${catalog.shortLabel}）`
    : view === "new"
      ? `${catalog.shortLabel}の新着 | ${SITE_NAME}`
      : view === "rank"
        ? `${catalog.shortLabel}の人気作品 | ${SITE_NAME}`
        : catalog.id === "video"
          ? `${SITE_NAME} | FANZA作品検索`
          : `${catalog.label}を検索 | ${SITE_NAME}`;
  const description = q
    ? `「${q}」の${catalog.label}検索結果（R18）。FANZA公式購入ページへの案内を含みます。`
    : view === "new"
      ? `${catalog.label}の新着作品（R18）。出演・価格を比較できます。`
      : view === "rank"
        ? `${catalog.label}の人気作品（R18）。出演・価格を比較できます。`
        : catalog.id === "video"
          ? DEFAULT_DESCRIPTION
          : `${catalog.label}の作品を検索・比較できるR18検索ナビ（18歳未満利用不可）。`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "ja",
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function itemJsonLd(item: {
  id: string;
  title: string;
  description?: string;
  largeImageUrl?: string;
  packageImageUrl?: string;
  actressNames: string[];
  affiliateUrl: string;
  listPrice?: string;
  releaseDate?: string;
  catalog: CatalogSpec;
}) {
  const image = item.largeImageUrl ?? item.packageImageUrl;
  const price = item.listPrice?.replace(/[^\d.]/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description:
      item.description?.slice(0, 180) ||
      `${item.title}（${item.catalog.label}・R18）。出演・価格などの作品情報。`,
    ...(image ? { image } : {}),
    ...(item.actressNames.length > 0 ? { brand: item.actressNames[0] } : {}),
    ...(item.releaseDate ? { releaseDate: item.releaseDate.slice(0, 10) } : {}),
    url: absoluteUrl(`/items/${item.id}`),
    offers: {
      "@type": "Offer",
      url: item.affiliateUrl,
      availability: "https://schema.org/InStock",
      ...(price ? { price, priceCurrency: "JPY" } : {}),
    },
  };
}
