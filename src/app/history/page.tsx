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
      .select('id, title, ep_number, novel_id, novels(id, title, genre, author_id)')
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
          epId: ep.id,
          epTitle: ep.title,
          epNumber: ep.ep_number,
          viewedAt,
        }
      }
    })

    historyItems = Object.values(novelMap).sort((a,b) => b.viewedAt > a.viewedAt ? 1 : -1)
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
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{marginBottom:20}}>
            <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',marginBottom:4}}>閲覧履歴</h1>
            <p style={{fontSize:12,color:'#77706A'}}>最近読んだ作品が表示されます（最大200件）</p>
          </div>

          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
            {historyItems.length === 0 ? (
              <div style={{padding:'60px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
                まだ閲覧履歴がありません
              </div>
            ) : historyItems.map((item) => (
              <Link key={item.novelId} href={`/novel/${item.novelId}`} style={{textDecoration:'none',display:'flex',gap:14,padding:'14px 20px',borderBottom:'1px solid #FFF1E6',background:'#fff',alignItems:'center',color:'inherit'}}>
                <span style={{flex:1,minWidth:0,display:'block'}}>
                  <span style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{item.genre}</span>
                  </span>
                  <span style={{display:'block',fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:2}}>{item.novelTitle}</span>
                  <span style={{display:'block',fontSize:12,color:'#77706A',marginBottom:4}}>作者：{item.displayName}</span>
                  <span style={{display:'block',fontSize:11,color:'#B8AEA8'}}>
                    最後に読んだ話：<span style={{color:'#F26A21'}}>{item.epTitle}</span>
                  </span>
                </span>
                <span style={{fontSize:11,color:'#B8AEA8',flexShrink:0,textAlign:'right',display:'block'}}>
                  <span style={{display:'block'}}>{fmtDate(item.viewedAt)}</span>
                  <span style={{marginTop:6,display:'inline-block',padding:'5px 12px',background:'#F26A21',color:'#fff',borderRadius:12,fontSize:11,fontWeight:600}}>
                    続きを読む
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
        <Sidebar />
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
