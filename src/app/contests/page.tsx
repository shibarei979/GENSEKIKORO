import { createClient } from '@/lib/supabase/server'
export const revalidate = 10
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'

function getStatusLabel(deadline: string | null, judging_end: string | null) {
  const now = new Date()
  if (!deadline) return { label: '募集中', color: '#10b981', bg: '#f0fdf4', border: '#86efac' }
  const d = new Date(deadline)
  if (now < d) return { label: '募集中', color: '#10b981', bg: '#f0fdf4', border: '#86efac' }
  if (!judging_end) return { label: '選考中', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' }
  const j = new Date(judging_end)
  if (now < j) return { label: '選考中', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' }
  const expire = new Date(j.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (now < expire) return { label: '結果発表', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' }
  return { label: '終了', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' }
}

export default async function ContestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: contests } = await supabase
    .from('contests').select('*').eq('is_published', true).order('created_at', { ascending: false })

  const contestIds = (contests||[]).map((c:any) => c.id)
  const entryCountMap: Record<string,number> = {}
  if (contestIds.length > 0) {
    const { data: entries } = await supabase.from('contest_entries').select('contest_id').in('contest_id', contestIds)
    entries?.forEach((e:any) => { entryCountMap[e.contest_id] = (entryCountMap[e.contest_id]||0)+1 })
  }

  const siteContests     = (contests||[]).filter((c:any) => c.is_site_contest)
  const externalContests = (contests||[]).filter((c:any) => !c.is_site_contest)
  const activeContests   = siteContests.filter((c:any) => getStatusLabel(c.deadline, c.judging_end).label !== '終了')
  const endedContests    = siteContests.filter((c:any) => getStatusLabel(c.deadline, c.judging_end).label === '終了')

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div className="main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>

          {activeContests.length > 0 && (
            <div style={{marginBottom:28}}>
              <h2 style={{fontSize:15,fontWeight:700,color:'var(--color-text)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'var(--color-brand)',borderRadius:2,display:'inline-block'}}/>
                開催中のコンテスト
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {activeContests.map((c:any) => {
                  const status = getStatusLabel(c.deadline, c.judging_end)
                  return (
                    <Link key={c.id} href={`/contests/${c.id}`} style={{textDecoration:'none'}}>
                      <div className="contest-card" style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden',width:231}}>
                        <div className="desktop-only">
                          {c.image_url && (
                            <img src={c.image_url} alt={c.title}
                              style={{width:231,height:130,objectFit:'cover',display:'block'}}/>
                          )}
                          <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
                            <Link href={`/contests/${c.id}`}
                              style={{display:'inline-block',padding:'6px 18px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              {status.label==='募集中'?'応募受付中 →':'詳細を見る →'}
                            </Link>
                          </div>
                        </div>
                        <div className="mobile-only">
                          {c.image_url && <img src={c.image_url} alt={c.title} style={{width:231,height:130,objectFit:'cover',display:'block'}}/>}
                          <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
                            <Link href={`/contests/${c.id}`}
                              style={{display:'inline-block',padding:'6px 18px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              {status.label==='募集中'?'応募受付中 →':'詳細を見る →'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {externalContests.length > 0 && (
            <div style={{marginBottom:28}}>
              <h2 style={{fontSize:15,fontWeight:700,color:'var(--color-text)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'#3b82f6',borderRadius:2,display:'inline-block'}}/>
                外部コンテスト情報
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {externalContests.map((c:any) => {
                  const status = getStatusLabel(c.deadline, c.judging_end)
                  return (
                    <div key={c.id} className="contest-card" style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden',width:231}}>
                        <div className="desktop-only">
                          {c.image_url && (
                            <img src={c.image_url} alt={c.title}
                              style={{width:231,height:130,objectFit:'cover',display:'block'}}/>
                          )}
                          <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
                            <a href={c.apply_url||'#'} target="_blank" rel="noopener noreferrer"
                              style={{display:'inline-block',padding:'6px 18px',background:'#3b82f6',color:'#fff',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              外部サイトで応募する ↗
                            </a>
                          </div>
                        </div>
                        <div className="mobile-only">
                          {c.image_url && <img src={c.image_url} alt={c.title} style={{width:231,height:130,objectFit:'cover',display:'block'}}/>}
                          <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
                            <a href={c.apply_url||'#'} target="_blank" rel="noopener noreferrer"
                              style={{display:'inline-block',padding:'6px 18px',background:'#3b82f6',color:'#fff',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              外部サイトで応募する ↗
                            </a>
                          </div>
                        </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {endedContests.length > 0 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:700,color:'#94a3b8',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'#e2e8f0',borderRadius:2,display:'inline-block'}}/>
                過去のコンテスト
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {endedContests.map((c:any) => (
                  <Link key={c.id} href={`/contests/${c.id}`} style={{textDecoration:'none',display:'block',
                    background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'14px 18px',opacity:0.7}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',background:'#f1f5f9',border:'1px solid #e2e8f0',padding:'1px 8px',borderRadius:8}}>終了</span>
                      {c.deadline && <span style={{fontSize:11,color:'#94a3b8'}}>締切：{new Date(c.deadline).toLocaleDateString('ja-JP')}</span>}
                    </div>
                    <div style={{fontSize:14,fontWeight:600,color:'var(--color-text-muted)'}}>{c.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(!contests || contests.length === 0) && (
            <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'60px',textAlign:'center',color:'var(--color-text-faint)',fontSize:14}}>
              現在開催中のコンテストはありません
            </div>
          )}

          <div className="mobile-only" style={{height:80}}/>
        </div>

        <div className="desktop-only"><Sidebar /></div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
