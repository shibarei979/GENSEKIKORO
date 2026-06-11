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
├── app/
│   ├── auth/
│   │   ├── login/page.tsx       # ログイン画面
│   │   ├── register/page.tsx    # 新規登録画面（2ステップ）
│   │   └── callback/route.ts   # Google OAuthコールバック
│   ├── mypage/
│   │   ├── page.tsx             # マイページ（サーバーコンポーネント）
│   │   └── MypageClient.tsx    # マイページ（クライアント）
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # ホームページ
│   └── globals.css
├── lib/
│   └── supabase/
│       ├── client.ts           # ブラウザ用クライアント
│       ├── server.ts           # サーバー用クライアント
│       └── middleware.ts       # 認証ミドルウェア
├── hooks/
│   └── useAuth.ts              # 認証状態フック
└── types/
    └── index.ts                # 型定義
middleware.ts                   # Next.jsミドルウェア（認証ガード）
supabase/migrations/
└── 001_initial_schema.sql      # DBスキーマ（Supabaseで実行）
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
