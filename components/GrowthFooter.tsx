const DEFAULT_FEEDBACK = "https://github.com/YMD-yamada/Fanza/issues/new";

export function GrowthFooter() {
  const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() || DEFAULT_FEEDBACK;

  return (
    <footer className="mx-auto w-full max-w-5xl border-t border-neutral-800 px-4 py-6 text-center text-[11px] leading-relaxed text-neutral-500">
      <p className="mb-2">
        使いにくい点・ほしい機能は{" "}
        <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
          フィードバック
        </a>
        へ。気に入った検索条件は共有できます。
      </p>
      <p className="mb-2 text-neutral-600">
        本サイトはFANZA（DMM）公式アプリではなく、DMMアフィリエイト Webサービス API を利用した第三者製の検索ビューアです。
        18歳未満は利用できません。表示には広告を含みます。作品の販売者はFANZA／各権利者です。
      </p>
      <nav className="flex flex-wrap justify-center gap-3 text-neutral-400">
        <a href="/legal/terms" className="hover:text-white">
          利用規約
        </a>
        <a href="/legal/privacy" className="hover:text-white">
          プライバシー
        </a>
        <a href="/legal/notice" className="hover:text-white">
          表記
        </a>
      </nav>
    </footer>
  );
}
