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

  const activeContests = (contests||[]).filter((c:any) => getStatusLabel(c.deadline, c.judging_end).label !== '終了')
  const endedContests  = (contests||[]).filter((c:any) => getStatusLabel(c.deadline, c.judging_end).label === '終了')

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div className="main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>

          {/* 開催中・選考中・結果発表 */}
          {activeContests.length > 0 && (
            <div style={{marginBottom:32}}>
              <h2 style={{fontSize:15,fontWeight:700,color:'var(--color-text)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'var(--color-brand)',borderRadius:2,display:'inline-block'}}/>
                コンテスト
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                {activeContests.map((c:any) => {
                  const status = getStatusLabel(c.deadline, c.judging_end)
                  const href = c.is_site_contest ? `/contests/${c.id}` : (c.apply_url || '#')
                  const isExternal = !c.is_site_contest
                  return (
                    <div key={c.id} style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden',display:'flex',alignItems:'stretch'}}>
                      {/* 画像（左固定幅） */}
                      {c.image_url && (
                        <a href={href} target={isExternal?'_blank':'_self'} rel={isExternal?'noopener noreferrer':undefined}
                          style={{display:'block',textDecoration:'none',flexShrink:0,width:180}}>
                          <img src={c.image_url} alt={c.title}
                            style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                        </a>
                      )}
                      {/* ボタン */}
                      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',justifyContent:'center',gap:10}}>
                        <span style={{
                          fontSize:11,fontWeight:700,
                          color:status.color,background:status.bg,
                          border:`1px solid ${status.border}`,
                          padding:'2px 10px',borderRadius:10,
                          alignSelf:'flex-start',
                        }}>{status.label}</span>
                        <a href={href}
                          target={isExternal?'_blank':'_self'}
                          rel={isExternal?'noopener noreferrer':undefined}
                          style={{
                            display:'inline-block',
                            padding:'7px 20px',
                            background:'var(--color-brand)',
                            color:'var(--color-bg-card)',
                            fontWeight:700, fontSize:13,
                            borderRadius:8, textDecoration:'none',
                            alignSelf:'flex-start',
                          }}>
                          {isExternal ? '外部サイトで応募する ↗' : c.is_site_contest && status.label==='募集中' ? '応募する →' : '詳細を見る →'}
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 終了したコンテスト */}
          {endedContests.length > 0 && (
            <div>
              <h2 style={{fontSize:14,fontWeight:700,color:'#94a3b8',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:14,background:'#e2e8f0',borderRadius:2,display:'inline-block'}}/>
                過去のコンテスト
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {endedContests.map((c:any) => {
                  const href = c.is_site_contest ? `/contests/${c.id}` : (c.apply_url || '#')
                  return (
                    <div key={c.id} style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden',opacity:0.65}}>
                      {c.image_url && (
                        <a href={href} style={{display:'block',textDecoration:'none'}}>
                          <img src={c.image_url} alt={c.title}
                            style={{width:'100%',maxHeight:200,objectFit:'cover',display:'block'}}/>
                        </a>
                      )}
                      <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',background:'#f1f5f9',border:'1px solid #e2e8f0',padding:'2px 8px',borderRadius:8,whiteSpace:'nowrap' as const}}>終了</span>
                        <a href={href}
                          style={{fontSize:12,color:'var(--color-text-muted)',textDecoration:'none',fontWeight:600}}>
                          詳細を見る →
                        </a>
                      </div>
                    </div>
                  )
                })}
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
