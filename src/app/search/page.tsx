import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import SearchForm from './SearchForm'

const PAGE_SIZE = 50

interface Props {
  searchParams: {
    q?: string; exclude?: string; genre?: string; type?: string
    serial?: string; tag?: string; sort?: string; page?: string
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const q        = searchParams.q       || ''
  const exclude  = searchParams.exclude || ''
  const genre    = searchParams.genre   || ''
  const type     = searchParams.type    || ''
  const serial   = searchParams.serial  || ''
  const tagParam = searchParams.tag     || ''
  const sort     = searchParams.sort    || 'new'
  const page     = Number(searchParams.page || 1)
  const offset   = (page - 1) * PAGE_SIZE
  const tags     = tagParam ? tagParam.split(',').filter(Boolean) : []
  const hasSearch = !!(q || exclude || genre || type || serial || tags.length > 0)

  const isAgeVerified = profile?.age_verified || false

  let results: any[] = []
  let count = 0

  if (!hasSearch) {
    let q2 = supabase.from('novels')
      .select('id, title, summary, genre, tags, novel_type, is_serial, author_id, created_at, updated_at, is_r18', { count: 'exact' })
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(200)
    if (!user || !isAgeVerified) {
      q2 = (q2 as any).eq('is_r18', false).neq('genre', '官能')
    }
    const { data: allData, count: allCount } = await q2
    const shuffled = [...(allData || [])].sort(() => Math.random() - 0.5)
    results = shuffled.slice(0, PAGE_SIZE)
    count = allCount || 0
  } else {
    let query = supabase.from('novels')
      .select('id, title, summary, genre, tags, novel_type, is_serial, author_id, created_at, updated_at, is_r18', { count: 'exact' })
      .eq('published', true)

    if (!user || !isAgeVerified) {
      query = (query as any).eq('is_r18', false).neq('genre', '官能')
    }
    if (q)      query = (query as any).ilike('title', `%${q}%`)
    if (exclude) query = (query as any).not('title', 'ilike', `%${exclude}%`)
    if (genre)  query = (query as any).eq('genre', genre)
    if (type)   query = (query as any).eq('novel_type', type)
    if (serial === 'serial')   query = (query as any).eq('is_serial', true)
    if (serial === 'complete') query = (query as any).eq('is_serial', false)
    if (serial === 'new')      query = (query as any).gte('created_at', new Date(Date.now()-30*24*60*60*1000).toISOString())
    if (tags.length > 0) {
      for (const tag of tags) {
        query = (query as any).contains('tags', [tag])
      }
    }
    query = (query as any).order('created_at', { ascending: false })

    const { data, count: c2 } = await (query as any).range(offset, offset + PAGE_SIZE - 1)
    results = data || []
    count = c2 || 0
  }

  const charCountMap: Record<string, number> = {}
  if (results.length > 0) {
    const rIds = results.map((n: any) => n.id)
    const { data: epData } = await supabase.from('episodes').select('novel_id, body').in('novel_id', rIds)
    epData?.forEach((ep: any) => {
      charCountMap[ep.novel_id] = (charCountMap[ep.novel_id] || 0) + (ep.body?.length || 0)
    })
  }

  const authorIds = Array.from(new Set((results).map((n: any) => n.author_id)))
  const authorMap: Record<string, string> = {}
  if (authorIds.length > 0) {
    const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds as string[])
    authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
  }

