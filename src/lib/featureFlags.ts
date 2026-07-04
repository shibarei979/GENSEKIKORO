// フィーチャーフラグの取得・判定ユーティリティ
// status: 'off'（非表示） | 'preview'（アドミンのみ） | 'on'（全体公開）

import { createClient } from '@/lib/supabase/server'

export type FlagStatus = 'off' | 'preview' | 'on'

export interface FeatureFlag {
  key: string
  label: string
  status: FlagStatus
}

// 全フラグを取得
export async function getFeatureFlags(): Promise<Record<string, FlagStatus>> {
  const supabase = await createClient()
  const { data } = await supabase.from('feature_flags').select('key, status')
  const map: Record<string, FlagStatus> = {}
  data?.forEach((f: any) => { map[f.key] = f.status as FlagStatus })
  return map
}

// ある機能が今のユーザーに表示されるべきか判定
// isAdmin: 管理者かどうか
export function isFeatureVisible(status: FlagStatus | undefined, isAdmin: boolean): boolean {
  if (!status || status === 'off') return false
  if (status === 'on') return true
  if (status === 'preview') return isAdmin  // プレビューはアドミンのみ
  return false
}

// 単一フラグを判定つきで取得するヘルパー
export async function checkFeature(key: string, isAdmin: boolean): Promise<boolean> {
  const flags = await getFeatureFlags()
  return isFeatureVisible(flags[key], isAdmin)
}
