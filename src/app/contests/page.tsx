import { createClient } from '@/lib/supabase/server'
export const revalidate = 21600 // 6時間キャッシュ（0時・6時・12時・18時更新）
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
    .from('contests')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  // 応募数を取得
  const contestIds = (contests||[]).map((c:any) => c.id)
  const entryCountMap: Record<string,number> = {}
  if (contestIds.length > 0) {
    const { data: entries } = await supabase
      .from('contest_entries')
      .select('contest_id')
      .in('contest_id', contestIds)
    entries?.forEach((e:any) => { entryCountMap[e.contest_id] = (entryCountMap[e.contest_id]||0)+1 })
  }

  // サイトコンテストと外部コンテストに分ける
  const siteContests     = (contests||[]).filter((c:any) => c.is_site_contest)
  const externalContests = (contests||[]).filter((c:any) => !c.is_site_contest)

  // 募集中のみ・終了含む全件
  const activeContests = siteContests.filter((c:any) => getStatusLabel(c.deadline, c.judging_end).label !== '終了')
  const endedContests  = siteContests.filter((c:any) => getStatusLabel(c.deadline, c.judging_end).label === '終了')

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div className="main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>

          {/* パンくず */}
          <div style={{fontSize:12,color:'#77706A',marginBottom:16,display:'flex',alignItems:'center',gap:4}}>
            <Link href="/" style={{color:'#F26A21',textDecoration:'none'}}>ホーム</Link>
            <span>›</span>
            <span>コンテスト</span>
          </div>

          <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',marginBottom:20,fontFamily:"'Noto Serif JP',serif"}}>
            コンテスト
          </h1>

          {/* サイトコンテスト（開催中・選考中・結果発表） */}
          {activeContests.length > 0 && (
            <div style={{marginBottom:28}}>
              <h2 style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
                開催中のコンテスト
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {activeContests.map((c:any) => {
                  const status = getStatusLabel(c.deadline, c.judging_end)
                  const entryCount = entryCountMap[c.id] || 0
                  return (
                    <Link key={c.id} href={`/contests/${c.id}`} style={{textDecoration:'none'}}>
                      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',display:'flex',gap:0,transition:'box-shadow .15s'}}
>
                        {c.image_url && (
                          <div style={{width:200,flexShrink:0,overflow:'hidden',background:'#FFF9F2'}}>
                            <img src={c.image_url} alt={c.title}
                              style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                          </div>
                        )}
                        <div style={{padding:'20px 24px',flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,
                              border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>
                              {status.label}
                            </span>
                            {c.deadline && (
                              <span style={{fontSize:11,color:'#94a3b8'}}>
                                締切：{new Date(c.deadline).toLocaleDateString('ja-JP')}
                              </span>
                            )}
                            <span style={{fontSize:11,color:'#77706A',marginLeft:'auto'}}>
                              応募数：{entryCount}作品
                            </span>
                          </div>
                          <h3 style={{fontSize:17,fontWeight:700,color:'#2B211B',marginBottom:8,lineHeight:1.4,fontFamily:"'Noto Serif JP',serif"}}>
                            {c.title}
                          </h3>
                          {c.description && (
                            <p style={{fontSize:12,color:'#77706A',lineHeight:1.8,overflow:'hidden',
                              display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                              {c.description}
                            </p>
                          )}
                          {status.label === '募集中' && (
                            <div style={{marginTop:10}}>
                              <span style={{display:'inline-block',padding:'6px 16px',background:'#F26A21',color:'#fff',
                                fontWeight:700,fontSize:12,borderRadius:6}}>
                                応募受付中 →
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* 外部コンテスト */}
          {externalContests.length > 0 && (
            <div style={{marginBottom:28}}>
              <h2 style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'#3b82f6',borderRadius:2,display:'inline-block'}}/>
                外部コンテスト情報
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {externalContests.map((c:any) => {
                  const status = getStatusLabel(c.deadline, c.judging_end)
                  return (
                    <a key={c.id} href={c.apply_url||'#'} target="_blank" rel="noopener noreferrer"
                      style={{textDecoration:'none',display:'flex',background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
                      {c.image_url && (
                        <div style={{width:200,flexShrink:0,overflow:'hidden',background:'#FFF9F2'}}>
                          <img src={c.image_url} alt={c.title}
                            style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                        </div>
                      )}
                      <div style={{padding:'20px 24px',flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,
                            border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>
                            {status.label}
                          </span>
                          {c.deadline && (
                            <span style={{fontSize:11,color:'#94a3b8'}}>
                              締切：{new Date(c.deadline).toLocaleDateString('ja-JP')}
                            </span>
                          )}
                          <span style={{fontSize:11,color:'#3b82f6',marginLeft:'auto',fontWeight:600}}>外部サイト ↗</span>
                        </div>
                        <h3 style={{fontSize:17,fontWeight:700,color:'#2B211B',marginBottom:8,lineHeight:1.4,fontFamily:"'Noto Serif JP',serif"}}>
                          {c.title}
                        </h3>
                        {c.description && (
                          <p style={{fontSize:12,color:'#77706A',lineHeight:1.8,overflow:'hidden',
                            display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                            {c.description}
                          </p>
                        )}
                        {status.label === '募集中' && (
                          <div style={{marginTop:10}}>
                            <span style={{display:'inline-block',padding:'6px 16px',background:'#3b82f6',color:'#fff',
                              fontWeight:700,fontSize:12,borderRadius:6}}>
                              外部サイトで応募する ↗
                            </span>
                          </div>
                        )}
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* 終了したサイトコンテスト */}
          {endedContests.length > 0 && (
            <div>
              <h2 style={{fontSize:15,fontWeight:700,color:'#94a3b8',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'#e2e8f0',borderRadius:2,display:'inline-block'}}/>
                過去のコンテスト
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {endedContests.map((c:any) => (
                  <Link key={c.id} href={`/contests/${c.id}`} style={{textDecoration:'none',display:'block',
                    background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,padding:'14px 18px',opacity:0.7}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',background:'#f1f5f9',
                        border:'1px solid #e2e8f0',padding:'1px 8px',borderRadius:8}}>終了</span>
                      {c.deadline && (
                        <span style={{fontSize:11,color:'#94a3b8'}}>締切：{new Date(c.deadline).toLocaleDateString('ja-JP')}</span>
                      )}
                    </div>
                    <div style={{fontSize:14,fontWeight:600,color:'#77706A'}}>{c.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(!contests || contests.length === 0) && (
            <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'60px',textAlign:'center',color:'#B8AEA8',fontSize:14}}>
              現在開催中のコンテストはありません
            </div>
          )}
        </div>

        <div className="desktop-only"><Sidebar /></div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
