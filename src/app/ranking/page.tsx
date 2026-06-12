import { createClient } from '@/lib/supabase/server'
export const revalidate = 300 // 5分キャッシュ
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

const PAGE_SIZE = 50

interface Props {
  searchParams: { period?: string; type?: string; serial?: string; page?: string }
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
  const showMore  = searchParams.page === 'all'
  const novelType = searchParams.type   || '長編'
  const serial    = searchParams.serial || 'all'
  const page      = showMore ? 1 : Math.max(1, parseInt(searchParams.page || '1'))
  const displaySize = showMore ? 100 : PAGE_SIZE
  const offset    = (page - 1) * PAGE_SIZE

  async function getRanking(): Promise<{ items: any[]; total: number }> {
    const likeMap: Record<string,number> = {}
    let likeIds: string[] = []

    if (period === 'newbie') {
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: newAuthors } = await supabase.from('novels')
        .select('author_id, created_at')
        .eq('published', true)
        .gte('created_at', since30)
      const newAuthorIds = Array.from(new Set((newAuthors||[]).map((n: any) => n.author_id)))
      if (newAuthorIds.length === 0) return { items: [], total: 0 }

      const { data: newNovels } = await supabase.from('novels')
        .select('id, title, genre, novel_type, is_serial, author_id, summary, tags, created_at')
        .in('author_id', newAuthorIds as string[])
        .eq('published', true).eq('is_r18', false).neq('genre', '官能')
      const novelIds2 = (newNovels||[]).map((n: any) => n.id)
      const { data: likes2 } = await supabase.from('likes').select('novel_id').in('novel_id', novelIds2)
      const lm2: Record<string,number> = {}
      likes2?.forEach((l: any) => { lm2[l.novel_id] = (lm2[l.novel_id]||0)+1 })
      const sorted2 = (newNovels||[]).sort((a: any,b: any) => (lm2[b.id]||0)-(lm2[a.id]||0))
      const total2 = sorted2.length
      const paginated2 = showMore ? sorted2 : sorted2.slice(0, PAGE_SIZE)
      const aIds2 = Array.from(new Set(paginated2.map((n: any) => n.author_id)))
      const aMap2: Record<string,string> = {}
      if (aIds2.length > 0) {
        const { data: auths2 } = await supabase.from('profiles').select('user_id, display_name').in('user_id', aIds2 as string[])
        auths2?.forEach((a: any) => { aMap2[a.user_id] = a.display_name })
      }
      return { items: paginated2.map((n: any) => ({ ...n, display_name: aMap2[n.author_id]||'', likeCount: lm2[n.id]||0 })), total: total2 }
    } else if (period === 'discover') {
      const { data: discData } = await supabase.from('discovers').select('novel_id').eq('is_pending', false)
      discData?.forEach((d: any) => { likeMap[d.novel_id] = (likeMap[d.novel_id]||0)+1 })
      likeIds = Object.entries(likeMap).sort((a,b)=>b[1]-a[1]).map(([id])=>id)
    } else if (period === 'daily') {
      const today = new Date(); today.setHours(0,0,0,0)
      const { data: dl } = await supabase.from('likes').select('novel_id').gte('created_at', today.toISOString())
      dl?.forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id]||0)+1 })
      likeIds = Object.entries(likeMap).sort((a,b)=>b[1]-a[1]).map(([id])=>id)
    } else {
      const viewMap: Record<string,string> = { weekly:'weekly_likes', monthly:'monthly_likes', yearly:'yearly_likes' }
      const { data: likes } = await supabase.from(viewMap[period]).select('novel_id, like_count').order('like_count',{ascending:false}).limit(500)
      likes?.forEach((l: any) => { likeMap[l.novel_id] = l.like_count })
      likeIds = (likes||[]).map((l: any) => l.novel_id)
    }

    if (likeIds.length === 0) return { items: [], total: 0 }

    let q = supabase.from('novels')
      .select('id, title, genre, novel_type, is_serial, author_id, summary, tags, created_at')
      .in('id', likeIds).eq('published', true).eq('is_r18', false).neq('genre', '官能')
    if (novelType !== '全て') q = (q as any).eq('novel_type', novelType)
    if (serial === 'serial')   q = (q as any).eq('is_serial', true)
    if (serial === 'complete') q = (q as any).eq('is_serial', false)
    if (serial === 'new')      q = (q as any).gte('created_at', new Date(Date.now()-30*24*60*60*1000).toISOString())
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
    if (abs === 0) return '#F26A21'
    if (abs === 1) return '#9ca3af'
    if (abs === 2) return '#cd7f32'
    return '#2B211B'
  }
  function rankSize(abs: number) {
    if (abs === 0) return 22
    if (abs === 1) return 20
    if (abs === 2) return 18
    return 14
  }

  const periodOptions = [
    { value:'daily',    label:'日間' },
    { value:'weekly',   label:'週間' },
    { value:'monthly',  label:'月間' },
    { value:'yearly',   label:'年間' },
    { value:'newbie',   label:'新人' },
    { value:'discover', label:'拡散' },
  ]
  const typeOptions   = [{ value:'全て',label:'全て' },{ value:'長編',label:'長編' },{ value:'短編',label:'短編' }]
  const serialOptions = [{ value:'all',label:'すべて' },{ value:'serial',label:'連載中' },{ value:'complete',label:'完結' },{ value:'new',label:'新作（1ヶ月以内）' }]

  function buildUrl(p: string, t: string, s: string, pg = 1) {
    return `/ranking?period=${p}&type=${encodeURIComponent(t)}&serial=${s}&page=${pg}`
  }

  const periodLabel = periodOptions.find(o=>o.value===period)?.label||'週間'
  const scoreLabel  = period === 'discover' ? '⛏' : '♡'

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div className="main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{marginBottom:16}}>
            <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',marginBottom:4}}>ランキング</h1>
          </div>

          {/* フィルターバー */}
          <div className="ranking-filter" style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'14px 18px',marginBottom:16}}>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:5}}>期間</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {periodOptions.map(o => (
                  <Link key={o.value} href={buildUrl(o.value,novelType,serial)}
                    style={{padding:'4px 11px',borderRadius:20,fontSize:12,fontWeight:600,textDecoration:'none',
                      background:period===o.value?'#F26A21':'#FFF1E6',
                      color:period===o.value?'#fff':'#F26A21',
                      border:`1px solid ${period===o.value?'#F26A21':'#f5b080'}`}}>
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:5}}>作品の長さ</div>
              <div style={{display:'flex',gap:6}}>
                {typeOptions.map(o => (
                  <Link key={o.value} href={buildUrl(period,o.value,serial)}
                    style={{padding:'4px 11px',borderRadius:20,fontSize:12,fontWeight:600,textDecoration:'none',
                      background:novelType===o.value?'#F26A21':'#FFF1E6',
                      color:novelType===o.value?'#fff':'#F26A21',
                      border:`1px solid ${novelType===o.value?'#F26A21':'#f5b080'}`}}>
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:5}}>絞り込み</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {serialOptions.map(o => (
                  <Link key={o.value} href={buildUrl(period,novelType,o.value)}
                    style={{padding:'4px 11px',borderRadius:20,fontSize:12,fontWeight:600,textDecoration:'none',
                      background:serial===o.value?'#F26A21':'#FFF1E6',
                      color:serial===o.value?'#fff':'#F26A21',
                      border:`1px solid ${serial===o.value?'#F26A21':'#f5b080'}`}}>
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ランキング本体 */}
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16,fontWeight:700,color:'#2B211B'}}>{periodLabel}ランキング</span>
                <span style={{fontSize:11,color:'#77706A'}}>{novelType!=='全て'&&novelType}{serial==='serial'?' 連載中':serial==='complete'?' 完結':serial==='new'?' 新作':''}</span>
              </div>
              <span style={{fontSize:12,color:'#77706A'}}>{total}件</span>
            </div>

            {ranking.length === 0 ? (
              <div style={{padding:'48px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
                該当する作品がありません
              </div>
            ) : ranking.map((n, i) => {
              const abs = offset + i
              return (
                <div key={n.id} style={{borderBottom:'1px solid #FFF1E6'}}>
                  <NovelPreviewPopup novel={{...n, like_count: n.like_count||0}}>
                  <div style={{display:'flex',gap:14,padding:'16px 20px',alignItems:'flex-start',cursor:'pointer'}}>
                    <div style={{width:32,textAlign:'center',flexShrink:0,paddingTop:2}}>
                      <span style={{fontSize:rankSize(abs),fontWeight:800,color:rankColor(abs),fontFamily:"'Noto Serif JP',serif"}}>{abs+1}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
                        <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{n.novel_type}</span>
                        {n.is_serial && <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>}
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:3,lineHeight:1.4}}>{n.title}</div>
                      <div style={{fontSize:12,color:'#77706A',marginBottom:6}}>作者：{n.display_name}</div>
                      {n.summary && (
                        <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.7,marginBottom:7,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:6,WebkitBoxOrient:'vertical' as any}}>
                          {n.summary}
                        </div>
                      )}
                      {(n.tags||[]).length > 0 && (
                        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:7}}>
                          {(n.tags as string[]).map((tag: string) => (
                            <span key={tag} style={{fontSize:10,background:'#FFF9F2',color:'#77706A',border:'1px solid #F0D9C9',padding:'1px 6px',borderRadius:3}}>#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div style={{display:'flex',gap:12,fontSize:11,color:'#B8AEA8'}}>
                        {n.char_count > 0 && <span>{fmtChar(n.char_count)}</span>}
                        <span>最終更新：{fmtDate(n.last_updated)}</span>
                        <span style={{color:'#77706A',fontWeight:600}}>{scoreLabel} {fmtNum(n.score)}</span>
                      </div>
                    </div>
                  </div>
                  </NovelPreviewPopup>
                </div>
              )
            })}
          </div>

          {/* もっと見る */}
          {!showMore && total > PAGE_SIZE && (
            <div style={{textAlign:'center',padding:'16px'}}>
              <Link href={`/ranking?period=${period}&type=${encodeURIComponent(novelType)}&serial=${serial}&page=all`}
                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 24px',background:'#FFF9F2',border:'1.5px solid #F26A21',borderRadius:20,fontSize:13,color:'#F26A21',textDecoration:'none',fontWeight:600}}>
                もっと見る
              </Link>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:20,flexWrap:'wrap'}}>
              {page > 1 && (
                <Link href={buildUrl(period,novelType,serial,page-1)}
                  style={{padding:'6px 16px',border:'1px solid #F0D9C9',borderRadius:20,fontSize:13,color:'#F26A21',textDecoration:'none',background:'#FFF9F2'}}>
                  ‹ 前へ
                </Link>
              )}
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2).map((p,i,arr)=>(
                <span key={p} style={{display:'flex',alignItems:'center',gap:8}}>
                  {i>0&&arr[i-1]!==p-1&&<span style={{color:'#B8AEA8'}}>…</span>}
                  <Link href={buildUrl(period,novelType,serial,p)}
                    style={{padding:'6px 14px',border:'1px solid',borderRadius:20,fontSize:13,textDecoration:'none',
                      borderColor:p===page?'#F26A21':'#F0D9C9',
                      background:p===page?'#F26A21':'#fff',
                      color:p===page?'#fff':'#77706A',
                      fontWeight:p===page?700:400}}>
                    {p}
                  </Link>
                </span>
              ))}
              {page < totalPages && (
                <Link href={buildUrl(period,novelType,serial,page+1)}
                  style={{padding:'6px 16px',border:'1px solid #F0D9C9',borderRadius:20,fontSize:13,color:'#F26A21',textDecoration:'none',background:'#FFF9F2'}}>
                  次へ ›
                </Link>
              )}
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
