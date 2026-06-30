import { createClient } from '@/lib/supabase/server'
export const revalidate = 10

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: novel } = await supabase
    .from('novels').select('title, summary').eq('id', params.id).maybeSingle()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://genseki-koro.vercel.app'
  return {
    title: novel?.title ? `${novel.title} | 原石航路` : '原石航路',
    description: novel?.summary || 'ライトノベル投稿サイト「原石航路」',
    openGraph: {
      title: novel?.title || '原石航路',
      description: novel?.summary || 'ライトノベル投稿サイト「原石航路」',
      images: [`${siteUrl}/og-image.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: novel?.title || '原石航路',
      description: novel?.summary || 'ライトノベル投稿サイト「原石航路」',
      images: [`${siteUrl}/og-image.png`],
    },
  }
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import NovelActions from './NovelActions'
import NovelCommentSection from './NovelCommentSection'
import FollowButton from '@/components/FollowButton'
import ChapterAccordion from './ChapterAccordion'

export default async function NovelPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: novel, error: novelError } = await supabase
    .from('novels')
    .select('id, title, summary, genre, tags, is_serial, published, views, author_id, created_at, novel_type, official_tags')
    .eq('id', params.id).maybeSingle()

  if (!novel || novelError) notFound()

  const { data: authorProfile } = await supabase
    .from('profiles').select('display_name, user_id')
    .eq('user_id', novel.author_id).maybeSingle()

  // シリーズ情報取得
  const { data: seriesNovelData } = await supabase
    .from('series_novels').select('series_id').eq('novel_id', params.id).maybeSingle()
  let seriesNovels: any[] = []
  let seriesTitle = ''
  if (seriesNovelData?.series_id) {
    const { data: seriesData } = await supabase.from('series').select('title').eq('id', seriesNovelData.series_id).single()
    seriesTitle = seriesData?.title || ''
    const { data: sn } = await supabase
      .from('series_novels')
      .select('order_num, novels(id, title, genre)')
      .eq('series_id', seriesNovelData.series_id)
      .order('order_num')
    seriesNovels = (sn || []).map((s: any) => ({ ...s.novels, order_num: s.order_num }))
  }

  const isAuthor = user?.id === novel.author_id

  const { data: rawEpisodes } = await supabase
    .from('episodes').select('id, title, ep_number, created_at, illust_url, chapter_id, published, scheduled_at')
    .eq('novel_id', params.id).order('ep_number', { ascending: true })

  const nowMs = Date.now()
  const toPublish = (rawEpisodes || []).filter(ep =>
    ep.published === false && ep.scheduled_at && new Date(ep.scheduled_at).getTime() <= nowMs
  )
  if (toPublish.length > 0) {
    await supabase.from('episodes')
      .update({ published: true, scheduled_at: null })
      .in('id', toPublish.map(ep => ep.id))
    toPublish.forEach(ep => { ep.published = true; ep.scheduled_at = null })
    if (novel.published === false) {
      await supabase.from('novels').update({ published: true }).eq('id', novel.id)
    }
  }

  const episodes = isAuthor ? rawEpisodes : (rawEpisodes || []).filter(ep => ep.published !== false)

  const upcomingEpisode = (rawEpisodes || [])
    .filter(ep => ep.published === false && ep.scheduled_at && new Date(ep.scheduled_at).getTime() > nowMs)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0] || null

  const { data: chapters } = await supabase
    .from('novel_chapters').select('id, title, order_num')
    .eq('novel_id', params.id).order('order_num', { ascending: true })

  const epIds = (episodes || []).map(e => e.id)
  let epLikeCounts: Record<string,number>    = {}
  let epCommentCounts: Record<string,number> = {}
  let readEpisodeIds = new Set<string>()

  if (epIds.length > 0) {
    const [elData, ecData] = await Promise.all([
      supabase.from('episode_likes').select('episode_id').in('episode_id', epIds),
      supabase.from('comments').select('episode_id').in('episode_id', epIds).not('episode_id','is',null),
    ])
    elData.data?.forEach((el: any) => { epLikeCounts[el.episode_id] = (epLikeCounts[el.episode_id] || 0) + 1 })
    ecData.data?.forEach((ec: any) => { if (ec.episode_id) epCommentCounts[ec.episode_id] = (epCommentCounts[ec.episode_id] || 0) + 1 })
    if (user) {
      const { data: readData } = await supabase
        .from('read_episodes').select('episode_id')
        .eq('user_id', user.id).in('episode_id', epIds)
      readData?.forEach((r: any) => readEpisodeIds.add(r.episode_id))
    }
  }

  const { count: likeCount }     = await supabase.from('likes').select('*',{count:'exact',head:true}).eq('novel_id', params.id)
  const { data: viewData }       = await supabase.from('novel_views').select('view_count').eq('novel_id', params.id).maybeSingle()
  const viewCount                = viewData?.view_count || 0
  const { count: discoverCount } = await supabase.from('discovers').select('*',{count:'exact',head:true}).eq('novel_id', params.id).eq('is_pending', false)
  const { count: bookmarkCount } = await supabase.from('bookmarks').select('*',{count:'exact',head:true}).eq('novel_id', params.id)

  let liked = false, discovered = false, bookmarked = false
  if (user) {
    const [l, d, b] = await Promise.all([
      supabase.from('likes').select('user_id').eq('novel_id', params.id).eq('user_id', user.id).maybeSingle(),
      supabase.from('discovers').select('user_id').eq('novel_id', params.id).eq('user_id', user.id).maybeSingle(),
      supabase.from('bookmarks').select('user_id').eq('novel_id', params.id).eq('user_id', user.id).maybeSingle(),
    ])
    liked      = !!l.data
    discovered = !!d.data
    bookmarked = !!b.data
  }

  const author = authorProfile as any

  let isFollowing = false
  let followerCount = 0
  if (author?.user_id) {
    const [{ count: fc }, followData] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', author.user_id),
      user ? supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', author.user_id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    followerCount = fc || 0
    isFollowing = !!followData.data
  }

  const { data: discoverComments } = await supabase
    .from('discovers').select('id, comment, display_name, created_at, user_id')
    .eq('novel_id', params.id).not('comment', 'is', null).eq('is_pending', false)
    .order('created_at', { ascending: false }).limit(5)

  const { data: rawNovelComments } = await supabase
    .from('comments').select('id, body, created_at, user_id, is_pinned, profiles(display_name, icon_url)')
    .eq('novel_id', params.id).order('created_at', { ascending: false }).limit(50)

  const novelCommentIds = (rawNovelComments || []).map((c: any) => c.id)
  let novelCommentLikes: Record<string, number> = {}
  if (novelCommentIds.length > 0) {
    const { data: clData } = await supabase.from('comment_likes').select('comment_id').in('comment_id', novelCommentIds)
    clData?.forEach((cl: any) => { novelCommentLikes[cl.comment_id] = (novelCommentLikes[cl.comment_id] || 0) + 1 })
  }
  const novelComments = (rawNovelComments || []).map((c: any) => ({
    id: c.id, body: c.body, created_at: c.created_at, user_id: c.user_id,
    display_name: (c.profiles as any)?.display_name || '名無し',
    icon_url: (c.profiles as any)?.icon_url || '',
    like_count: novelCommentLikes[c.id] || 0,
    is_pinned: c.is_pinned || false,
  }))

  // シリーズ内の作品IDを収集
  const seriesNovelIds = new Set(seriesNovels.map((n: any) => n.id))

  // ===== おすすめ作品（パーソナライズ） =====
  let readNovelIds = new Set<string>([params.id, ...Array.from(seriesNovelIds)])
  let historyGenres: string[] = []
  let historyTags: string[] = []
  let historyAuthorIds: string[] = []

  if (user) {
    // 閲覧履歴から好みを抽出
    const { data: historyData } = await supabase
      .from('page_views')
      .select('novel_id, novels(genre, tags, author_id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    for (const h of (historyData || [])) {
      const n = (h as any).novels
      if (!n) continue
      readNovelIds.add(h.novel_id)
      if (n.genre) historyGenres.push(n.genre)
      if (n.tags) historyTags.push(...n.tags)
      if (n.author_id) historyAuthorIds.push(n.author_id)
    }
  }

  // 未ログイン：前半・後半ともランダムジャンルで表示
  const allGenresList = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','その他']
  const isLoggedIn = !!user

  // 頻出ジャンル・タグ・作者を集計
  const genreFreq: Record<string,number> = {}
  historyGenres.forEach(g => { genreFreq[g] = (genreFreq[g]||0)+1 })
  const tagFreq: Record<string,number> = {}
  historyTags.forEach(t => { tagFreq[t] = (tagFreq[t]||0)+1 })
  const topGenres = Object.entries(genreFreq).sort((a,b)=>b[1]-a[1]).map(([g])=>g)
  const topTags   = Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t])=>t)
  const topAuthors = historyAuthorIds.filter((v, i, a) => a.indexOf(v) === i).slice(0,3)

  // フォールバック用：ジャンル不問で全作品取得（必ず6件確保するため）
  const { data: fallbackRaw } = await supabase
    .from('novels')
    .select('id, title, genre, novel_type, is_serial, author_id, summary, originality_score')
    .eq('published', true).neq('id', params.id)
    .order('created_at', { ascending: false })
    .limit(30)
  const fallbackPool = (fallbackRaw || []).filter((n: any) => !readNovelIds.has(n.id))

  // 前半：パーソナライズ or ランダム（3件）
  let scored: any[] = []
  if (isLoggedIn && topGenres.length > 0) {
    const preferGenre = topGenres[0]
    const { data: personalizedRaw } = await supabase
      .from('novels')
      .select('id, title, genre, novel_type, is_serial, author_id, summary, tags, originality_score')
      .eq('published', true).eq('genre', preferGenre)
      .order('created_at', { ascending: false })
      .limit(20)
    scored = (personalizedRaw || [])
      .filter((n: any) => !readNovelIds.has(n.id))
      .map((n: any) => {
        let score = 0
        if (topAuthors.includes(n.author_id)) score += 3
        const matchTags = (n.tags || []).filter((t: string) => topTags.includes(t)).length
        score += matchTags * 2
        score += (n.originality_score || 50) / 20  // 独創性スコアを加味（最大5点）
        return { ...n, score }
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3)
  } else {
    scored = fallbackPool.slice(0, 3)
  }

  // 後半：ディスカバリー or ランダム（3件）
  const scoredIds = new Set(scored.map((n: any) => n.id))
  let discovery: any[] = []
  if (isLoggedIn) {
    const unusedGenres = allGenresList.filter(g => !topGenres.slice(0,3).includes(g) && g !== novel.genre)
    const discoveryGenre = unusedGenres.length > 0
      ? unusedGenres[Math.floor(Math.random() * unusedGenres.length)]
      : allGenresList[Math.floor(Math.random() * allGenresList.length)]
    const { data: discoveryRaw } = await supabase
      .from('novels')
      .select('id, title, genre, novel_type, is_serial, author_id, summary, originality_score')
      .eq('published', true).eq('genre', discoveryGenre)
      .order('created_at', { ascending: false })
      .limit(10)
    discovery = (discoveryRaw || [])
      .filter((n: any) => !readNovelIds.has(n.id) && !scoredIds.has(n.id))
      .slice(0, 3)
  } else {
    discovery = fallbackPool.filter((n: any) => !scoredIds.has(n.id)).slice(0, 3)
  }

  // 不足分はfallbackで補填して必ず6件に
  let recommendedNovels = [...scored, ...discovery]
  if (recommendedNovels.length < 6) {
    const existingIds = new Set(recommendedNovels.map((n: any) => n.id))
    const extras = fallbackPool.filter((n: any) => !existingIds.has(n.id))
    recommendedNovels = [...recommendedNovels, ...extras].slice(0, 6)
  }
  // おすすめ作品のいいね数を取得
  const recNovelIds = recommendedNovels.map((n: any) => n.id)
  const recLikeMap: Record<string, number> = {}
  const recDiscoverMap: Record<string, number> = {}
  const recEpCountMap: Record<string, number> = {}
  if (recNovelIds.length > 0) {
    const [{ data: recLikes }, { data: recDiscovers }, { data: recEpisodes }] = await Promise.all([
      supabase.from('likes').select('novel_id').in('novel_id', recNovelIds),
      supabase.from('discovers').select('novel_id').eq('is_pending', false).in('novel_id', recNovelIds),
      supabase.from('episodes').select('novel_id').in('novel_id', recNovelIds).eq('published', true),
    ])
    recLikes?.forEach((l: any) => { recLikeMap[l.novel_id] = (recLikeMap[l.novel_id] || 0) + 1 })
    recDiscovers?.forEach((d: any) => { recDiscoverMap[d.novel_id] = (recDiscoverMap[d.novel_id] || 0) + 1 })
    recEpisodes?.forEach((e: any) => { recEpCountMap[e.novel_id] = (recEpCountMap[e.novel_id] || 0) + 1 })
  }

  // 総合スコアで再ソート（独創性50% + いいね30% + 拡散20% + 新着ブースト + 更新ブースト）
  const maxLikes = Math.max(1, ...Object.values(recLikeMap))
  const maxDiscovers = Math.max(1, ...Object.values(recDiscoverMap))
  const now48 = Date.now() - 48 * 60 * 60 * 1000
  recommendedNovels = recommendedNovels.map((n: any) => {
    const originality = (n.originality_score || 50) / 100
    const likeNorm = (recLikeMap[n.id] || 0) / maxLikes
    const discoverNorm = (recDiscoverMap[n.id] || 0) / maxDiscovers
    // 投稿から48時間以内はブースト（+0.3）
    const isNew = new Date(n.created_at).getTime() > now48
    const newBoost = isNew ? 0.3 : 0
    // 3話目まで更新ブースト（+0.15）
    const epCount = recEpCountMap[n.id] || 0
    const updateBoost = epCount > 0 && epCount <= 3 ? 0.15 : 0
    const finalScore = originality * 0.5 + likeNorm * 0.3 + discoverNorm * 0.2 + newBoost + updateBoost
    return { ...n, finalScore, isNew }
  }).sort((a: any, b: any) => b.finalScore - a.finalScore)

  const recAuthorIds = Array.from(new Set(recommendedNovels.map((n: any) => n.author_id)))
  const recAuthorMap: Record<string,string> = {}
  if (recAuthorIds.length > 0) {
    const { data: recAuthors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', recAuthorIds as string[])
    recAuthors?.forEach((a: any) => { recAuthorMap[a.user_id] = a.display_name })
  }

  function fmtNum(n: number): string {
    if (n >= 10000) return (Math.floor(n / 1000) / 10) + '万'
    if (n >= 1000) return (Math.floor(n / 100) / 10) + 'K'
    return n.toString()
  }

  function fmtDate(d: string) {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`
  }

  const readCount  = readEpisodeIds.size
  const totalCount = episodes?.length ?? 0

  const allEpisodes = episodes || []
  const hasChapters = (chapters || []).length > 0
  const unassignedEpisodes = allEpisodes.filter(ep => !ep.chapter_id)
  const chapterGroups = (chapters || []).map(ch => ({
    chapter: ch,
    episodes: allEpisodes.filter(ep => ep.chapter_id === ch.id),
  })).filter(g => g.episodes.length > 0)

  function EpisodeRow({ ep }: { ep: any }) {
    const isReadEp = readEpisodeIds.has(ep.id)
    const isScheduled = isAuthor && ep.published === false && ep.scheduled_at
    return (
      <Link href={`/novel/${params.id}/episode/${ep.id}`} style={{textDecoration:'none',display:'block'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderBottom:'1px solid var(--color-brand-light)',background: isReadEp ? '#e5e7eb' : 'var(--color-bg-card)'}}>
          {ep.illust_url && (
            <img src={ep.illust_url} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:4,flexShrink:0}}/>
          )}
          <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:5}}>
            {isReadEp && <span style={{fontSize:10,color:'var(--color-success)',fontWeight:700,flexShrink:0}}>✓</span>}
            <span style={{fontSize:13,fontWeight:500,color: isReadEp ? '#4b5563' : 'var(--color-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ep.title}</span>
            {isScheduled && (
              <span style={{fontSize:9,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 7px',borderRadius:10,flexShrink:0,whiteSpace:'nowrap'}}>
                予約 {new Date(ep.scheduled_at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
              </span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            {epLikeCounts[ep.id] > 0 && <span style={{fontSize:10,color:'var(--color-text-muted)'}}>♡ {fmtNum(epLikeCounts[ep.id])}</span>}
            {epCommentCounts[ep.id] > 0 && <span style={{fontSize:10,color:'var(--color-text-muted)'}}>💬 {fmtNum(epCommentCounts[ep.id])}</span>}
            <span style={{fontSize:10,color:'var(--color-text-faint)'}}>{fmtDate(ep.created_at)}</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg-card)'}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>

          <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:12,display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Link href="/" style={{color:'var(--color-brand)',textDecoration:'none'}}>ホーム</Link>
            <span>›</span>
            <Link href={`/genre/${encodeURIComponent(novel.genre)}`} style={{color:'var(--color-brand)',textDecoration:'none'}}>{novel.genre}</Link>
            <span>›</span>
            <span style={{color:'var(--color-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth: '60vw'}}>{novel.title}</span>
          </div>

          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'16px',marginBottom:14}}>
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'2px 8px',borderRadius:4}}>{novel.genre}</span>
              <span style={{fontSize:10,background:novel.is_serial?'#e8f5e9':'#f5f5f5',color:novel.is_serial?'#2e7d32':'#757575',border:`1px solid ${novel.is_serial?'#a5d6a7':'#e0e0e0'}`,padding:'2px 8px',borderRadius:4}}>
                {novel.is_serial?'連載中':'完結'}
              </span>
              {novel.novel_type && (
                <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'2px 8px',borderRadius:4}}>{novel.novel_type}</span>
              )}
              {(novel.official_tags||[]).map((tag:string) => (
                <span key={tag} style={{fontSize:10,background:'#fef9c3',color:'#854d0e',border:'1px solid #fde047',padding:'2px 8px',borderRadius:4,fontWeight:700}}>
                  {tag}
                </span>
              ))}
              {(novel.tags||[]).map((t: string) => (
                <span key={t} style={{fontSize:10,background:'var(--color-bg)',color:'var(--color-text-muted)',border:'1px solid var(--color-brand-border)',padding:'2px 8px',borderRadius:4}}>#{t}</span>
              ))}
            </div>
            <h1 style={{fontSize:20,fontWeight:700,color:'var(--color-text)',lineHeight:1.4,marginBottom:8,fontFamily:"'Noto Serif JP',serif"}}>{novel.title}</h1>
            {upcomingEpisode && (
              <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--color-info-bg)',border:'1.5px solid #93c5fd',borderRadius:8,padding:'8px 14px',marginBottom:10,fontSize:12,color:'#1d4ed8',fontWeight:600}}>
                次回更新予告：{new Date(upcomingEpisode.scheduled_at!).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 頃
              </div>
            )}
            <div style={{fontSize:13,color:'var(--color-text-muted)',marginBottom:12,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              作者：
              <a href={`/author/${author?.user_id}`} style={{color:'var(--color-brand)',textDecoration:'none',fontWeight:600}}>{author?.display_name}</a>
              {!isAuthor && user && author?.user_id && (
                <FollowButton authorId={author.user_id} userId={user.id} initialFollowing={isFollowing} followerCount={followerCount}/>
              )}
              {!user && author?.user_id && (
                <span style={{fontSize:11,color:'var(--color-text-faint)'}}>フォロワー {followerCount}</span>
              )}
            </div>
            {novel.summary && (
              <div style={{fontSize:13,color:'var(--color-text)',lineHeight:1.85,padding:'10px 12px',background:'var(--color-bg)',borderRadius:8,borderLeft:'3px solid #f5a060',marginBottom:14,whiteSpace:'pre-wrap'}}>
                {novel.summary}
              </div>
            )}
            {discoverComments && discoverComments.length > 0 && (
              <div style={{margin:'10px 0',borderRadius:10,overflow:'hidden',border:'1.5px solid var(--color-brand)'}}>
                <div style={{background:'var(--color-brand)',padding:'6px 14px',fontSize:11,fontWeight:700,color:'var(--color-bg-card)'}}>読者の声</div>
                {discoverComments.map((d: any) => d.comment && (
                  <div key={d.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--color-brand-light)',background:'var(--color-brand-light)'}}>
                    <p style={{fontSize:13,color:'var(--color-text)',lineHeight:1.7,margin:0,marginBottom:4}}>「{d.comment}」</p>
                    <div style={{fontSize:11,color:'var(--color-brand)'}}>{d.display_name}</div>
                  </div>
                ))}
              </div>
            )}
            <NovelActions
              novelId={params.id}
              userId={user?.id || null}
              authorId={novel.author_id}
              novelTitle={novel.title}
              isAuthor={isAuthor}
              userDisplayName={profile?.display_name || ''}
              initialLiked={liked}
              initialBookmarked={bookmarked}
              initialDiscovered={discovered}
              likeCount={likeCount??0}
              bookmarkCount={bookmarkCount??0}
              discoverCount={discoverCount??0}
              hideStats={Date.now() - new Date(novel.created_at).getTime() < 7*24*60*60*1000 || (likeCount??0) < 50}
            />
          </div>

          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>目次（{totalCount}話）</span>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {user && totalCount > 0 && (
                    <span style={{fontSize:11,color:'var(--color-success)',fontWeight:600}}>✓ {fmtNum(readCount)}/{fmtNum(totalCount)}話 既読</span>
                  )}
                  <span style={{fontSize:11,color:'var(--color-text-muted)'}}>最終更新：{episodes?.length ? fmtDate(episodes[episodes.length-1].created_at) : '—'}</span>
                </div>
              </div>
            </div>

            {!episodes || episodes.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center',color:'var(--color-text-faint)',fontSize:13}}>まだ話がありません</div>
            ) : !hasChapters ? (
              allEpisodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} />)
            ) : (
              <ChapterAccordion
                novelId={params.id}
                chapterGroups={chapterGroups}
                unassignedEpisodes={unassignedEpisodes}
                readEpisodeIds={Array.from(readEpisodeIds)}
                epLikeCounts={epLikeCounts}
                epCommentCounts={epCommentCounts}
              />
            )}

            {episodes && episodes.length > 0 && (
              <div style={{padding:'12px 16px',textAlign:'center',borderTop:'1px solid var(--color-brand-border)'}}>
                <Link href={`/novel/${params.id}/episode/${episodes[0].id}`}
                  style={{display:'inline-block',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,padding:'10px 32px',borderRadius:20,fontSize:14,textDecoration:'none'}}>
                  最初から読む
                </Link>
              </div>
            )}
          </div>

          <div style={{marginTop:20}}>
            <NovelCommentSection
              novelId={params.id}
              userId={user?.id || null}
              userName={profile?.display_name || null}
              userIconUrl={profile?.icon_url || null}
              authorId={author?.user_id || ''}
              comments={novelComments}
            />
          </div>

          {/* ===== 同シリーズの作品 ===== */}
          {seriesNovels.length > 1 && (
            <div style={{marginTop:20,background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
              <div style={{padding:'10px 14px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'var(--color-brand)',borderRadius:2,display:'inline-block'}}/>
                <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>シリーズ：{seriesTitle}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column'}}>
                {seriesNovels.map((n: any, i: number) => (
                  <Link key={n.id} href={`/novel/${n.id}`}
                    style={{textDecoration:'none',display:'block',borderBottom:i<seriesNovels.length-1?'1px solid var(--color-brand-light)':'none',background:n.id===params.id?'var(--color-brand-light)':'none'}}>
                    <div style={{padding:'10px 14px',display:'flex',gap:10,alignItems:'center'}}>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--color-brand)',minWidth:24,flexShrink:0}}>#{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:n.id===params.id?700:500,color:n.id===params.id?'var(--color-brand)':'var(--color-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {n.title}{n.id===params.id?' ◀ 現在':''}
                        </div>
                        <div style={{fontSize:10,color:'var(--color-text-muted)'}}>{n.genre}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ===== おすすめ作品 ===== */}
          {recommendedNovels.length > 0 && (
            <div style={{marginTop:20,background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
              <div style={{padding:'10px 14px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:16,background:'var(--color-brand)',borderRadius:2,display:'inline-block'}}/>
                <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>おすすめ作品</span>
              </div>
              <div style={{display:'flex',flexDirection:'column'}}>
                {recommendedNovels.map((n: any, i: number) => (
                  <Link key={n.id} href={`/novel/${n.id}`} style={{textDecoration:'none',display:'block',borderBottom:i<recommendedNovels.length-1?'1px solid var(--color-brand-light)':'none'}}>
                    <div style={{padding:'12px 14px',display:'flex',gap:10,alignItems:'flex-start'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',gap:4,marginBottom:4,flexWrap:'wrap'}}>
                          {n.isNew && <span style={{fontSize:10,background:'var(--color-brand)',color:'#fff',padding:'1px 6px',borderRadius:3,fontWeight:700}}>NEW</span>}
                          <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
                          {n.novel_type && <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 6px',borderRadius:3}}>{n.novel_type}</span>}
                          {n.is_serial && <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>}
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:2,lineHeight:1.4}}>{n.title}</div>
                        <div style={{fontSize:11,color:'var(--color-text-muted)'}}>作者：{recAuthorMap[n.author_id]||''}</div>
                        {n.summary && (
                          <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:3,lineHeight:1.6,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                            {n.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mobile-only" style={{height:80}}/>
        </div>

      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
