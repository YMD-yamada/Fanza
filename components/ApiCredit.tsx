export function ApiCredit() {
  return (
    <section className="mx-auto w-full max-w-5xl border-t border-neutral-800 px-4 py-5 text-xs text-neutral-400">
      <p className="mb-2">このサイトは FANZA Webサービス API を利用しています。</p>
      <a href="https://affiliate.dmm.com/api/" target="_blank" rel="noopener noreferrer">
        {/* guideのクレジット表示HTMLをそのまま使用 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://p.dmm.co.jp/p/affiliate/web_service/r18_135_17.gif"
          width="135"
          height="17"
          alt="WEB SERVICE BY FANZA"
        />
      </a>
    </section>
  );
}
