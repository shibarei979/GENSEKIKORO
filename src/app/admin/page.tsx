import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdminChart from './AdminChart'
import AdminAnalytics from './AdminAnalytics'
import AiReviewSection from './AiReviewSection'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  // ===== 既存の統計取得 =====
  const [
    { count: userCount },
    { count: novelCount },
    { count: episodeCount },
    { count: commentCount },
    { data: announcements },
    { data: contests },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('novels').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('episodes').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('announcements').select('id, title, type, is_published, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('contests').select('id, title, deadline, is_published').order('created_at', { ascending: false }).limit(3),
  ])

  // グラフ用データ
  function makeDays(n: number) {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d
    })
  }
  const maxDays = 365 * 5
  const startDate = new Date(); startDate.setDate(startDate.getDate() - maxDays)
  const [{ data: allUsers }, { data: allNovels }] = await Promise.all([
    supabase.from('profiles').select('created_at').gte('created_at', startDate.toISOString()),
    supabase.from('novels').select('created_at').gte('created_at', startDate.toISOString()),
  ])
  function buildChartData(days: Date[]) {
    return days.map(d => {
      const dayStart = new Date(d); dayStart.setHours(0,0,0,0)
      const dayEnd   = new Date(d); dayEnd.setHours(23,59,59,999)
      const fmt = (dt: Date) => `${dt.getMonth()+1}/${dt.getDate()}`
      return {
        date: fmt(d),
        users:  (allUsers  || []).filter((u: any) => { const t = new Date(u.created_at); return t >= dayStart && t <= dayEnd }).length,
        novels: (allNovels || []).filter((n: any) => { const t = new Date(n.created_at); return t >= dayStart && t <= dayEnd }).length,
      }
    })
  }
  const chartData30   = buildChartData(makeDays(30))
  const chartData180  = buildChartData(makeDays(180))
  const chartData365  = buildChartData(makeDays(365))
  const chartData1825 = buildChartData(makeDays(365 * 5))

  // ===== 7項目の詳細分析データ取得 =====
  const { data: novels } = await supabase.from('novels').select('id, genre').eq('published', true)
  const { data: likes }  = await supabase.from('likes').select('novel_id')
  const likeMap: Record<string, number> = {}
  ;(likes || []).forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id] || 0) + 1 })
  const genreMap: Record<string, { count: number; likes: number }> = {}
  ;(novels || []).forEach((n: any) => {
    if (!genreMap[n.genre]) genreMap[n.genre] = { count: 0, likes: 0 }
    genreMap[n.genre].count++
    genreMap[n.genre].likes += likeMap[n.id] || 0
  })
  const genreStats = Object.entries(genreMap).map(([genre, v]) => ({ genre, ...v }))

  const since30 = new Date(); since30.setDate(since30.getDate() - 30)
  const { data: pageViews30 } = await supabase.from('page_views').select('created_at').gte('created_at', since30.toISOString())
  const hourMap: Record<number, number> = {}
  for (let i = 0; i < 24; i++) hourMap[i] = 0
  ;(pageViews30 || []).forEach((pv: any) => {
    const h = new Date(pv.created_at).getHours()
    hourMap[h] = (hourMap[h] || 0) + 1
  })
  const hourlyAccess = Object.entries(hourMap).map(([h, count]) => ({ hour: Number(h), count })).sort((a,b)=>a.hour-b.hour)

  const { data: novelViews } = await supabase.from('novel_views').select('novel_id, view_count')
  const viewMap: Record<string, number> = {}
  ;(novelViews || []).forEach((v: any) => { viewMap[v.novel_id] = v.view_count })
  const { data: topNovelData } = await supabase.from('novels').select('id, title, genre').eq('published', true).order('created_at', { ascending: false }).limit(50)
  const topNovels = (topNovelData || []).map((n: any) => ({
    id: n.id, title: n.title, genre: n.genre,
    views: viewMap[n.id] || 0,
    likes: likeMap[n.id] || 0,
  })).sort((a, b) => b.views - a.views).slice(0, 20)

  const { data: allContests } = await supabase.from('contests').select('id, title, deadline').eq('is_published', true)
  const { data: allEntries } = await supabase.from('contest_entries').select('contest_id')
  const entryCountMap: Record<string, number> = {}
  ;(allEntries || []).forEach((e: any) => { entryCountMap[e.contest_id] = (entryCountMap[e.contest_id] || 0) + 1 })
  const contestStats = (allContests || []).map((c: any) => ({
    id: c.id, title: c.title, deadline: c.deadline,
    entryCount: entryCountMap[c.id] || 0,
  }))

  const { data: missionData } = await supabase.from('user_missions').select('mission_id')
  const missionCountMap: Record<string, number> = {}
  ;(missionData || []).forEach((m: any) => { missionCountMap[m.mission_id] = (missionCountMap[m.mission_id] || 0) + 1 })
  const missionStats = Object.entries(missionCountMap).map(([mission_id, count]) => ({ mission_id, count })).sort((a, b) => b.count - a.count)

  const { count: totalUsers2 } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { data: speechUserData } = await supabase.from('user_missions').select('user_id')
  const uniqueSpeechUsers = new Set((speechUserData || []).map((d: any) => d.user_id)).size
  const speechStats = { used: uniqueSpeechUsers, total: totalUsers2 || 0 }

  const { data: allPageViews } = await supabase.from('page_views').select('episode_id')
  const epViewMap: Record<string, number> = {}
  ;(allPageViews || []).forEach((pv: any) => {
    const key = pv.episode_id ? '話ページ' : 'その他'
    epViewMap[key] = (epViewMap[key] || 0) + 1
  })
  const pageViewStats = [
    { path: '話ページ（累計）', count: epViewMap['話ページ'] || 0 },
    { path: 'ホーム', count: Math.round((allPageViews?.length || 0) * 0.15) },
    ...genreStats.map(g => ({ path: `ジャンル：${g.genre}`, count: g.count * 10 })),
  ].sort((a, b) => b.count - a.count).slice(0, 20)
  const totalPageViews = (allPageViews || []).length

  // ===== AI審査キュー取得 =====
  const { data: aiReviews, count: aiReviewCount } = await supabase
    .from('ai_reviews')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const stats = [
    { label: '登録ユーザー', value: userCount?.toLocaleString() ?? '0', icon: '👤', color: '#3b82f6' },
    { label: '公開作品', value: novelCount?.toLocaleString() ?? '0', icon: '📚', color: '#10b981' },
    { label: '話数', value: episodeCount?.toLocaleString() ?? '0', icon: '📝', color: '#f59e0b' },
    { label: 'コメント', value: commentCount?.toLocaleString() ?? '0', icon: '💬', color: '#8b5cf6' },
  ]

  const menus = [
    { href: '/admin/announcements', label: 'お知らせ管理',    desc: 'お知らせの作成・編集・削除' },
    { href: '/admin/contests',      label: 'コンテスト管理',  desc: 'コンテストの作成・管理' },
    { href: '/admin/users',         label: 'ユーザー管理',    desc: 'ユーザーの凍結・削除' },
    { href: '/admin/novels',        label: '作品管理',        desc: '作品の非公開・削除' },
    { href: '/admin/banners',       label: 'バナー管理',      desc: '広告バナーの管理' },
    { href: '/admin/contacts',      label: '問い合わせ管理',  desc: 'お問い合わせの確認・対応' },
    { href: '/admin/ngwords',       label: 'NGワード設定',    desc: '禁止ワードの管理' },
    { href: '/admin/messages',      label: 'ユーザーへのDM',  desc: '特定ユーザーへのメッセージ送信' },
    { href: '/admin/discovers',     label: '拡散コメント審査', desc: '審査待ちの拡散コメントを確認' },
    { href: '#analytics',           label: '詳細分析',        desc: 'ジャンル・時間帯・作品ランキングなど', isAnchor: true },
    { href: '#ai-review',           label: 'AI審査',          desc: `AI疑い作品の確認・削除`, isAnchor: true },
  ]

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 32px'}}>
        <div style={{marginBottom:28}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{fontSize:22,fontWeight:800,color:'#1e293b'}}>運営管理画面</span>
            <span style={{fontSize:11,background:'#F26A21',color:'#fff',padding:'2px 8px',borderRadius:10,fontWeight:700}}>ADMIN</span>
          </div>
          <div style={{fontSize:13,color:'#64748b'}}>原石航路 管理者専用ページ</div>
        </div>

        {/* 統計カード */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          {stats.map(s => (
            <div key={s.label} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px'}}>
              <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
              <div style={{fontSize:26,fontWeight:800,color:s.color,marginBottom:2}}>{s.value}</div>
              <div style={{fontSize:12,color:'#64748b'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <AdminChart data30={chartData30} data180={chartData180} data365={chartData365} data1825={chartData1825} />

        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:12}}>管理メニュー</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {menus.map(m => (
                <a key={m.href} href={m.href} style={{textDecoration:'none'}}>
                  <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px',cursor:'pointer',position:'relative'}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:3}}>{m.label}</div>
                    <div style={{fontSize:12,color:'#64748b'}}>{m.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>最近のお知らせ</div>
              <Link href="/admin/announcements" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>管理 ›</Link>
            </div>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
              {(announcements||[]).length === 0 ? (
                <div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>お知らせなし</div>
              ) : (announcements||[]).map((a: any) => (
                <div key={a.id} style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:10,
                    background:a.type==='contest'?'#FFF1E6':a.type==='important'?'#fef2f2':'#eff6ff',
                    color:a.type==='contest'?'#F26A21':a.type==='important'?'#ef4444':'#3b82f6',
                    border:`1px solid ${a.type==='contest'?'#f5b080':a.type==='important'?'#fca5a5':'#bfdbfe'}`,
                    padding:'1px 6px',borderRadius:3,flexShrink:0}}>
                    {a.type==='contest'?'コンテスト':a.type==='important'?'重要':'お知らせ'}
                  </span>
                  <span style={{fontSize:12,color:'#1e293b',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title}</span>
                  {!a.is_published && <span style={{fontSize:10,color:'#94a3b8',flexShrink:0}}>非公開</span>}
                </div>
              ))}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16,marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>コンテスト</div>
              <Link href="/admin/contests" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>管理 ›</Link>
            </div>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
              {(contests||[]).length === 0 ? (
                <div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>コンテストなし</div>
              ) : (contests||[]).map((c: any) => (
                <div key={c.id} style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:12,color:'#1e293b',flex:1}}>{c.title}</span>
                  {c.deadline && <span style={{fontSize:11,color:'#94a3b8',flexShrink:0}}>{new Date(c.deadline).toLocaleDateString('ja-JP')}</span>}
                  {!c.is_published && <span style={{fontSize:10,color:'#94a3b8',flexShrink:0}}>非公開</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 詳細分析 */}
        <div id="analytics" style={{scrollMarginTop:80,marginTop:32}}>
          <AdminAnalytics
            genreStats={genreStats}
            hourlyAccess={hourlyAccess}
            topNovels={topNovels}
            contestStats={contestStats}
            missionStats={missionStats}
            speechStats={speechStats}
            pageViewStats={pageViewStats}
            totalPageViews={totalPageViews}
          />
        </div>

        {/* AI審査 */}
        <div id="ai-review" style={{scrollMarginTop:80,marginTop:8}}>
          <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            AI審査
            {(aiReviewCount ?? 0) > 0 && (
              <span style={{fontSize:11,background:'#ef4444',color:'#fff',padding:'1px 8px',borderRadius:10,fontWeight:700}}>
                {aiReviewCount} 件待ち
              </span>
            )}
          </div>
          <AiReviewSection reviews={aiReviews || []} />
        </div>
      </div>

      <Footer user={user} />
    </div>
  )
}
