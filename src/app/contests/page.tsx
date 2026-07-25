import { createClient } from '@/lib/supabase/server'
import { getFeatureFlags, isFeatureVisible } from '@/lib/feature-flags'
export const revalidate = 10
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import AdBanner from '@/components/layout/ad-banner'
import Sidebar from '@/components/layout/sidebar'

function getStatusLabel(deadline: string | null, judging_end: string | null, start_date?: string | null) {
  const now = new Date()
  // 開始日が未来なら「近日開催」
  if (start_date && now < new Date(start_date)) {
    return { label: '近日開催', color: '#0ea5e9', bg: '#f0f9ff', border: '#7dd3fc' }
  }
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

  // お題企画（フィーチャーフラグ：off=非表示 / preview=アドミンのみ / on=全員）
  const flags = await getFeatureFlags()
  const showProjects = isFeatureVisible(flags['projects'], profile?.is_admin || false)
  let recentProjects: any[] = []
  if (showProjects) {
    const { data: pj } = await supabase
      .from('projects')
      .select('id, title, theme, deadline')
      .order('created_at', { ascending: false })
      .limit(6)
    recentProjects = pj || []
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
  const activeContests   = siteContests.filter((c:any) => getStatusLabel(c.deadline, c.judging_end, c.start_date).label !== '終了')
  const endedContests    = siteContests.filter((c:any) => getStatusLabel(c.deadline, c.judging_end, c.start_date).label === '終了')

  return (
    <div style={{minHeight:'100vh',fontFamily:"'Noto Sans JP',sans-serif"}}>
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
                  const status = getStatusLabel(c.deadline, c.judging_end, c.start_date)
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
                            {/* カード全体が Link のため、入れ子の <a> を避けて span で表現 */}
                            <span
                              style={{display:'inline-block',padding:'6px 18px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              {status.label==='募集中'?'応募受付中 →':'詳細を見る →'}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-only">
                          {c.image_url && <img src={c.image_url} alt={c.title} style={{width:231,height:130,objectFit:'cover',display:'block'}}/>}
                          <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
                            {/* カード全体が Link のため、入れ子の <a> を避けて span で表現 */}
                            <span
                              style={{display:'inline-block',padding:'6px 18px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              {status.label==='募集中'?'応募受付中 →':'詳細を見る →'}
                            </span>
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
                  const status = getStatusLabel(c.deadline, c.judging_end, c.start_date)
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
                              style={{display:'inline-block',padding:'6px 18px',background:'#3b82f6',color:'var(--color-text-inverse)',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
                              外部サイトで応募する ↗
                            </a>
                          </div>
                        </div>
                        <div className="mobile-only">
                          {c.image_url && <img src={c.image_url} alt={c.title} style={{width:231,height:130,objectFit:'cover',display:'block'}}/>}
                          <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                            <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
                            <a href={c.apply_url||'#'} target="_blank" rel="noopener noreferrer"
                              style={{display:'inline-block',padding:'6px 18px',background:'#3b82f6',color:'var(--color-text-inverse)',fontWeight:700,fontSize:12,borderRadius:6,textDecoration:'none'}}>
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

          {/* お題企画（ユーザー主催）：フィーチャーフラグで公開制御 */}
          {showProjects && (
            <div style={{marginTop:32}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <h2 style={{fontSize:16,fontWeight:700,color:'var(--color-text)'}}>みんなのお題企画</h2>
                  {flags['projects'] === 'preview' && (
                    <span style={{fontSize:10,fontWeight:700,color:'#b45309',background:'#fef3c7',padding:'2px 10px',borderRadius:12}}>プレビュー中（アドミンのみ表示）</span>
                  )}
                </div>
                <div style={{display:'flex',gap:8}}>
                  <Link href="/projects" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none',border:'1px solid var(--color-brand-border)',borderRadius:14,padding:'5px 14px'}}>一覧を見る</Link>
                  <Link href="/projects/new" style={{fontSize:12,fontWeight:700,color:'var(--color-text-inverse)',background:'var(--color-brand)',textDecoration:'none',borderRadius:14,padding:'5px 14px'}}>企画を作る</Link>
                </div>
              </div>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:12,lineHeight:1.7}}>
                ユーザーが主催するテーマ企画です。お題に沿った作品を投稿して参加できます。
              </div>
              {recentProjects.length === 0 ? (
                <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'32px',textAlign:'center',color:'var(--color-text-faint)',fontSize:13}}>
                  まだ企画がありません。最初の企画を立ててみませんか？
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',gap:10}}>
                  {recentProjects.map((p:any) => {
                    const isOpen = !p.deadline || new Date(p.deadline) > new Date()
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'14px 16px',textDecoration:'none',display:'block'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                          <span style={{fontSize:10,fontWeight:700,color:isOpen?'#15803d':'#94a3b8',background:isOpen?'#dcfce7':'#f1f5f9',padding:'2px 8px',borderRadius:10}}>{isOpen?'募集中':'締切'}</span>
                          {p.theme && <span style={{fontSize:10,color:'var(--color-brand)',background:'var(--color-brand-light)',padding:'2px 8px',borderRadius:10}}>お題：{p.theme.slice(0,12)}{p.theme.length>12?'…':''}</span>}
                        </div>
                        <div style={{fontSize:13.5,fontWeight:700,color:'var(--color-text)',lineHeight:1.5}}>{p.title}</div>
                      </Link>
                    )
                  })}
                </div>
              )}
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
