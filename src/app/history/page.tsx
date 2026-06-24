import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let profile = null
  const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  profile = data

  const { data: views } = await supabase
    .from('page_views')
    .select('episode_id, viewed_at')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(200)

  const epIds = Array.from(new Set((views||[]).map((v: any) => v.episode_id).filter(Boolean)))

  const latestViewMap: Record<string,string> = {}
  views?.forEach((v: any) => {
    if (v.episode_id && !latestViewMap[v.episode_id]) {
      latestViewMap[v.episode_id] = v.viewed_at
    }
  })

  let historyItems: any[] = []
  if (epIds.length > 0) {
    const { data: episodes } = await supabase
      .from('episodes')
      .select('id, title, ep_number, novel_id, novels(id, title, genre, author_id, summary, tags, novel_type, is_serial)')
      .in('id', epIds as string[])

    const authorIds = Array.from(new Set((episodes||[]).map((e: any) => e.novels?.author_id).filter(Boolean)))
    const authorMap: Record<string,string> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds as string[])
      authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
    }

    const novelMap: Record<string, any> = {}
    episodes?.forEach((ep: any) => {
      const novel = ep.novels
      if (!novel) return
      const viewedAt = latestViewMap[ep.id]
      if (!novelMap[novel.id] || viewedAt > novelMap[novel.id].viewedAt) {
        novelMap[novel.id] = {
          novelId: novel.id,
          novelTitle: novel.title,
          genre: novel.genre,
          novelType: novel.novel_type || '',
          isSerial: novel.is_serial,
          authorId: novel.author_id,
          displayName: authorMap[novel.author_id] || '',
          summary: novel.summary || '',
          tags: novel.tags || [],
          epId: ep.id,
          epTitle: ep.title,
          epNumber: ep.ep_number,
          viewedAt,
        }
      }
    })

    historyItems = Object.values(novelMap).sort((a,b) => b.viewedAt > a.viewedAt ? 1 : -1)
  }

  // 文字数・いいね数取得
  const historyNovelIds = historyItems.map((item: any) => item.novelId)
  const charCountMap: Record<string,number> = {}
  const likeMap: Record<string,number> = {}
  const newbieSet = new Set<string>()
  if (historyNovelIds.length > 0) {
    const [epData, likeData, authorNovels] = await Promise.all([
      supabase.from('episodes').select('novel_id, body').in('novel_id', historyNovelIds),
      supabase.from('likes').select('novel_id').in('novel_id', historyNovelIds),
      supabase.from('novels').select('author_id').eq('published', true).in('author_id', historyItems.map((i:any)=>i.authorId)),
    ])
    epData.data?.forEach((ep:any) => { charCountMap[ep.novel_id] = (charCountMap[ep.novel_id]||0)+(ep.body?.length||0) })
    likeData.data?.forEach((l:any) => { likeMap[l.novel_id] = (likeMap[l.novel_id]||0)+1 })
    const authorCount: Record<string,number> = {}
    authorNovels.data?.forEach((n:any) => { authorCount[n.author_id] = (authorCount[n.author_id]||0)+1 })
    Object.entries(authorCount).forEach(([id,cnt]) => { if((cnt as number)<=3) newbieSet.add(id) })
  }

  // S7: 各作品の第1話IDを取得
  const novelIds = historyItems.map((item: any) => item.novelId)
  const firstEpMap: Record<string, string> = {}
  if (novelIds.length > 0) {
    const { data: firstEps } = await supabase
      .from('episodes')
      .select('id, novel_id, ep_number')
      .in('novel_id', novelIds)
      .eq('published', true)
      .order('ep_number', { ascending: true })
    // 各novelの最小ep_numberのidを取得
    firstEps?.forEach((ep: any) => {
      if (!firstEpMap[ep.novel_id]) {
        firstEpMap[ep.novel_id] = ep.id
      }
    })
  }

  function fmtDate(s: string) {
    const d = new Date(s)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60*60*1000) return `${Math.floor(diff/60000)}分前`
    if (diff < 24*60*60*1000) return `${Math.floor(diff/3600000)}時間前`
    if (diff < 7*24*60*60*1000) return `${Math.floor(diff/86400000)}日前`
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg-card)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div className="main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{marginBottom:20}}>
            <h1 style={{fontSize:22,fontWeight:700,color:'var(--color-text)',marginBottom:4}}>閲覧履歴</h1>
            <p style={{fontSize:12,color:'var(--color-text-muted)'}}>最近読んだ作品が表示されます（最大200件）</p>
          </div>

          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
            {historyItems.length === 0 ? (
              <div style={{padding:'60px',textAlign:'center',color:'var(--color-text-faint)',fontSize:13}}>
                まだ閲覧履歴がありません
              </div>
            ) : historyItems.map((item) => (
              <Link key={item.novelId} href={`/novel/${item.novelId}`} style={{display:'block',padding:'16px 20px',borderBottom:'1px solid var(--color-brand-light)',background:'var(--color-bg-card)',textDecoration:'none',color:'inherit'}}>
                {/* バッジ行 */}
                <div style={{display:'flex',gap:5,marginBottom:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'1px 6px',borderRadius:3}}>{item.genre}</span>
                  {item.novelType && <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 6px',borderRadius:3}}>{item.novelType}</span>}
                  {newbieSet.has(item.authorId) && <span style={{fontSize:10,background:'#f0fdf4',color:'#16a34a',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3,fontWeight:700}}>新人</span>}
                  {item.isSerial
                    ? <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>
                    : <span style={{fontSize:10,background:'#f5f5f5',color:'#757575',border:'1px solid #e0e0e0',padding:'1px 6px',borderRadius:3}}>完結</span>}
                </div>
                {/* タイトル・作者 */}
                <div style={{fontSize:17,fontWeight:700,color:'var(--color-text)',lineHeight:1.4,marginBottom:3}}>{item.novelTitle}</div>
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:6}}>作者：{item.displayName}</div>
                {/* あらすじ */}
                {item.summary && (
                  <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.7,marginBottom:7,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>
                    {item.summary}
                  </div>
                )}
                {/* タグ */}
                {item.tags.length > 0 && (
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:7}}>
                    {item.tags.slice(0,5).map((t:string) => (
                      <span key={t} style={{fontSize:10,background:'var(--color-bg)',color:'var(--color-text-muted)',border:'1px solid var(--color-brand-border)',padding:'1px 6px',borderRadius:3}}>#{t}</span>
                    ))}
                  </div>
                )}
                {/* 統計・ボタン行 */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',gap:12,fontSize:11,color:'var(--color-text-faint)',flexWrap:'wrap'}}>
                    {charCountMap[item.novelId] > 0 && <span>{charCountMap[item.novelId] >= 10000 ? `${(charCountMap[item.novelId]/10000).toFixed(1)}万文字` : `${charCountMap[item.novelId].toLocaleString()}文字`}</span>}
                    <span>最終更新：{fmtDate(item.viewedAt)}</span>
                    {likeMap[item.novelId] > 0 && <span style={{color:'var(--color-text-muted)',fontWeight:600}}>♡ {likeMap[item.novelId]}</span>}
                  </div>
                  {/* ボタン */}
                  <div style={{display:'flex',gap:6}}>
                    {firstEpMap[item.novelId] && firstEpMap[item.novelId] !== item.epId && (
                      <Link href={`/novel/${item.novelId}/episode/${firstEpMap[item.novelId]}`}
                        style={{display:'inline-block',padding:'5px 12px',background:'var(--color-brand)',color:'var(--color-bg-card)',borderRadius:12,fontSize:11,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>
                        最初から読む
                      </Link>
                    )}
                    <Link href={`/novel/${item.novelId}/episode/${item.epId}`}
                      style={{display:'inline-block',padding:'5px 12px',background:'var(--color-brand)',color:'var(--color-bg-card)',borderRadius:12,fontSize:11,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>
                      続きを読む
                    </Link>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="desktop-only"><Sidebar /></div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
