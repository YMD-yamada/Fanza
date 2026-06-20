# Claude Code migration notes

## CursorからClaude Codeへ引き継げるもの

- GitHubにpush済みのソースコード、履歴、Issue、Pull Request。
- `README.md`、`AGENTS.md`、`CLAUDE.md`、`CURSOR_HANDOFF.md`などのプロジェクト知識。
- Vercel側に保存されているプロジェクト設定、ドメイン、環境変数、デプロイ履歴。

## 再設定が必要なもの

- Claude Codeのログインとローカル環境。
- GitHub CLIまたはClaude GitHub Appの認証。
- Vercel CLIの認証とローカルプロジェクトリンク。
- Cursor固有のチャット履歴、個人設定、MCP設定。

## 推奨セットアップ

1. 各アプリの最新状態をGitHubへpushする。
2. Claude Codeで対象リポジトリを開く。
3. `/init`または手動編集で`CLAUDE.md`を整える。
4. GitHub連携を使う場合はClaude Codeで`/install-github-app`を実行する。
5. Vercel連携を使う場合は`vercel link`と`vercel env pull .env.local`を実行する。
6. `npm run lint`、`npx tsc --noEmit`、`npm run build`で確認する。
7. Previewは`vercel deploy`、本番は`vercel deploy --prod`を使う。

## このリポジトリでの注意

- 必須環境変数は`DMM_API_ID`と`DMM_AFFILIATE_ID`。
- `.env.local`はコミットしない。
- Vercel無料枠では`NEXT_PUBLIC_ENABLE_ACCOUNT_SYNC=0`のまま使うのが安全。
- FANZA API利用規約、年齢確認、免責、アフィリエイト表記を維持する。

## 3Dプリンタ用データ作成

CursorでもClaude Codeでも、3Dプリンタ用データ作成は可能です。ただし、AIエディタ自体がCAD/スライサーになるわけではなく、コード生成と外部ツール実行を組み合わせます。

おすすめの作り方:

- OpenSCAD: 寸法指定が明確な部品、治具、箱、ホルダー向け。
- CadQuery / build123d: Pythonで複雑なCAD形状を作る場合。
- Blender Python: フィギュア、装飾、曲面、メッシュ編集寄り。

基本フロー:

1. 欲しい形状、外寸、穴径、クリアランス、用途、プリンタ機種、ノズル径、素材を決める。
2. AIにOpenSCADやCadQueryコードを書かせる。
3. STLまたはSTEPへ書き出す。
4. メッシュがwatertight/manifoldか確認する。
5. Cura、PrusaSlicer、Bambu StudioなどでG-codeへ変換する。
6. 小さい部品や重要寸法から試し印刷する。

注意:

- G-codeはプリンタ機種、ノズル、素材、ベッドサイズ、温度、サポート設定に強く依存します。
- まずはSTL/STEPまでAIで作成し、スライサーで最終確認する運用が安全です。
- 実寸が必要な部品は、0.2mmから0.5mm程度のクリアランスを最初から考慮してください。
