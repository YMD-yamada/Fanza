# 公開の流れ

本アプリは **R18 Web のみ** で公開する。App Store / Google Play / Microsoft Store には出さない。理由は `docs/STORE_AND_LEGAL.md`。

## 本番

1. `master` 向け PR の CI（`lint-and-build`）が成功していることを確認する。
2. PR を `master` にマージする。
3. Vercel が production をデプロイする。公開 URL は https://fanza-nine.vercel.app 。

PR の Preview URL で年齢確認・表記・ログイン・人気/新着を確認してからマージする。

## 出さないもの

- 公式ストアへの申請・審査提出
- 販売者としての氏名住所の創作掲載
- 未成年を想起させる宣伝語のクイック検索追加

## 任意

ブラウザの「ホーム画面に追加」（PWA）はストア審査を経ないので使ってよい。
