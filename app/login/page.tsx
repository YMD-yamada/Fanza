import type { Metadata } from "next";
import { AuthPanel } from "@/components/AuthPanel";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ログイン",
  description: "お気に入り同期用の任意ログイン。FANZA公式会員ログインとは別です。検索はログインなしで使えます。",
  robots: { index: false, follow: false },
  alternates: { canonical: `${siteUrl()}/login` },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <AuthPanel />
    </main>
  );
}
