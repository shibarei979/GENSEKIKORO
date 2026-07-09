import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AwardBoostManager from './AwardBoostManager'

export const dynamic = 'force-dynamic'

export default async function AwardBoostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  // 有効なブースト一覧（作品タイトル付き）
  const { data: boosts } = await admin
    .from('award_boosts')
    .select('id, novel_id, label, multiplier, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  const boostNovelIds = Array.from(new Set((boosts || []).map((b: any) => b.novel_id)))
  let titleMap: Record<string, string> = {}
  if (boostNovelIds.length > 0) {
    const { data: bn } = await admin.from('novels').select('id, title').in('id', boostNovelIds)
    bn?.forEach((n: any) => { titleMap[n.id] = n.title })
  }
  const boostList = (boosts || []).map((b: any) => ({ ...b, title: titleMap[b.novel_id] || '（削除された作品）' }))

  // 付与対象の候補（公開作品・直近200件）
  const { data: novels } = await admin
    .from('novels')
    .select('id, title, genre')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>受賞ブースト管理</h1>
          <a href="/admin" style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 14px', background: '#fff' }}>← 管理画面トップ</a>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.7 }}>
          コンテスト受賞作品などに期間限定のおすすめブーストを付与します。期限が切れると自動的に効果がなくなります。反映はおすすめの再計算時（最大3時間後）です。
        </p>
        <AwardBoostManager boosts={boostList} novels={novels || []} />
      </div>
    </div>
  )
}
