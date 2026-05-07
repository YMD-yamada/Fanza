## Fanza Search Navigator

Fanza APIを使って作品検索・閲覧・購入導線をまとめたWebアプリです。
検索一覧から画像/サンプル動画/アフィリエイト購入リンクへ素早くアクセスできます。

## セットアップ

1. 依存パッケージのインストール

```bash
npm install
```

2. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成し、値を入力してください。

```bash
cp .env.example .env.local
```

必須:
- `DMM_API_ID`
- `DMM_AFFILIATE_ID`

任意（複数API統合検索）:
- `R18_PARTNER_API_BASE_URL`
- `R18_PARTNER_API_KEY`
- `R18_PARTNER_API_KEY_HEADER`
- `R18_PARTNER_AFFILIATE_FALLBACK_URL`
- `MULTI_SEARCH_MODE` (`auto` / `unified` / `source_tabs`)
- `PROVIDER_TIMEOUT_MS`
- `MULTI_FALLBACK_SLOW_MS`

**GitHub 公開時:** `.env.local` は秘密を含むためリポジトリに含めません（`.gitignore` で除外）。`git add -f .env.local` のような強制追加はしないでください。テンプレは `.env.example` のみコミットします。

3. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 主な機能

- キーワード検索、並び替え、ページング
- 複数プロバイダ統合検索（FANZA + 任意のR18パートナーAPI）
- 一覧カードで作品情報と購入導線を表示
- 詳細ページでパッケージ画像・サンプル動画・サンプル画像を表示
- 購入リンクにアフィリエイトIDを自動付与
- クリック計測用のAPIエンドポイントを提供

## 複数API統合検索

`R18_PARTNER_API_BASE_URL` を設定すると、FANZAに加えて第2プロバイダを統合検索します。

- 検索: `GET {base}/search?q=...&page=...&sort=...`
- 詳細: `GET {base}/items/{id}`
- 返却項目は本アプリの `NormalizedItem` に正規化可能な形式が必要です

`MULTI_SEARCH_MODE=auto` の場合:
- 通常は統合リスト表示
- 一部provider失敗・遅延時は提供元別表示へフォールバック

## 公開時の注意

- API利用規約およびアフィリエイト規約を確認してください
- 年齢制限や免責を明示するページを公開してください
- 本番では計測基盤（GA4/Plausible等）への接続を推奨します
- 複数API導入時は、各APIごとに以下を必ず確認してください:
  - 商用利用可否
  - アフィリエイト表記義務
  - 画像・サムネイル利用条件
  - キャッシュ可否と保存期間

## 本番デプロイ（準備済みの選択肢）

### 環境変数（本番）

`.env.example` と同じキーをホスティング側の「環境変数」に設定してください。`DMM_API_ID` と `DMM_AFFILIATE_ID` は必須です。

`NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC` は既定で `0`（無効）です。**無料で軽く運用する推奨設定はこのまま**です。この場合、お気に入りは端末ローカル保存のみで、同期 API は使いません。

任意アカウント・お気に入り同期を使う場合のみ `NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC=1` にし、データ保存先として **サーバー上の JSON ファイル**（既定ではプロジェクト直下の `.data/users.json`）を永続化してください。パスを変えたい場合は `FANZA_APP_DATA_DIR` を設定してください（相対パスはプロジェクトルートからの相対、推奨は絶対パス）。

### Docker（VPS など）

`next.config.ts` で `output: "standalone"` を有効にしているため、コンテナ向けの本番ビルドが可能です。

```bash
docker build -t fanza-web .
docker run -d --name fanza-web -p 3000:3000 \
  --env-file .env.production \
  -v fanza-app-data:/data \
  fanza-web
```

イメージ内では `FANZA_APP_DATA_DIR=/data` を既定にしており、`-v` でマウントしたボリュームにお気に入り同期データが残ります。同期を使う場合は `--env NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC=1` も設定してください。

### Vercel などのサーバーレス

検索・詳細はサーバー側で DMM API を呼び出します。**Edge ではなく Node のサーバーレス**で動かしてください。

このリポジトリは **デフォルトで同期 OFF（`NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC=0`）** にしてあり、Vercel 無料枠でも安全に軽く運用できます。

ファイル保存型のログイン／同期を ON にする場合、**インスタンス間でディスクが共有されない**とデータが分散したり消えたりします。サーバーレスだけで運用する場合は DB（Supabase など）移行を推奨します。HTTPS 上ではセッション Cookie が `Secure` になります（`NODE_ENV=production`）。

### GitHub Actions

`master` / `main` への push とそれら向けの PR で `npm run lint` と `npm run build`（ダミーの API 環境変数付き）が走ります。
