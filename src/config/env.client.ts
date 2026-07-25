/**
 * ============================================================
 * 原石航路
 * Client Environment Configuration
 *
 * クライアント側で利用可能な環境変数（NEXT_PUBLIC_*）を
 * ここで一元管理する。
 * `process.env` の直接参照はこのファイル以外で禁止。
 * （テンプレート 02_Project_Structure / 禁止事項 準拠）
 * ============================================================
 */

function requireEnv(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`❌ 環境変数 ${name} が設定されていません。.env.local を確認してください。`);
    }
    return value;
}

export const clientEnv = {
    NEXT_PUBLIC_SUPABASE_URL: requireEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
        process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),

    NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),

    /** 未設定時は本番URLへフォールバック（従来挙動を踏襲） */
    NEXT_PUBLIC_SITE_URL:
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://gensekikoro.vercel.app",
} as const;
