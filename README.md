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
- `R18_PARTNER_API_BASE_URL`（互換1枠）
- `R18_HTTP_PROVIDER_1_*` … `_5_*`（追加の公式API／自前プロキシのベースURL）
- `R18_PARTNER_API_KEY` / `R18_HTTP_PROVIDER_N_API_KEY`（必要なら）
- `R18_PARTNER_API_KEY_HEADER` / `R18_HTTP_PROVIDER_N_API_KEY_HEADER`
- `R18_PARTNER_AFFILIATE_FALLBACK_URL` / `R18_HTTP_PROVIDER_N_AFFILIATE_FALLBACK_URL`
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

FANZA（DMM ItemList）は常に有効です。それ以外の **公式提供のHTTP JSON API** は、次のいずれかの方法で追加します（契約・許諾は利用者の責務です）。

| 変数グループ | 説明 |
| --- | --- |
| `R18_PARTNER_*` | 互換用スロット（プロバイダ id は固定で `partner`） |
| `R18_HTTP_PROVIDER_1_*` … `R18_HTTP_PROVIDER_5_*` | 追加スロット（`R18_HTTP_PROVIDER_N_ID` で slug、`R18_HTTP_PROVIDER_N_LABEL` で表示名） |

### 他社R18サービスのAPIを「探す」について

一般的に **他社の公開アダルト商品APIが一覧でまとまっている公式ページはほとんどありません**。多くの場合は **アフィリエイト／開発者向けポータルでの契約後** に、ドキュメントとベースURL・キーが提供されます。

- **FANZA / DMM（本アプリの既定）**: [DMM Affiliate Web Service](https://affiliate.dmm.com/api/)（ItemList 等）
- **その他サービスを使う場合**: 各社のアフィリエイト・パートナー・開発者窓口で **APIの有無と利用条件** を確認し、本アプリの **HTTPアダプター契約** に合わせてプロキシAPIを用意するか、公式が上記と同一のREST形ならそのまま `.env` のベースURLに指定してください。

### 調査メモ（国内・公開情報ベース／2026）

「どのサイトがあるか」を網羅する**公式の総覧ページ**はほぼありません。以下はリポジトリ用途（検索用データ取得）の観点で、**公式に Web API（または同等のウェブサービス）が説明されている例**と、**SOD**の整理です。

| 名前 | 分かること | 本アプリへの直結 |
| --- | --- | --- |
| **FANZA / DMM** | [DMM アフィリエイト Webサービス](https://affiliate.dmm.com/api/) — ItemList・女優検索・フロア一覧など多数 | **ネイティブ対応**（既存 `fanza` プロバイダ） |
| **DUGA（APEX）** | [ウェブサービス（Web API）公式](https://duga.jp/aff/api.html) — キーワード／カテゴリ等、JSON/XML、**クレジット表示義務**、レート制限（例: 60秒あたり60リクエスト/アプリID） | **形式が異なる**ため、自前の BFF／プロキシで `http-json-provider` 契約（`/search`, `/items/{id}`）に正規化する必要あり |
| **SOKMIL** | アフィリエイト向けに API が言及されることがある。最新仕様は **[ソクミルアフィリエイト](https://sokmil-ad.com/)** 登録後の案内を優先 | 多くの場合エンドポイント・パラメータが本アプリの汎用契約と**一致しない** → BFF 推奨 |
| **SOD（ソフト・オン・デマンド）** | コーポレート: [事業内容等](https://corporate.sod.co.jp/)。アフィリエイトは **楽天アフィリエイト等のASP経由**で「SODプライム」等の案件が取り扱われる例が多く、**DMM の ItemList のような開発者向け REST の公式ドキュメントは公開情報からは確認できない**（リンク・バナー中心の提携が主）。商品データを API で扱えるかは **ASP／SOD 側のパートナー窓口への問い合わせ**が必要 | 直指定の `BASE_URL` は**不可**。取得できるならプロキシ経由で当アダプター形式に変換 |

**DLsite（同人）** はアフィリエイト登録はあるが、**一般向けに「検索用の公式 REST API」が掲載されているわけではない**ことが多く、コミュニティ製クライアントは**規約と整合**を必ず確認してください。

要するに、**FANZA以外で「公式データAPIが存在する」例はDUGAのように限定的**で、かつ**本リポの `R18_HTTP_PROVIDER_*` にそのままベースURLを入れられるのは、パスとJSONが完全に一致する場合のみ**です。多くは **1 本の小さなプロキシ（Vercel Functions 等）** でベンダー API → 当アダプター形式への変換を挟みます。

### HTTPアダプター契約（サーバーが期待する形）

追加プロバイダのベースURL（末尾スラッシュなし）を設定すると、次を呼び出します。

- 検索: `GET {base}/search?q=...&page=...&sort=...`（任意 `cat`, `gte_date`, `lte_date`）
- 詳細: `GET {base}/items/{id}`
- 認証: キーがあれば `R18_HTTP_PROVIDER_N_API_KEY` と `..._API_KEY_HEADER`（既定 `x-api-key`）

JSON の各フィールドは `lib/search-providers/http-json-provider.ts` の `RemoteItem` 形へマップされ、`NormalizedItem` としてUIに出ます。

`MULTI_SEARCH_MODE=auto` の場合:

- 通常は統合リスト表示
- 一部provider失敗・遅延時は提供元別表示へフォールバック

統合結果では、タイトル（正規化） + 発売日が一致する別プロバイダの行は **マージ優先度（小さいほど強い）** で1件にまとめます（FANZA は 0）。`R18_*_MERGE_PRIORITY` で調整できます（`lib/search-merge.ts`）。

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
