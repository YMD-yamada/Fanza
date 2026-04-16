import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Fanza Search Navigator",
  description: "Fanza API powered search app with affiliate links.",
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
        <PrivateModeToggle />
      </body>
    </html>
  );
}
