import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ApiCredit } from "@/components/ApiCredit";
import { AgeGate } from "@/components/AgeGate";
import { PrivateModeToggle } from "@/components/PrivateModeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fanza-nine.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Fanza Search Navigator | FANZA作品検索",
    template: "%s | Fanza Search Navigator",
  },
  description:
    "FANZA Webサービス APIを利用した成人向け作品検索サイト。カテゴリ別検索、詳細情報確認、アフィリエイト購入リンクへ遷移できます。",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Fanza Search Navigator | FANZA作品検索",
    description:
      "FANZA作品をカテゴリ別に検索できるR18対応の検索サイト。作品情報の比較と公式購入ページへの導線を提供。",
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "Fanza Search Navigator",
  },
  twitter: {
    card: "summary",
    title: "Fanza Search Navigator",
    description: "FANZA作品をカテゴリ別に検索できるR18対応の検索サイト。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 text-neutral-100">
        <AgeGate />
        <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-sm font-bold tracking-tight sm:text-base">
              Fanza Search
            </Link>
            <nav className="flex items-center gap-3 text-[11px] text-neutral-400 sm:gap-4 sm:text-xs">
              <Link href="/legal/terms" className="transition-colors hover:text-white">
                利用規約
              </Link>
              <Link href="/legal/privacy" className="transition-colors hover:text-white">
                プライバシー
              </Link>
            </nav>
          </div>
        </header>
        <div className="border-b border-red-700/30 bg-red-950/40 px-4 py-2 text-center text-xs text-red-200">
          R18: 18歳未満は利用できません。
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <ApiCredit />
        <PrivateModeToggle />
      </body>
    </html>
  );
}
