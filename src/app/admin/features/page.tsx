import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import FeatureFlagsManager from './FeatureFlagsManager'

export const dynamic = 'force-dynamic'

// 管理対象の機能一覧（新機能を追加したらここに登録）
const MANAGED_FEATURES = [
  { key: 'projects', label: 'お題企画', desc: 'ユーザー主催のテーマ企画（一覧・作成・参加）' },
  // 今後の新機能はここに追加していく
]

export default async function AdminFeaturesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  // 現在のフラグ状態を取得
  const { data: flags } = await admin.from('feature_flags').select('key, status')
  const flagMap: Record<string, string> = {}
  flags?.forEach((f: any) => { flagMap[f.key] = f.status })

  const features = MANAGED_FEATURES.map(f => ({
    ...f,
    status: (flagMap[f.key] || 'off') as 'off' | 'preview' | 'on',
  }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--admin-bg, #f8fafc)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>機能の公開管理</h1>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.7 }}>
          新機能は「プレビュー」でまず自分だけ確認し、問題なければ「公開」に切り替えます。「オフ」にすると誰にも表示されません。
        </p>
        <FeatureFlagsManager features={features} />
      </div>
    </div>
  )
}
