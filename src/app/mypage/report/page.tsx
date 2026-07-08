import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const dynamic = 'force-dynamic'

export default async function MonthlyReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  // 期間：今月（月初〜現在）と先月（先月初〜先月末）
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = thisMonthStart

  // 自分の作品と話を取得
  const { data: myNovels } = await supabase.from('novels').select('id').eq('author_id', user.id)
  const novelIds = (myNovels || []).map((n: any) => n.id)
  let epIds: string[] = []
  if (novelIds.length > 0) {
    const { data: eps } = await supabase.from('episodes').select('id').in('novel_id', novelIds)
    epIds = (eps || []).map((e: any) => e.id)
  }

  // 集計ヘルパー（count）
  async function countIn(table: string, filters: (q: any) => any, from: string, to?: string) {
    let q = supabase.from(table).select('*', { count: 'exact', head: true }).gte('created_at', from)
    if (to) q = q.lt('created_at', to)
    q = filters(q)
    const { count } = await q
    return count || 0
  }

  // ===== 作者としての活動（自分の作品への反応） =====
  async function authorStats(from: string, to?: string) {
    if (novelIds.length === 0) return { posts: 0, chars: 0, pv: 0, likes: 0, bookmarks: 0, comments: 0 }
    // 投稿話数と文字数
    let epQ = supabase.from('episodes').select('body').in('novel_id', novelIds).gte('created_at', from)
    if (to) epQ = epQ.lt('created_at', to)
    const { data: postedEps } = await epQ
    const posts = (postedEps || []).length
    const chars = (postedEps || []).reduce((s: number, e: any) => s + (e.body?.length || 0), 0)

    const [pv, likes, bookmarks, comments] = await Promise.all([
      epIds.length > 0 ? countIn('page_views', q => q.in('episode_id', epIds), from, to) : Promise.resolve(0),
      countIn('likes', q => q.in('novel_id', novelIds), from, to),
      countIn('bookmarks', q => q.in('novel_id', novelIds), from, to),
      countIn('comments', q => q.in('novel_id', novelIds).neq('user_id', user!.id), from, to),
    ])
    return { posts, chars, pv, likes, bookmarks, comments }
  }

  // ===== 読者としての活動 =====
  async function readerStats(from: string, to?: string) {
    const [reads, myLikes, myBookmarks, myComments, myDiscovers] = await Promise.all([
      countIn('read_episodes', q => q.eq('user_id', user!.id), from, to),
      countIn('likes', q => q.eq('user_id', user!.id), from, to),
      countIn('bookmarks', q => q.eq('user_id', user!.id), from, to),
      countIn('comments', q => q.eq('user_id', user!.id), from, to),
      countIn('discovers', q => q.eq('user_id', user!.id), from, to),
    ])
    return { reads, myLikes, myBookmarks, myComments, myDiscovers }
  }

  const [aThis, aLast, rThis, rLast] = await Promise.all([
    authorStats(thisMonthStart),
    authorStats(lastMonthStart, lastMonthEnd),
    readerStats(thisMonthStart),
    readerStats(lastMonthStart, lastMonthEnd),
  ])

  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`
  const isWriter = novelIds.length > 0

  // 増減バッジ
  const Diff = ({ now: n, last }: { now: number; last: number }) => {
    if (n === last) return null
    const up = n > last
    return (
      <span style={{ fontSize: 10.5, fontWeight: 700, color: up ? '#15803d' : 'var(--color-text-faint)', marginLeft: 6 }}>
        {up ? '↑' : '↓'} 先月{last.toLocaleString()}
      </span>
    )
  }

  const StatCard = ({ label, value, last, unit }: { label: string; value: number; last: number; unit?: string }) => (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{value.toLocaleString()}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 3 }}>{unit}</span>}
        <Diff now={value} last={last} />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header profile={profile} user={user} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{monthLabel}の振り返り</h1>
          <Link href="/mypage" style={{ fontSize: 13, color: 'var(--color-brand)', textDecoration: 'none' }}>← マイページ</Link>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.7 }}>
          今月の活動のまとめです。数字の大小より、続けていることがいちばんの財産です。
        </p>

        {/* 作者としての活動 */}
        {isWriter && (
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 3, height: 15, background: 'var(--color-brand)', borderRadius: 2, display: 'inline-block' }} />
              書き手として
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <StatCard label="投稿した話数" value={aThis.posts} last={aLast.posts} unit="話" />
              <StatCard label="書いた文字数" value={aThis.chars} last={aLast.chars} unit="文字" />
              <StatCard label="読まれたPV" value={aThis.pv} last={aLast.pv} unit="PV" />
              <StatCard label="もらったいいね" value={aThis.likes} last={aLast.likes} />
              <StatCard label="保存された数" value={aThis.bookmarks} last={aLast.bookmarks} />
              <StatCard label="もらったコメント" value={aThis.comments} last={aLast.comments} />
            </div>
          </div>
        )}

        {/* 読者としての活動 */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 15, background: 'var(--color-info)', borderRadius: 2, display: 'inline-block' }} />
            読み手として
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            <StatCard label="読了した話数" value={rThis.reads} last={rLast.reads} unit="話" />
            <StatCard label="送ったいいね" value={rThis.myLikes} last={rLast.myLikes} />
            <StatCard label="保存した作品" value={rThis.myBookmarks} last={rLast.myBookmarks} />
            <StatCard label="書いたコメント" value={rThis.myComments} last={rLast.myComments} />
            <StatCard label="発掘・拡散した数" value={rThis.myDiscovers} last={rLast.myDiscovers} />
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', lineHeight: 1.7 }}>
          ※ 集計は今月1日から現在まで。「↑↓ 先月」は先月1ヶ月間との比較です。
        </div>
      </div>
      <Footer user={user} />
    </div>
  )
}
