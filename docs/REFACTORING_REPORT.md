# リファクタリング報告書

> 対象: GENSEKIKORO（原石航路）
>
> 基準: Next.js_template（docs/01〜16 の開発規約）
>
> 目的: 保守性の向上・読み込み速度の改善
>
> 実施日: 2026-07-23

---

# 目次

1. 変更概要
2. ディレクトリ再構成
3. config層の新設
4. バグ修正
5. パフォーマンス改善
6. 開発ツール整備
7. 動作確認手順
8. 今後の課題（優先度順）

---

# 1. 変更概要

| 項目 | 内容 |
|------|------|
| 移動・リネーム | 96ファイル（app/ 内コンポーネント → components/、kebab-case化） |
| import書換 | 219箇所（すべて `@/` エイリアス形式へ統一、相対import 0件） |
| process.env置換 | 19箇所 → `src/config/` 経由へ一元化 |
| 画像圧縮 | public/ 合計 7.6MB → 218KB（97%削減） |
| 不要ファイル削除 | file-list.txt(1.3MB)・tsc_errors.txt・tsconfig.tsbuildinfo・MissionClient_old.tsx など7件 |
| 依存削除 | jspdf / xlsx（どこからもimportされていなかった） |

検証済み: 全367の内部importの解決チェック、tscによる構文チェック（エラー0件）。
※ この環境ではネットワーク制限により `npm install` / `next build` を実行できないため、
**マージ前に必ず「7. 動作確認手順」を実施してください。**

---

# 2. ディレクトリ再構成

テンプレート `02_Project_Structure.md` の「app/ にはルートファイルのみ」
「ファイルは kebab-case」ルールへ準拠させた。

## 移動ルール

```text
src/app/<機能>/<Component>.tsx
        ↓
src/components/<機能>/<component>.tsx
```

動的セグメント（[id] など）はディレクトリ名から除去。

## 主な移動例

| 旧 | 新 |
|----|----|
| app/ActionBanner.tsx ほかトップページ用9件 | components/home/action-banner.tsx など |
| app/mypage/MypageClient.tsx | components/mypage/mypage-client.tsx |
| app/post/PostClient.tsx | components/post/post-client.tsx |
| app/novel/[id]/episode/[epId]/EpisodeBody.tsx | components/novel/episode/episode-body.tsx |
| app/admin/contests/ContestManager.tsx | components/admin/contests/contest-manager.tsx |
| app/announcements/announcement-types.ts | types/announcement.ts |
| components/layout/Header.tsx | components/layout/header.tsx |
| hooks/useAuth.ts | hooks/use-auth.ts |
| lib/qualityScore.ts | lib/quality-score.ts |

コンポーネント名（PascalCase）は変更していないため、
呼び出し側のJSXはそのまま動作する。

---

# 3. config層の新設

テンプレートの禁止事項「process.env の直接利用」を解消した。

```text
src/config/
├── env.client.ts   # NEXT_PUBLIC_* 環境変数。唯一の process.env 参照点
├── env.server.ts   # SERVICE_ROLE_KEY / ANTHROPIC_API_KEY / CRON_SECRET
├── app.ts          # サイト名・説明・siteUrl
├── constants.ts    # 共有定数
└── index.ts        # Barrel（envは意図的に含めない）
```

- `env.server.ts` を Client Component から import しないこと
- 必須変数（Supabase URL / anon key）は未設定時に明確なエラーで停止
- 任意変数（service role 等）は未設定でもビルドが通る設計
- テンプレートboilerplateは zod でバリデーションしている。
  依存追加を避けるため純TS実装としたが、構成・export名は同一のため
  将来 zod 化する場合も利用側の変更は不要

## 挙動が変わった箇所（意図的な修正）

エピソードページのX共有リンクは従来 `NEXT_PUBLIC_SITE_URL` 未設定時に
空URL（壊れたリンク）だったが、`appConfig.siteUrl` の本番URLフォールバックにより
常に有効なURLを生成するようになった。

---

# 4. バグ修正

| 内容 | 詳細 |
|------|------|
| /auth/update-password が404 | `update_password_page.tsx` というファイル名のため ルートとして認識されていなかった → `page.tsx` へリネームし修復 |
| .gitignore が壊れていた | `src` `public` `package.json` など プロジェクト全体を無視する設定になっていた → 正常な内容へ全面書き換え。**リポジトリに未追跡のファイルがないか `git status` で必ず確認すること** |
| ESLint設定が存在しなかった | `.eslintrc.json`（next/core-web-vitals）を追加し `npm run lint` を実行可能にした |

---

# 5. パフォーマンス改善

## 5.1 画像（効果最大）

表示サイズを調査し、必要十分な解像度へ縮小・減色した。

