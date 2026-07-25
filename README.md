# 原石航路 - Next.js + Supabase

## セットアップ手順

### 1. Supabaseプロジェクトを作成

1. [supabase.com](https://supabase.com) でアカウント作成
2. 「New Project」でプロジェクト作成
3. ダッシュボード → **SQL Editor** を開く
4. `supabase/migrations/001_initial_schema.sql` の内容を貼り付けて実行

### 2. Google OAuth を設定

1. [Google Cloud Console](https://console.cloud.google.com) でプロジェクト作成
2. 「APIとサービス」→「認証情報」→「OAuthクライアントID」作成
3. 承認済みリダイレクトURIに追加:
   ```
   https://xxxx.supabase.co/auth/v1/callback
   ```
4. Supabaseダッシュボード → Authentication → Providers → Google
   - Client ID と Client Secret を入力して有効化

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して実際の値を入力:
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseダッシュボードのProject URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ダッシュボードのanon/public key

### 4. 依存関係インストールと起動

```bash
npm install
npm run dev
```

http://localhost:3000 で確認

### 5. Vercelにデプロイ

```bash
npm install -g vercel
vercel
```

環境変数をVercelダッシュボードにも設定してください。

---

## ファイル構成

```
src/
├── app/                        # 画面・ルーティング（page / layout / route のみ）
│   ├── page.tsx                # ホームページ
│   ├── layout.tsx              # ルートレイアウト
│   ├── auth/                   # ログイン・登録・パスワード関連ルート
│   ├── mypage/                 # マイページ関連ルート
│   ├── novel/[id]/             # 作品・エピソード表示ルート
│   ├── admin/                  # 管理画面ルート
│   ├── api/                    # Route Handlers
│   └── globals.css
├── components/                 # UIコンポーネント（機能単位・kebab-case）
│   ├── layout/                 # header / footer / sidebar など共通レイアウト
│   ├── home/                   # トップページ用（hero-slider / gem-section など）
│   ├── mypage/                 # mypage-client / chapter-edit-modal など
│   ├── novel/                  # 作品ページ用（episode/ 配下に読書画面用）
│   ├── post/                   # 執筆画面用（post-client / plot-view など）
│   └── admin/                  # 管理画面用（各種 manager）
├── config/                     # 設定・環境変数の一元管理
│   ├── env.client.ts           # NEXT_PUBLIC_* 環境変数（唯一の process.env 参照点）
│   ├── env.server.ts           # サーバー専用環境変数
│   ├── app.ts                  # アプリ名・サイトURLなどの設定値
│   ├── constants.ts            # 共有定数
│   └── index.ts                # Barrel Export（envは含めない）
├── hooks/
│   └── use-auth.ts             # 認証状態フック
├── lib/
│   ├── supabase/               # client / server / admin / middleware
│   ├── recommend.ts            # おすすめアルゴリズム
│   ├── quality-score.ts
│   └── feature-flags.ts
└── types/
    ├── index.ts                # 共通型定義
    └── announcement.ts
middleware.ts                   # Next.jsミドルウェア（認証ガード）
supabase/migrations/
└── 001_initial_schema.sql      # DBスキーマ（Supabaseで実行）
```

### 構成ルール（テンプレート準拠）

- `app/` には `page.tsx` / `layout.tsx` / `route.ts` などのルートファイルのみを置く。UIは `components/` へ
- ファイル名は kebab-case、コンポーネント名は PascalCase
- import は `@/` エイリアスのみ使用（相対importは使わない）
- 環境変数は `process.env` を直接参照せず `@/config/env.client` / `@/config/env.server` 経由で利用する
- 詳細な変更内容と今後の課題は `docs/REFACTORING_REPORT.md` を参照

### 開発コマンド

```bash
npm run dev          # 開発サーバー
npm run build        # 本番ビルド
npm run lint         # ESLint
npm run typecheck    # TypeScript型チェック
npm run format       # Prettierで整形
```

## 認証フロー

### Googleログイン
1. ボタンクリック → `signInWithOAuth({ provider: 'google' })`
2. Googleの認証画面へリダイレクト
3. 認証後 `/auth/callback` へ戻る
4. `exchangeCodeForSession` でセッション確立
5. DBトリガーで `profiles` テーブルに自動追加

### メール登録
1. メール・パスワード入力 → バリデーション
2. 生年月日・同意確認
3. `supabase.auth.signUp({ email, password })` 実行
4. パスワードはSupabase Authが自動でbcryptハッシュ化
5. DBトリガーで `profiles` テーブルに自動追加

## セキュリティ

- パスワードはSupabase Authがbcryptで自動ハッシュ化（平文保存なし）
- Row Level Security (RLS) で各ユーザーは自分のデータのみ操作可
- `/mypage` `/post` はミドルウェアで未ログイン時にリダイレクト
- APIキーはanon keyのみ使用（service_roleキーはフロントに置かない）
