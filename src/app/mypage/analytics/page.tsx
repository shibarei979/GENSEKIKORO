import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AnalyticsCharts from './AnalyticsCharts'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  const { data: novels } = await supabase
    .from('novels')
    .select('id, title, genre, published, created_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const novelIds = (novels || []).map((n: any) => n.id)

  const statsMap: Record<string, any> = {}
  let allEpisodes: any[] = []

  if (novelIds.length > 0) {
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, novel_id, title, ep_number, body, published, created_at')
      .in('novel_id', novelIds)
      .order('ep_number', { ascending: true })
    allEpisodes = episodes || []

    const epIds = allEpisodes.map((e: any) => e.id)
    const epToNovel: Record<string, string> = {}
    allEpisodes.forEach((e: any) => { epToNovel[e.id] = e.novel_id })

    const [{ data: pageViews }, { data: likes }, { data: bookmarks }, { data: comments }] = await Promise.all([
      epIds.length > 0 ? supabase.from('page_views').select('episode_id, created_at').in('episode_id', epIds) : Promise.resolve({ data: [] }),
      supabase.from('likes').select('novel_id').in('novel_id', novelIds),
      supabase.from('bookmarks').select('novel_id').in('novel_id', novelIds),
      supabase.from('comments').select('novel_id').in('novel_id', novelIds),
    ])

    novelIds.forEach((id: string) => {
      statsMap[id] = {
        views: 0, likes: 0, bookmarks: 0, comments: 0,
        viewsToday: 0, viewsWeek: 0, viewsMonth: 0,
        episodeViews: {},
        episodeLikes: {},
        dailyViews: {},
      }
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000
    const monthStart = todayStart - 29 * 24 * 60 * 60 * 1000

    ;(pageViews || []).forEach((pv: any) => {
      const nId = epToNovel[pv.episode_id]
      if (!nId || !statsMap[nId]) return
      statsMap[nId].views++
      statsMap[nId].episodeViews[pv.episode_id] = (statsMap[nId].episodeViews[pv.episode_id] || 0) + 1
      const t = new Date(pv.created_at).getTime()
      if (t >= todayStart) statsMap[nId].viewsToday++
      if (t >= weekStart) statsMap[nId].viewsWeek++
      if (t >= monthStart) statsMap[nId].viewsMonth++
      const day = (pv.created_at || '').slice(0, 10)
      if (day) statsMap[nId].dailyViews[day] = (statsMap[nId].dailyViews[day] || 0) + 1
    })

    ;(likes || []).forEach((l: any) => { if (statsMap[l.novel_id]) statsMap[l.novel_id].likes++ })
    ;(bookmarks || []).forEach((b: any) => { if (statsMap[b.novel_id]) statsMap[b.novel_id].bookmarks++ })
    ;(comments || []).forEach((c: any) => { if (statsMap[c.novel_id]) statsMap[c.novel_id].comments++ })

    // 話別いいね（episode_likes）
    if (epIds.length > 0) {
      const { data: epLikes } = await supabase.from('episode_likes').select('episode_id').in('episode_id', epIds)
      ;(epLikes || []).forEach((el: any) => {
        const nId = epToNovel[el.episode_id]
        if (nId && statsMap[nId]) {
          statsMap[nId].episodeLikes[el.episode_id] = (statsMap[nId].episodeLikes[el.episode_id] || 0) + 1
        }
      })
    }
  }

  const novelStats = (novels || []).map((n: any) => {
    const s = statsMap[n.id] || { views:0,likes:0,bookmarks:0,comments:0,viewsToday:0,viewsWeek:0,viewsMonth:0,episodeViews:{},episodeLikes:{},dailyViews:{} }
    const eps = allEpisodes.filter((e: any) => e.novel_id === n.id && e.published !== false)

    const episodeRows = eps.map((ep: any) => ({
      ep_number: ep.ep_number,
      title: ep.title,
      charCount: (ep.body || '').length,
      views: s.episodeViews[ep.id] || 0,
      likes: s.episodeLikes[ep.id] || 0,
    }))

    const daily: { date: string; views: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      daily.push({ date: key.slice(5), views: s.dailyViews[key] || 0 })
    }

    return {
      id: n.id,
      title: n.title,
      genre: n.genre,
      published: n.published,
      views: s.views,
      viewsToday: s.viewsToday,
      viewsWeek: s.viewsWeek,
      viewsMonth: s.viewsMonth,
      likes: s.likes,
      bookmarks: s.bookmarks,
      comments: s.comments,
      episodeRows,
      daily,
    }
  })

  const totalViews = novelStats.reduce((s, n) => s + n.views, 0)
  const totalToday = novelStats.reduce((s, n) => s + n.viewsToday, 0)
  const totalWeek = novelStats.reduce((s, n) => s + n.viewsWeek, 0)
  const totalMonth = novelStats.reduce((s, n) => s + n.viewsMonth, 0)
  const totalLikes = novelStats.reduce((s, n) => s + n.likes, 0)
  const totalBookmarks = novelStats.reduce((s, n) => s + n.bookmarks, 0)
  const totalComments = novelStats.reduce((s, n) => s + n.comments, 0)

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)'}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1000,margin:'0 auto',padding:'24px 16px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
          <h1 style={{fontSize:20,fontWeight:700,color:'var(--color-text)'}}>アクセス解析</h1>
          <Link href="/mypage?tab=works" style={{fontSize:13,color:'var(--color-brand)',textDecoration:'none'}}>← 作品管理に戻る</Link>
        </div>

        {/* PVサマリー（今日/今週/今月/累計） */}
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'18px',marginBottom:16}}>
          <div style={{fontSize:12,color:'var(--color-text-muted)',fontWeight:600,marginBottom:12}}>ページビュー</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:8}}>
            {[['今日',totalToday],['今週',totalWeek],['今月',totalMonth],['累計',totalViews]].map(([label,val]) => (
              <div key={label as string} style={{textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:700,color:'var(--color-brand)'}}>{(val as number).toLocaleString()}</div>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>{label} PV</div>
              </div>
            ))}
          </div>
        </div>

        {/* 反応サマリー */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:12,marginBottom:24}}>
          {[['総いいね',totalLikes],['総保存',totalBookmarks],['総コメント',totalComments]].map(([label,val]) => (
            <div key={label as string} style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:'var(--color-text)'}}>{(val as number).toLocaleString()}</div>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>

        {novelStats.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--color-text-muted)'}}>
            まだ作品がありません
          </div>
        ) : (
          <AnalyticsCharts novels={novelStats} />
        )}
      </div>

      <Footer user={user} />
    </div>
  )
}
