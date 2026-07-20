import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const dynamic = 'force-dynamic'

const PERIOD_LABEL: Record<string, string> = {
  daily: '日間', weekly: '週間', monthly: '月間', quarterly: '四半期', yearly: '年間', all: '累計', rising: '注目度',
}

// ランキング履歴：自作品のランクイン記録「○時から○時 ○位（総合・日間）」
export default async function RankingHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  const prevSeen = profile?.last_seen_ranking_at || new Date(0).toISOString()

  const { data: history } = await supabase
    .from('ranking_history')
    .select('id, novel_id, period, rank, from_time, to_time, created_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // 作品タイトル
  const novelIds = Array.from(new Set((history || []).map((h: any) => h.novel_id)))
  const titleMap: Record<string, string> = {}
  if (novelIds.length > 0) {
    const { data: novels } = await supabase.from('novels').select('id, title').in('id', novelIds)
    novels?.forEach((n: any) => { titleMap[n.id] = n.title })
  }

  // 既読時刻を更新
  await supabase.from('profiles').update({ last_seen_ranking_at: new Date().toISOString() }).eq('user_id', user.id)

  const fmtRange = (from: string, to: string) => {
    const f = new Date(from), t = new Date(to)
    const sameDay = f.toDateString() === t.toDateString()
    const day = `${f.getMonth() + 1}/${f.getDate()}`
    return `${day} ${f.getHours()}時から${sameDay ? '' : `${t.getMonth() + 1}/${t.getDate()} `}${t.getHours()}時`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header profile={profile} user={user} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>ランキング履歴</h1>
          <Link href="/mypage" style={{ fontSize: 13, color: 'var(--color-brand)', textDecoration: 'none' }}>← マイページ</Link>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 18 }}>あなたの作品がランキングに入った記録です（上位20位まで・3時間ごとの集計単位）。</p>

        {(!history || history.length === 0) ? (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '48px 20px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-faint)', lineHeight: 1.8 }}>
            まだランクインの記録がありません。<br/>作品がランキング上位に入るとここに残ります。
          </div>
        ) : (
          history.map((h: any) => {
            const isNew = h.created_at > prevSeen
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-bg-card)', border: `1px solid ${isNew ? 'var(--color-brand)' : 'var(--color-brand-border)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 9 }}>
                <div style={{ flexShrink: 0, width: 52, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: h.rank <= 3 ? 'var(--color-brand)' : 'var(--color-text)', lineHeight: 1 }}>{h.rank}<span style={{ fontSize: 11, fontWeight: 600 }}>位</span></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    {isNew && <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 8px', borderRadius: 10 }}>NEW</span>}
                    <Link href={`/novel/${h.novel_id}`} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none' }}>
                      {titleMap[h.novel_id] || '（削除された作品）'}
                    </Link>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {fmtRange(h.from_time, h.to_time)}　{h.rank}位（総合・{PERIOD_LABEL[h.period] || h.period}）
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      <Footer user={user} />
    </div>
  )
}