| ファイル | 変更前 | 変更後 | 備考 |
|----------|--------|--------|------|
| logo.png | 596KB (1672px) | 12KB (426px) | 最大表示108px、2x対応で240px高 |
| reader.png → reader.webp | 2,822KB | 69KB | 最大表示620px高、2x対応 |
| writer.png → writer.webp | 2,377KB | 72KB | 同上 |
| og-image.png | 1,074KB | 49KB | OG推奨の1200px幅へ |
| author_icon.png | 572KB | 16KB | 512pxへ |
| **合計** | **7.6MB** | **218KB** | **97%削減** |

reader/writer は home-select ページのみ参照のためWebP化し参照を更新済み。
その他はファイル名・形式を維持（外部からの参照を壊さないため）。

## 5.2 初期読み込み

- `layout.tsx` にフォントの `preconnect` を追加（Google Fonts への接続を先行）
- AdSense スクリプトを `afterInteractive` → `lazyOnload` へ変更
  （初期表示への影響を排除。広告表示がわずかに遅れる点は許容判断）
- `metadataBase` + OGP設定を追加（SNS共有時のOG画像が正しく解決される）

## 5.3 バンドル

- `next.config.js` に `optimizePackageImports: ['recharts']` を追加
- 本番ビルドで `console.log` を自動除去（error / warn は残す）
- `xlsx-js-style`（約1MB級）を contest-manager の静的importから
  Excel出力実行時の動的importへ変更（既存の docx / mammoth と同じパターン）
- 未使用の `jspdf` / `xlsx` を依存から削除
- recharts を静的importしている admin-chart / admin-analytics は
  管理者専用ルートのためルート分割で隔離済み（一般ユーザーへの影響なし）

---

# 6. 開発ツール整備

| ファイル | 内容 |
|----------|------|
| .eslintrc.json | next/core-web-vitals |
| .prettierrc.json | テンプレートと同一設定 |
| .prettierignore / .editorconfig | テンプレートに準拠 |
| .nvmrc | 20（Next 14.2 で安定動作するLTS） |
| package.json | `typecheck` / `format` / `lint:fix` スクリプト追加、prettier追加、engines指定 |

※ husky / commitlint / vitest はローカルでのセットアップ確認が必要なため未導入。
「8. 今後の課題」を参照。

---

# 7. 動作確認手順

```bash
nvm use                 # Node 20
npm install             # 依存を更新（jspdf/xlsx削除・prettier追加のため必須）
npm run typecheck       # 型チェック（既存コード由来のany起因エラーが出る可能性あり）
npm run lint            # ESLint（初回実行のため既存コードへの指摘が出る想定）
npm run build           # 本番ビルドが通ることを確認
npm run dev             # 主要フローを手動確認
```

重点確認ポイント

- [ ] トップページ・作品ページ・エピソード閲覧
- [ ] /auth/update-password が表示される（今回修復したルート）
- [ ] マイページ・投稿画面（巨大コンポーネントの移動対象）
- [ ] 管理画面のExcel出力（動的import化した箇所）
- [ ] home-select のイラスト表示（WebP化した箇所）
- [ ] `git status` で .gitignore 修復後の未追跡ファイルを確認

---

# 8. 今後の課題（優先度順）

## 8.1 巨大コンポーネントの分割（保守性・最重要）

ビルド検証ができない環境で機械的に分割するのは危険なため未実施。
テンプレート `05_Component_Design.md` の「1ファイル1責務」に沿って分割を推奨。

| ファイル | 行数 | 分割方針 |
|----------|------|----------|
| components/mypage/mypage-client.tsx | 1,723 | タブ単位で分割。`TABS` 定義があるため 各タブの描画部を `mypage/tabs/<tab名>.tsx` へ切り出し、 タブ切替時に `next/dynamic` で遅延読み込みすると 初期JSも削減できる |
| components/post/post-client.tsx | 1,428 | エディタ本体・プレビュー・設定パネルの3責務で分割 |
| components/home/gem-section.tsx ほか20KB超の各種 | - | 表示ロジックとデータ整形を分離 |

分割時は「1ファイルずつ分割 → `npm run build` → 動作確認」を繰り返すこと。

## 8.2 型安全性の向上

`any` が483箇所。Supabaseの型生成で大半を解消できる:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

生成後、`createClient<Database>()` の形で適用する。

## 8.3 スタック更新

現在 Next 14.2 / React 18。テンプレートは Next 16 / React 19。
段階的に 14 → 15 → 16 と上げ、各段階でビルド・主要フロー確認を行うこと。
`@supabase/ssr ^0.4.0` も古いため合わせて更新を推奨（cookie APIの変更に注意）。

## 8.4 コード整形の一括適用

`.prettierrc.json` 追加済みだが既存コードへは未適用。
機能変更と混ざらないよう、**単独コミット**で `npm run format` を実行すること。

## 8.5 その他

- husky + lint-staged + commitlint の導入（テンプレート `03_Development_Workflow.md`）
- `<img>` → `next/image` への段階的移行（31ファイル。圧縮済みのため効果は限定的だが、 遅延読み込み・srcset対応のため推奨）
- vitest によるテスト導入（テンプレート `11_Testing.md`）
- 使っていないフォントweightの削減検討（現状は読書画面のフォント切替で全て使用中）
