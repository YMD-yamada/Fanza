import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";

import { AccountMenu } from "@/components/AccountMenu";
import { ApiCredit } from "@/components/ApiCredit";
import { AgeGate } from "@/components/AgeGate";
import { GrowthFooter } from "@/components/GrowthFooter";
import { PrivateModeToggle } from "@/components/PrivateModeToggle";
import { isSearchCrawlerUserAgent } from "@/lib/crawler";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | FANZA作品検索`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  other: {
    rating: "adult",
  },
  openGraph: {
    title: `${SITE_NAME} | FANZA作品検索`,
    description: DEFAULT_DESCRIPTION,
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const skipAgeGate = isSearchCrawlerUserAgent(headerList.get("user-agent"));

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 text-neutral-100">
        {!skipAgeGate && <AgeGate />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
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
              <Link href="/legal/notice" className="transition-colors hover:text-white">
                表記
              </Link>
              <AccountMenu />
            </nav>
          </div>
        </header>
        <div className="border-b border-red-700/30 bg-red-950/40 px-4 py-2 text-center text-xs text-red-200">
          R18: 18歳未満は利用できません。表示には広告を含みます。
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <ApiCredit />
        <GrowthFooter />
        <PrivateModeToggle />
      </body>
    </html>
  );
}
