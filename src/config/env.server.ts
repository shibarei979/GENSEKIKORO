/**
 * ============================================================
 * 原石航路
 * Server Environment Configuration
 *
 * サーバー側のみで利用する環境変数を一元管理する。
 * Client Component から import してはいけない。
 * ============================================================
 */

import { clientEnv } from "@/config/env.client";

export const serverEnv = {
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,

    /** 管理系機能で利用。未設定でもビルドは通る（利用箇所でガードする） */
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

    /** AIレビュー・独自性チェックで利用（任意） */
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

    /** Vercel Cron の認証トークン（任意） */
    CRON_SECRET: process.env.CRON_SECRET,
} as const;

/**
 * Service Role Key を必須として取得する。
 * 管理者専用処理の入口で利用する。
 */
export function requireServiceRoleKey(): string {
    const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
        throw new Error(
            "❌ 環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。",
        );
    }
    return key;
}
