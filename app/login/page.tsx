import type { Metadata } from "next";
import { AuthPanel } from "@/components/AuthPanel";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ログイン",
  description: "お気に入りを端末間で同期するための任意ログイン。検索はログインなしで使えます。",
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
