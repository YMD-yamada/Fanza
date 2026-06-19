# Cursor から Claude Code への移行ガイド

このリポジトリ（Fanza Search Navigator / Next.js 16）を **Claude Code** で開発し続ける
ための引き継ぎメモです。Cursor から乗り換えても、コード・GitHub・Vercel はそのまま使えます。

> 要点: コードはツールに依存しません。Cursor も Claude Code も「フォルダを開いて編集を
> 手伝う」だけなので、ツールを変えてもアプリは失われません。失われるのは Cursor 固有の
> 設定だけです。

## 1. 何がそのまま引き継げるか

| 項目 | 引き継ぎ | 補足 |
| --- | --- | --- |
| アプリのコード | ✅ そのまま | ローカル/GitHub に保存済み |
| Git 履歴・ブランチ | ✅ そのまま | `.git` をそのまま使う |
| GitHub 連携 | ✅ そのまま | `git` のリモート設定を流用 |
| Vercel 連携 | ✅ そのまま | GitHub 経由なら設定変更不要 |
| AI ルール | ✅ 移行済み | Cursor の `.cursor/rules` → `CLAUDE.md` / `AGENTS.md` |
| Cursor 固有のUI設定 | ⚠️ 非対応 | Claude Code はエディタではないため概念が異なる |

このリポジトリには既に Claude Code が自動で読む `CLAUDE.md` を整備済みです（プロジェクト
概要・コマンド・規約・GitHub/Vercel 手順を記載）。

## 2. Claude Code のセットアップ

1. インストール（公式手順に従う。npm 例）

   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. プロジェクトを開いて起動

   ```bash
   cd /path/to/this/repo
   claude
   ```

3. 初回は Anthropic アカウントでログイン（画面の案内に従う）。

Claude Code はターミナル上で動く AI エージェントです。自然言語で指示すると、ファイル編集・
コマンド実行・git 操作までまとめて代行します。Cursor のような GUI でのファイル選択は不要で、
「○○を直して」「テストして」「PRを作って」と指示するだけです。

## 3. GitHub と連携する

このリポジトリは既に GitHub 上にあります。Claude Code は内部で `git` をそのまま使えるため、
追加設定なしで以下ができます。

- ブランチ作成・コミット・プッシュ（例:「変更をコミットしてプッシュして」）
- PR 作成（`gh` CLI を入れておくと便利。`gh auth login` で一度認証）

```bash
# 任意: GitHub CLI（PR 作成などが楽になる）
gh auth login
```

さらに自動化したい場合は **Claude Code GitHub Actions**（リポジトリに GitHub App を
インストールし、Issue/PR で `@claude` とメンションすると自動作業）も利用できます。

## 4. Vercel と連携する

方法は 2 つ。どちらでも OK です。

### 方法A: GitHub 経由（推奨・最も簡単）

1. Vercel ダッシュボードでこの GitHub リポジトリを Import。
2. プロジェクト設定の Environment Variables に `.env.example` と同じキーを設定
   （`DMM_API_ID` と `DMM_AFFILIATE_ID` は必須）。
3. 以降は Claude Code でコードを変更 → `git push` するだけで Vercel が自動デプロイ。

この方式なら Claude Code 側に特別な設定は不要です。

### 方法B: Vercel CLI / MCP

```bash
npm i -g vercel
vercel login
vercel        # プレビュー
vercel --prod # 本番
```

Claude Code に Vercel の MCP サーバーを登録すると、デプロイ状況やログ確認も AI に任せられます。

> 注意: 検索/詳細はサーバー側で DMM API を呼ぶため、**Edge ではなく Node ランタイム**で
> 動かしてください（`README.md` 参照）。

## 5. 日々の開発フロー（Claude Code）

```bash
npm install         # 初回のみ
npm run dev         # http://localhost:3000
npm run lint        # Lint
npx tsc --noEmit    # 型チェック
npm run build       # 本番ビルド
```

コミット前に `lint` / `tsc` / `build` を通すのが本リポジトリの標準ゲートです。

## 6. 自由に新規プロジェクトを作りたいとき

Cursor の「特定リポジトリを選ぶ」操作が不要なのが Claude Code の利点です。新しいアプリは
任意のフォルダで始められます。

```bash
mkdir my-new-app && cd my-new-app
git init
claude            # 「Next.js アプリを作って」などと指示
```

GitHub に上げたくなったら、`gh repo create` か GitHub で空リポジトリを作って
`git remote add origin <URL>` → `git push -u origin main` でOKです。Vercel 連携も
上記「方法A」と同じ手順で接続できます。

## 7. 移行時のクリーンアップ（このリポジトリで実施済み）

- 誤ってコミットされていた Cursor のデバッグログ（`.cursor/debug-*.log`、約4MB）を削除。
- `.gitignore` に `.cursor/` を追加し、今後は無視。
- `CLAUDE.md` をプロジェクトガイドとして拡充。
