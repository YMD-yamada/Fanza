import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "表記",
  description: "本サイトは通信販売の売主ではありません。販売・配信はFANZAおよび各権利者です。",
};

const FEEDBACK = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() || "https://github.com/YMD-yamada/Fanza/issues/new";

export default function NoticePage() {
  return (
    <div className="space-y-4 text-sm leading-7 text-neutral-200">
      <h1 className="text-2xl font-bold">表記</h1>
      <p>
        本サイトは通信販売の売主ではありません。作品の販売者・配信者は FANZA（DMM.com）および各権利者です。
        代金の支払方法、返品、デジタルコンテンツの利用条件は、遷移先の公式販売ページをご確認ください。
      </p>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3">
        <dt className="text-neutral-500">サービス名</dt>
        <dd>Fanza Search Navigator（第三者製の検索ビューア）</dd>
        <dt className="text-neutral-500">販売者</dt>
        <dd>本サイトでは販売しません。販売・配信は FANZA／各権利者です。</dd>
        <dt className="text-neutral-500">広告</dt>
        <dd>FANZA公式ページへのリンクは広告（アフィリエイト）を含みます。</dd>
        <dt className="text-neutral-500">対象年齢</dt>
        <dd>18歳以上。18歳未満は利用できません。</dd>
        <dt className="text-neutral-500">お問い合わせ</dt>
        <dd>
          <a href={FEEDBACK} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
            GitHub Issues / フィードバック
          </a>
        </dd>
      </dl>
      <p className="text-xs text-neutral-500">
        個人の氏名・住所・電話番号は、販売を行わない情報提供サイトであるため本ページには掲載しません。
        取引に関する連絡は販売者である FANZA 側へ行ってください。
      </p>
    </div>
  );
}
