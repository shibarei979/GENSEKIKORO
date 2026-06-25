import { createClient } from '@/lib/supabase/server'
export const revalidate = 10
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

const PAGE_SIZE = 50

interface Props {
  searchParams: { period?: string; type?: string; serial?: string; page?: string; genre?: string }
}

export default async function RankingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const period    = searchParams.period || 'weekly'
  const genre     = searchParams.genre  || '全て'
  const showMore  = searchParams.page === 'all'
  const novelType = searchParams.type   || '長編'
  const serial    = searchParams.serial || 'all'
  const page      = showMore ? 1 : Math.max(1, parseInt(searchParams.page || '1'))
  const displaySize = showMore ? 100 : PAGE_SIZE
  const offset    = (page - 1) * PAGE_SIZE

  async function getRanking(): Promise<{ items: any[]; total: number }> {
    const likeMap: Record<string,number> = {}
    let likeIds: string[] = []

    if (period === 'rising') {
      const { data: risingData } = await supabase.from('rising_novels').select('id, rising_score').limit(100)
      const risingIds = (risingData || []).map((r:any) => r.id)
      const scoreMap = Object.fromEntries((risingData||[]).map((r:any) => [r.id, r.rising_score]))
      if (risingIds.length === 0) return { items: [], total: 0 }
      const { data: risingNovelData } = await supabase
        .from('novels').select('id, title, genre, novel_type, is_serial, author_id, summary, catchcopy, tags')
        .in('id', risingIds).eq('published', true)
      const risingItems = (risingNovelData || [])
        .sort((a:any, b:any) => (scoreMap[b.id]||0) - (scoreMap[a.id]||0))
        .map((n:any) => ({...n, like_count: scoreMap[n.id]||0}))
      const authorIds2 = Array.from(new Set(risingItems.map((n:any) => n.author_id)))
      const authorMap2: Record<string,string> = {}
      if (authorIds2.length > 0) {
        const { data: authors2 } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds2 as string[])
        authors2?.forEach((a:any) => { authorMap2[a.user_id] = a.display_name })
      }
      return { items: risingItems.map((n:any) => ({...n, display_name: authorMap2[n.author_id]||''})), total: risingItems.length }
    } else if (period === 'daily') {
      const today = new Date(); today.setHours(0,0,0,0)
      const { data: dl } = await supabase.from('likes').select('novel_id').gte('created_at', today.toISOString())
      dl?.forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id]||0)+1 })
      likeIds = Object.entries(likeMap).sort((a,b)=>b[1]-a[1]).map(([id])=>id)
    } else {
      const viewMap: Record<string,string> = { weekly:'weekly_likes', monthly:'monthly_likes', quarterly:'quarterly_likes', yearly:'yearly_likes' }
      const { data: likes } = await supabase.from(viewMap[period]).select('novel_id, like_count').order('like_count',{ascending:false}).limit(500)
      likes?.forEach((l: any) => { likeMap[l.novel_id] = l.like_count })
      likeIds = (likes||[]).map((l: any) => l.novel_id)
    }

    if (likeIds.length === 0) return { items: [], total: 0 }

    let q = supabase.from('novels')
      .select('id, title, genre, novel_type, is_serial, author_id, summary, tags, created_at')
      .in('id', likeIds).eq('published', true).eq('is_r18', false).neq('genre', '官能')
    if (novelType !== '全て') q = (q as any).eq('novel_type', novelType)
    if (genre !== '全て') q = (q as any).eq('genre', genre)
    if (serial === 'serial')   q = (q as any).eq('is_serial', true)
    if (serial === 'complete') q = (q as any).eq('is_serial', false)
    if (serial === 'new')      q = (q as any).gte('created_at', new Date(Date.now()-30*24*60*60*1000).toISOString())
    if (serial === 'newbie') {
      const { data: newbieAuthors } = await supabase.from('novels').select('author_id').eq('published', true)
      const authorCount: Record<string,number> = {}
      newbieAuthors?.forEach((n:any) => { authorCount[n.author_id] = (authorCount[n.author_id]||0)+1 })
      const newbieIds = Object.entries(authorCount).filter(([,c])=>c<=3).map(([id])=>id)
      q = (q as any).in('author_id', newbieIds)
    }
    const { data: novels } = await q
    const sorted = (novels||[]).sort((a: any,b: any) => likeIds.indexOf(a.id) - likeIds.indexOf(b.id))
    const total  = sorted.length
    const paged  = sorted.slice(offset, offset + PAGE_SIZE)
    const authorIds = Array.from(new Set(paged.map((n: any) => n.author_id)))
    const authorMap: Record<string,string> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds as string[])
      authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
    }
    const novelIds = paged.map((n: any) => n.id)
    const charCountMap: Record<string,number> = {}
    const lastUpdateMap: Record<string,string> = {}
    if (novelIds.length > 0) {
      const { data: eps } = await supabase.from('episodes').select('novel_id, body, created_at').in('novel_id', novelIds)
      eps?.forEach((ep: any) => {
        charCountMap[ep.novel_id] = (charCountMap[ep.novel_id]||0) + (ep.body?.length||0)
        if (!lastUpdateMap[ep.novel_id] || ep.created_at > lastUpdateMap[ep.novel_id]) lastUpdateMap[ep.novel_id] = ep.created_at
      })
    }
    return {
      total,
      items: paged.map((n: any) => ({
        ...n,
        display_name:  authorMap[n.author_id]||'',
        score:         likeMap[n.id]||0,
        char_count:    charCountMap[n.id]||0,
        last_updated:  lastUpdateMap[n.id]||n.created_at,
      }))
    }
  }

  const { items: ranking, total } = await getRanking()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function fmtDate(s: string) {
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
  }
  function fmtChar(n: number) {
    if (n >= 10000) return `${Math.floor(n/1000)/10}万文字`
    return `${n.toLocaleString()}文字`
  }
  function fmtNum(n: number | undefined | null): string {
    if (!n) return '0'
    if (n >= 10000) return (Math.floor(n / 1000) / 10) + '万'
    if (n >= 1000)  return (Math.floor(n / 100)  / 10) + 'K'
    return n.toString()
  }
  function rankColor(abs: number) {
    if (abs === 0) return 'var(--color-rank-gold)'
    if (abs === 1) return 'var(--color-rank-silver)'
    if (abs === 2) return 'var(--color-rank-bronze)'
    return 'var(--color-text)'
  }
  function rankSize(abs: number) {
    if (abs === 0) return 22
    if (abs === 1) return 20
    if (abs === 2) return 18
    return 14
  }

  const periodOptions = [
    { value:'daily',     label:'日間' },
    { value:'weekly',    label:'週間' },
    { value:'monthly',   label:'月間' },
    { value:'quarterly', label:'四半期' },
    { value:'yearly',    label:'年間' },
    { value:'rising',    label:'急上昇' },
  ]
  const genres = ['全て','異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','その他']
  const typeOptions   = [{ value:'全て',label:'全て' },{ value:'長編',label:'長編' },{ value:'短編',label:'短編' }]
  const serialOptions = [{ value:'all',label:'すべて' },{ value:'serial',label:'連載中' },{ value:'complete',label:'完結' },{ value:'new',label:'新作（1ヶ月以内）' },{ value:'newbie',label:'新人作家' }]

  function buildUrl(p: string, t: string, s: string, pg = 1) {
    return `/ranking?period=${p}&type=${encodeURIComponent(t)}&serial=${s}&genre=${encodeURIComponent(genre)}&page=${pg}`
  }

  const periodLabel = periodOptions.find(o=>o.value===period)?.label||'週間'
  const scoreLabel  = period === 'rising' ? '↑' : '♡'

  const pill = (active: boolean, small = false) => ({
    padding: small ? '4px 10px' : '4px 11px',
    borderRadius: 20,
    fontSize: small ? 11 : 12,
    fontWeight: 600 as const,
    textDecoration: 'none' as const,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0 as const,
    background: active ? 'var(--color-brand)' : 'var(--color-brand-light)',
    color: active ? 'var(--color-bg-card)' : 'var(--color-brand)',
    border: `1px solid ${active ? 'var(--color-brand)' : 'var(--color-tag-border)'}`,
  })
  const pillClass = (active: boolean) => active ? 'ranking-pill ranking-pill-active' : 'ranking-pill ranking-pill-inactive'

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg-card)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div className="main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{marginBottom:12}}>
            <h1 style={{fontSize:20,fontWeight:700,color:'var(--color-text)',marginBottom:0}}>ランキング</h1>
          </div>

          <div className="ranking-filter" style={{background:'var(--color-bg)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,marginBottom:5}}>期間</div>
              <div style={{overflowX:'auto',msOverflowStyle:'none',scrollbarWidth:'none'} as any}>
                <div style={{display:'flex',gap:6,flexWrap:'nowrap'}}>
                  {periodOptions.map(o => (
                    <Link key={o.value} href={buildUrl(o.value,novelType,serial)} className={pillClass(period===o.value)} style={pill(period===o.value)}>
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,marginBottom:5}}>作品の長さ</div>
              <div style={{overflowX:'auto',msOverflowStyle:'none',scrollbarWidth:'none'} as any}>
                <div style={{display:'flex',gap:6,flexWrap:'nowrap'}}>
                  {typeOptions.map(o => (
                    <Link key={o.value} href={buildUrl(period,o.value,serial)} className={pillClass(novelType===o.value)} style={pill(novelType===o.value)}>
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,marginBottom:5}}>ジャンル</div>
              <div style={{overflowX:'auto',msOverflowStyle:'none',scrollbarWidth:'none'} as any}>
                <div style={{display:'flex',gap:5,flexWrap:'nowrap'}}>
                  {genres.map(g => (
                    <Link key={g} href={`/ranking?period=${period}&type=${encodeURIComponent(novelType)}&serial=${serial}&genre=${encodeURIComponent(g)}&page=1`}
                      className={pillClass(genre===g)} style={pill(genre===g, true)}>
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,marginBottom:5}}>絞り込み</div>
              <div style={{overflowX:'auto',msOverflowStyle:'none',scrollbarWidth:'none'} as any}>
                <div style={{display:'flex',gap:6,flexWrap:'nowrap'}}>
                  {serialOptions.map(o => (
                    <Link key={o.value} href={buildUrl(period,novelType,o.value)} className={pillClass(serial===o.value)} style={pill(serial===o.value)}>
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:15,fontWeight:700,color:'var(--color-text)'}}>{periodLabel}ランキング</span>
                <span style={{fontSize:11,color:'var(--color-text-muted)'}}>{novelType!=='全て'&&novelType}{serial==='serial'?' 連載中':serial==='complete'?' 完結':serial==='new'?' 新作':''}</span>
              </div>
              <span style={{fontSize:12,color:'var(--color-text-muted)'}}>{total}件</span>
            </div>

            {ranking.length === 0 ? (
              <div style={{padding:'48px',textAlign:'center',color:'var(--color-text-faint)',fontSize:13}}>
                該当する作品がありません
              </div>
            ) : ranking.map((n, i) => {
              const abs = offset + i
              return (
                <div key={n.id} style={{borderBottom:'1px solid var(--color-brand-light)'}}>
                  <NovelPreviewPopup novel={{...n, like_count: n.like_count||0}}>
                  <div style={{display:'flex',gap:12,padding:'12px 14px',alignItems:'flex-start',cursor:'pointer'}}>
                    <div style={{width:28,textAlign:'center',flexShrink:0,paddingTop:2}}>
                      <span style={{fontSize:rankSize(abs),fontWeight:800,color:rankColor(abs),fontFamily:"'Noto Serif JP',serif"}}>{abs+1}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                        <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 5px',borderRadius:3}}>{n.novel_type}</span>
                        {n.is_serial && <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 5px',borderRadius:3}}>連載中</span>}
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--color-text)',marginBottom:2,lineHeight:1.4}}>{n.title}</div>
                      <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:4}}>作者：{n.display_name}</div>
                      {n.summary && (
                        <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.7,marginBottom:5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>
                          {n.summary}
                        </div>
                      )}
                      {(n.tags||[]).length > 0 && (
                        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:5}}>
                          {(n.tags as string[]).slice(0,4).map((tag: string) => (
                            <span key={tag} style={{fontSize:10,background:'var(--color-bg)',color:'var(--color-text-muted)',border:'1px solid var(--color-brand-border)',padding:'1px 5px',borderRadius:3}}>#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div style={{display:'flex',gap:10,fontSize:11,color:'var(--color-text-faint)',flexWrap:'wrap'}}>
                        {n.char_count > 0 && <span>{fmtChar(n.char_count)}</span>}
                        <span>更新：{fmtDate(n.last_updated)}</span>
                        <span style={{color:'var(--color-text-muted)',fontWeight:600}}>{scoreLabel} {fmtNum(n.score)}</span>
                      </div>
                    </div>
                  </div>
                  </NovelPreviewPopup>
                </div>
              )
            })}
          </div>

          {!showMore && total > PAGE_SIZE && (
            <div style={{textAlign:'center',padding:'16px'}}>
              <Link href={`/ranking?period=${period}&type=${encodeURIComponent(novelType)}&serial=${serial}&page=all`}
                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 24px',background:'var(--color-bg)',border:'1.5px solid var(--color-brand)',borderRadius:20,fontSize:13,color:'var(--color-brand)',textDecoration:'none',fontWeight:600}}>
                もっと見る
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:20,flexWrap:'wrap'}}>
              {page > 1 && (
                <Link href={buildUrl(period,novelType,serial,page-1)}
                  style={{padding:'6px 16px',border:'1px solid var(--color-brand-border)',borderRadius:20,fontSize:13,color:'var(--color-brand)',textDecoration:'none',background:'var(--color-bg)'}}>
                  ‹ 前へ
                </Link>
              )}
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2).map((p,i,arr)=>(
                <span key={p} style={{display:'flex',alignItems:'center',gap:8}}>
                  {i>0&&arr[i-1]!==p-1&&<span style={{color:'var(--color-text-faint)'}}>…</span>}
                  <Link href={buildUrl(period,novelType,serial,p)}
                    style={{padding:'6px 14px',border:'1px solid',borderRadius:20,fontSize:13,textDecoration:'none',
                      borderColor:p===page?'var(--color-brand)':'var(--color-brand-border)',
                      background:p===page?'var(--color-brand)':'var(--color-bg-card)',
                      color:p===page?'var(--color-bg-card)':'var(--color-text-muted)',
                      fontWeight:p===page?700:400}}>
                    {p}
                  </Link>
                </span>
              ))}
              {page < totalPages && (
                <Link href={buildUrl(period,novelType,serial,page+1)}
                  style={{padding:'6px 16px',border:'1px solid var(--color-brand-border)',borderRadius:20,fontSize:13,color:'var(--color-brand)',textDecoration:'none',background:'var(--color-bg)'}}>
                  次へ ›
                </Link>
              )}
            </div>
          )}

          <div className="mobile-only" style={{height:80}}/>
        </div>
        <div className="desktop-only"><Sidebar /></div>
      </div>

      <AdBanner />
      <Footer user={user} />

      <style>{`
        @media (max-width: 768px) {
          .ranking-filter > div > div { flex-wrap: nowrap !important; }
        }
      `}</style>
    </div>
  )
}