  const novelIds = (results).map((n: any) => n.id)
  const likeMap: Record<string, number> = {}
  if (novelIds.length > 0) {
    const { data: likes } = await supabase.from('likes').select('novel_id').in('novel_id', novelIds)
    likes?.forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id] || 0) + 1 })
  }

  const novels = results.map((n: any) => ({
    ...n,
    display_name: authorMap[n.author_id] || '',
    likeCount: likeMap[n.id] || 0,
    charCount: charCountMap[n.id] || 0,
  }))

  function fmtNum(n: number | undefined | null): string {
    if (!n) return '0'
    if (n >= 10000) return (Math.floor(n / 1000) / 10) + '万'
    if (n >= 1000)  return (Math.floor(n / 100)  / 10) + 'K'
    return n.toString()
  }

  function buildUrl(params: Record<string, string>) {
    const base: Record<string, string> = {}
    if (q)       base.q = q
    if (exclude) base.exclude = exclude
    if (genre)   base.genre = genre
    if (type)    base.type = type
    if (serial)  base.serial = serial
    if (tagParam) base.tag = tagParam
    if (sort)    base.sort = sort
    Object.assign(base, params)
    const qs = Object.entries(base).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
    return `/search${qs ? '?' + qs : ''}`
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>

          <SearchForm
            defaultQ={q} defaultExclude={exclude} defaultGenre={genre}
            defaultType={type} defaultSerial={serial} defaultTag={tagParam}
            defaultSort={sort} ageVerified={isAgeVerified}
          />

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,fontSize:13,color:'#77706A'}}>
            {hasSearch
              ? <span>検索結果：<strong style={{color:'#2B211B'}}>{fmtNum(count)}作品</strong></span>
              : <span style={{color:'#77706A'}}>ランダム表示中</span>
            }
          </div>

          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
            {novels.length === 0 ? (
              <div style={{padding:'60px',textAlign:'center',color:'#B8AEA8'}}>
                <div style={{fontSize:14,marginBottom:8}}>作品が見つかりませんでした</div>
                <div style={{fontSize:12}}>検索条件を変えてお試しください</div>
              </div>
            ) : novels.map((n: any, idx: number) => (
              <Link key={n.id} href={`/novel/${n.id}`} style={{textDecoration:'none',color:'inherit',display:'block',padding:'16px 20px',borderBottom:idx<novels.length-1?'1px solid #FFF1E6':'none'}}>
                <span style={{display:'flex',gap:5,marginBottom:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
                  <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{n.novel_type}</span>
                  {n.is_serial
                    ? <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>
                    : <span style={{fontSize:10,background:'#f5f5f5',color:'#757575',border:'1px solid #e0e0e0',padding:'1px 6px',borderRadius:3}}>完結</span>}
                  {n.is_r18 && <span style={{fontSize:10,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',padding:'1px 6px',borderRadius:3}}>R18</span>}
                </span>
                <span style={{display:'block',fontSize:17,fontWeight:700,color:'#2B211B',marginBottom:4,lineHeight:1.4}}>{n.title}</span>
                <span style={{display:'block',fontSize:12,color:'#77706A',marginBottom:6}}>作者：{n.display_name}</span>
                {n.summary && (
                  <span style={{display:'block',fontSize:12,color:'#5a3a20',lineHeight:1.7,marginBottom:7,overflow:'hidden',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>
                    {n.summary}
                  </span>
                )}
                {(n.tags||[]).length > 0 && (
                  <span style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:7}}>
                    {(n.tags as string[]).map((t: string) => (
                      <span key={t} style={{fontSize:10,background:'#FFF9F2',color:'#77706A',border:'1px solid #F0D9C9',padding:'1px 6px',borderRadius:3}}>#{t}</span>
                    ))}
                  </span>
                )}
                <span style={{display:'flex',gap:12,fontSize:11,color:'#B8AEA8',flexWrap:'wrap'}}>
                  {n.charCount > 0 && <span>{n.charCount >= 10000 ? `${(n.charCount/10000).toFixed(1)}万文字` : `${n.charCount.toLocaleString()}文字`}</span>}
                  {n.updated_at && <span>最終更新：{new Date(n.updated_at).toLocaleDateString('ja-JP',{year:'numeric',month:'numeric',day:'numeric'})}</span>}
                  {n.likeCount > 0 && <span style={{color:'#77706A',fontWeight:600}}>♡ {fmtNum(n.likeCount)}</span>}
                </span>
              </Link>
            ))}
          </div>

          {hasSearch && totalPages > 1 && (
            <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:20}}>
              {page > 1 && (
                <Link href={buildUrl({page: String(page-1)})}
                  style={{padding:'6px 16px',border:'1px solid #F0D9C9',borderRadius:16,fontSize:12,color:'#F26A21',textDecoration:'none',background:'#FFF9F2'}}>
                  ‹ 前へ
                </Link>
              )}
              <span style={{padding:'6px 12px',fontSize:12,color:'#77706A'}}>{page} / {totalPages}</span>
              {page < totalPages && (
                <Link href={buildUrl({page: String(page+1)})}
                  style={{padding:'6px 16px',border:'1px solid #F0D9C9',borderRadius:16,fontSize:12,color:'#F26A21',textDecoration:'none',background:'#FFF9F2'}}>
                  次へ ›
                </Link>
              )}
            </div>
          )}
        </div>

        <Sidebar />
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
