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
      .select('id, title, ep_number, novel_id, novels(id, title, genre, author_id, summary)')
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
          authorId: novel.author_id,
          displayName: authorMap[novel.author_id] || '',
          summary: novel.summary || '',
          epId: ep.id,
          epTitle: ep.title,
          epNumber: ep.ep_number,
          viewedAt,
        }
      }
    })

    historyItems = Object.values(novelMap).sort((a,b) => b.viewedAt > a.viewedAt ? 1 : -1)
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
              <div key={item.novelId} style={{display:'flex',gap:14,padding:'14px 20px',borderBottom:'1px solid var(--color-brand-light)',background:'var(--color-bg-card)',alignItems:'center'}}>
                {/* 作品情報 */}
                <Link href={`/novel/${item.novelId}`} style={{flex:1,minWidth:0,textDecoration:'none',color:'inherit'}}>
                  <span style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'1px 6px',borderRadius:3}}>{item.genre}</span>
                  </span>
                  <span style={{display:'block',fontSize:15,fontWeight:700,color:'var(--color-text)',marginBottom:2}}>{item.novelTitle}</span>
                  <span style={{display:'block',fontSize:12,color:'var(--color-text-muted)',marginBottom:4}}>作者：{item.displayName}</span>
                  <span style={{display:'block',fontSize:11,color:'var(--color-text-faint)',marginBottom: item.summary ? 4 : 0}}>
                    最後に読んだ話：<span style={{color:'var(--color-brand)'}}>{item.epTitle}</span>
                  </span>
                  {item.summary && (
                    <details style={{marginTop:4}}>
                      <summary style={{
                        fontSize:11, color:'var(--color-brand)',
                        cursor:'pointer', listStyle:'none',
                        display:'inline-flex', alignItems:'center', gap:4,
                        userSelect:'none' as any,
                      }}>
                        <span style={{fontSize:10,border:'1px solid var(--color-brand-border)',borderRadius:8,padding:'1px 8px',color:'var(--color-text-muted)',background:'var(--color-bg)'}}>あらすじ ▾</span>
                      </summary>
                      <span style={{display:'block',fontSize:12,color:'var(--color-text-muted)',lineHeight:1.75,marginTop:6,padding:'8px 10px',background:'var(--color-bg)',borderRadius:6,borderLeft:'2px solid var(--color-brand-border)'}}>
                        {item.summary}
                      </span>
                    </details>
                  )}
                </Link>

                {/* 右側：日時＋ボタン2つ横並び */}
                <span style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
                  <span style={{fontSize:11,color:'var(--color-text-faint)'}}>{fmtDate(item.viewedAt)}</span>
                  <span style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
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
                  </span>
                </span>
              </div>
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
