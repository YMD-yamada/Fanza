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
    <div className="flex justify-center pb-24 pt-2 sm:pt-12">
      <AuthPanel />
    </div>
  );
}
