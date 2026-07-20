import { createClient } from '@/lib/supabase/server'
import { getCachedRecommendScores, buildRecommendation } from '@/lib/recommend'
export const revalidate = 30
import Link from 'next/link'
import HomeSidebar from './HomeSidebar'
import NovelList from './NovelList'
import GemComment from './GemComment'
import RecommendedNovels from './RecommendedNovels'
import SearchBanner from './SearchBanner'
import ActionBanner from './ActionBanner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { calcQualityScore } from '@/lib/qualityScore'
import AdBanner from '@/components/layout/AdBanner'
import HeroSlider from './HeroSlider'
import GemSection from './GemSection'
import LatestEpisodesSection from './LatestEpisodesSection'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const HIDE_LIKE_THRESHOLD = 50

function hideStatsFor(createdAt: string, likeCount: number) {
  const isNewWork = Date.now() - new Date(createdAt).getTime() < SEVEN_DAYS_MS
  return isNewWork || likeCount < HIDE_LIKE_THRESHOLD
}

function getContestStatusKey(deadline: string | null, judging_end: string | null) {
  const now = new Date()
  if (!deadline) return '募集中'
  const d = new Date(deadline)
  if (now < d) return '募集中'
  if (!judging_end) return '選考中'
  const j = new Date(judging_end)
  if (now < j) return '選考中'
  const expire = new Date(j.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (now < expire) return '結果発表'
  return null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const [
    { count: novelCount },
    { count: userCount },
    { count: commentCount },
  ] = await Promise.all([
    supabase.from('novels').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
  ])
  const [{ count: totalViews }, [{ data: sidebarAnnouncementsA }, { data: allContestsA }]] = await Promise.all([
    supabase.from('page_views').select('*', { count: 'exact', head: true }),
    Promise.all([
      supabase.from('announcements').select('id, title, body, type, link, image_url, created_at')
        .eq('is_published', true).order('created_at', { ascending: false }).limit(5),
      supabase.from('contests').select('id, title, description, deadline, judging_end, apply_url, image_url, is_published, is_site_contest')
        .eq('is_published', true).order('created_at', { ascending: false }),
    ])
  ])
  const sidebarAnnouncements = sidebarAnnouncementsA
  const allContests = allContestsA

  function fmtNum(n: number): string {
    if (n >= 10000) return (Math.floor(n / 1000) / 10) + '万'
    if (n >= 1000) return (Math.floor(n / 100) / 10) + 'k'
    return n.toLocaleString()
  }

  const sidebarContests = (allContests || []).filter(c => getContestStatusKey(c.deadline, c.judging_end) !== null)

  const sliderAnnouncements = (sidebarAnnouncements || [])
    .filter((n: any) => n.type !== 'contest' && n.image_url)
    .slice(0, 6)
    .map((n: any) => ({ id: `ann-${n.id}`, image_url: n.image_url, link: n.link, title: n.title }))
  const sliderContests = (allContests || [])
    .filter((c: any) => c.image_url && getContestStatusKey(c.deadline, c.judging_end) === '募集中')
    .map((c: any) => ({ id: `con-${c.id}`, image_url: c.image_url, link: c.is_site_contest ? `/contests/${c.id}` : c.apply_url, title: c.title }))
  const sliderItems = [...sliderAnnouncements, ...sliderContests]

  const { data: latestEpisodesRaw } = await supabase
    .from('episodes')
    .select('id, title, ep_number, created_at, novel_id, novels(id, title, genre, author_id, published, summary, catchcopy, tags)')
    .order('created_at', { ascending: false })
    .limit(20)
  const seenNovelIds = new Set<string>()
  const latestEpisodesFiltered = (latestEpisodesRaw || [])
    .filter((ep: any) => {
      const novelId = (ep.novels as any)?.id
      if (!(ep.novels as any)?.published || !novelId) return false
      if (seenNovelIds.has(novelId)) return false
      seenNovelIds.add(novelId)
      return true
    })
    .slice(0, 10)
  const epAuthorIds = Array.from(new Set(latestEpisodesFiltered.map((ep: any) => (ep.novels as any)?.author_id).filter(Boolean)))
  let epAuthorMap: Record<string,string> = {}
  if (epAuthorIds.length > 0) {
    const { data: epAuthors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', epAuthorIds as string[])
    epAuthors?.forEach((a: any) => { epAuthorMap[a.user_id] = a.display_name })
  }
  const latestEpisodes = latestEpisodesFiltered.map((ep: any) => ({
    id: ep.id,
    title: ep.title,
    ep_number: ep.ep_number,
    novel_id: (ep.novels as any)?.id,
    novel_title: (ep.novels as any)?.title,
    genre: (ep.novels as any)?.genre,
    author_name: epAuthorMap[(ep.novels as any)?.author_id] || '',
    summary: (ep.novels as any)?.summary || null,
    catchcopy: (ep.novels as any)?.catchcopy || null,
    tags: (ep.novels as any)?.tags || [],
  }))

  // ===== 短編棚 =====
  const { data: tanpenEpRaw } = await supabase
    .from('episodes')
    .select('id, title, ep_number, created_at, novel_id, novels(id, title, genre, author_id, published, summary, catchcopy, tags, novel_type, is_r18)')
    .order('created_at', { ascending: false })
    .limit(100)
  const seenTanpenIds = new Set<string>()
  const tanpenEpFiltered = (tanpenEpRaw || [])
    .filter((ep: any) => {
      const n = ep.novels as any
      if (!n?.published || n?.novel_type !== '短編' || n?.is_r18) return false
      if (seenTanpenIds.has(n.id)) return false
      seenTanpenIds.add(n.id)
      return true
    })
    .slice(0, 10)
  const tanpenAuthorIds = tanpenEpFiltered
    .map((ep: any) => (ep.novels as any)?.author_id)
    .filter(Boolean)
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
  let tanpenAuthorMap: Record<string,string> = {}
  if (tanpenAuthorIds.length > 0) {
    const { data: ta } = await supabase.from('profiles').select('user_id, display_name').in('user_id', tanpenAuthorIds)
    ta?.forEach((a: any) => { tanpenAuthorMap[a.user_id] = a.display_name })
  }
  const tanpenEpisodes = tanpenEpFiltered.map((ep: any) => ({
    id: ep.id,
    title: ep.title,
    ep_number: ep.ep_number,
    novel_id: (ep.novels as any)?.id,
    novel_title: (ep.novels as any)?.title,
    genre: (ep.novels as any)?.genre,
    author_name: tanpenAuthorMap[(ep.novels as any)?.author_id] || '',
    summary: (ep.novels as any)?.summary || null,
    catchcopy: (ep.novels as any)?.catchcopy || null,
    tags: (ep.novels as any)?.tags || [],
  }))

  // 読み手設定：AI作品（全面的利用）を非表示にするか
  const hideAi = profile?.show_ai_works === false

  const oneMonthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString()
  let latestQuery = supabase
    .from('novels')
    .select('id, title, genre, is_serial, novel_type, author_id, created_at, summary, catchcopy, tags')
    .eq('published', true)
    .eq('is_r18', false)
    .neq('genre', '官能')
    .gte('created_at', oneMonthAgo)
  if (hideAi) latestQuery = latestQuery.neq('ai_usage', 'full')
  const { data: allLatestRaw } = await latestQuery
    .order('created_at', { ascending: false })
    .limit(50)
  const shuffledLatest = [...(allLatestRaw||[])].sort(()=>Math.random()-0.5).slice(0,8)

  const latestNovelsBase = await addAuthorNames(supabase, shuffledLatest || [])
  const latestIds = latestNovelsBase.map((n: any) => n.id)
  let latestLikeMap: Record<string,number> = {}
  let latestBookmarkMap: Record<string,number> = {}
  if (latestIds.length > 0) {
    const [ll, lb] = await Promise.all([
      supabase.from('likes').select('novel_id').in('novel_id', latestIds),
      supabase.from('bookmarks').select('novel_id').in('novel_id', latestIds),
    ])
    ll.data?.forEach((l: any) => { latestLikeMap[l.novel_id] = (latestLikeMap[l.novel_id]||0)+1 })
    lb.data?.forEach((b: any) => { latestBookmarkMap[b.novel_id] = (latestBookmarkMap[b.novel_id]||0)+1 })
  }
  const latestNovels = latestNovelsBase.map((n: any) => ({
    ...n,
    likeCount:     latestLikeMap[n.id]     || 0,
    like_count:    latestLikeMap[n.id]     || 0,
    bookmarkCount: latestBookmarkMap[n.id] || 0,
    hideStats: hideStatsFor(n.created_at, latestLikeMap[n.id] || 0),
  }))

  let allNovelsQuery = supabase
    .from('novels')
    .select('id, title, genre, novel_type, author_id, created_at, originality_score, is_r18, summary, catchcopy, tags')
    .eq('published', true)
    .eq('is_r18', false)
    .neq('genre', '官能')
  if (hideAi) allNovelsQuery = allNovelsQuery.neq('ai_usage', 'full')
  const { data: allNovelsRaw } = await allNovelsQuery
    .order('created_at', { ascending: false })
    .limit(50)
  const allNovels = await addAuthorNames(supabase, allNovelsRaw || [])
  const allIds = allNovels.map((n: any) => n.id)
  let likeMap: Record<string,number> = {}
  let discoverMap: Record<string,number> = {}
  let bookmarkMap: Record<string,number> = {}
  let epCountMap: Record<string,number> = {}
  let latestEpMap: Record<string,string> = {}  // 作品ごとの最新話投稿日時
  let viewMap: Record<string,number> = {}
  let readMap: Record<string,number> = {}
  if (allIds.length > 0) {
    const [lData, dData, bData, eData, vData, rData] = await Promise.all([
      supabase.from('likes').select('novel_id').in('novel_id', allIds),
      supabase.from('discovers').select('novel_id').in('novel_id', allIds).eq('is_pending', false),
      supabase.from('bookmarks').select('novel_id').in('novel_id', allIds),
      supabase.from('episodes').select('novel_id, created_at').in('novel_id', allIds).eq('published', true),
      supabase.from('novel_views').select('novel_id, view_count').in('novel_id', allIds),
      supabase.from('read_episodes').select('novel_id').in('novel_id', allIds),
    ])
    lData.data?.forEach((l: any) => { likeMap[l.novel_id]     = (likeMap[l.novel_id]     || 0) + 1 })
    dData.data?.forEach((d: any) => { discoverMap[d.novel_id] = (discoverMap[d.novel_id] || 0) + 1 })
    bData.data?.forEach((b: any) => { bookmarkMap[b.novel_id] = (bookmarkMap[b.novel_id] || 0) + 1 })
    eData.data?.forEach((e: any) => {
      epCountMap[e.novel_id]  = (epCountMap[e.novel_id]  || 0) + 1
      if (!latestEpMap[e.novel_id] || e.created_at > latestEpMap[e.novel_id]) latestEpMap[e.novel_id] = e.created_at
    })
    vData.data?.forEach((v: any) => { viewMap[v.novel_id]     = v.view_count || 0 })
    rData.data?.forEach((r: any) => { readMap[r.novel_id]     = (readMap[r.novel_id]     || 0) + 1 })
  }
  const freshCutoff = Date.now() - 48 * 60 * 60 * 1000  // 投稿から48時間
  const scored = allNovels.map((n: any) => {
    const epCount = epCountMap[n.id] || 0
    // 投稿ブースト（最新話の投稿から48時間）：3話まで×1.3、4話以降×1.05
    const isFresh = latestEpMap[n.id] && new Date(latestEpMap[n.id]).getTime() > freshCutoff
    const boostMultiplier = isFresh ? (epCount <= 3 ? 1.3 : 1.05) : 1.0
    // 質スコア（読了率20%+保存率25%+いいね率35%+独創性20%、PV正規化）を加算
    const q = calcQualityScore({
      views: viewMap[n.id] || 0,
      readCount: readMap[n.id] || 0,
      bookmarkCount: bookmarkMap[n.id] || 0,
      likeCount: likeMap[n.id] || 0,
      originalityScore: n.originality_score || 0,
    })
    const qualityBoost = q.score * 0.4  // 質スコア係数0.4
    return {
      ...n,
      score: ((likeMap[n.id]||0)*3 + (bookmarkMap[n.id]||0)*2 + (discoverMap[n.id]||0)*4 + Math.round((n.originality_score||0)/5) + qualityBoost) * boostMultiplier,
      likeCount: likeMap[n.id]||0,
      like_count: likeMap[n.id]||0,
      hideStats: hideStatsFor(n.created_at, likeMap[n.id] || 0),
    }
  })
  // ===== おすすめ（新アルゴリズム：有効読者・最低読者保証・重み付きランダム・ジャンル50:50） =====
  const scoredAll = await getCachedRecommendScores()
  // ユーザーがよく読むジャンル（読了履歴の上位2ジャンル）
  let favoriteGenres: string[] = []
  if (user) {
    const { data: myReads } = await supabase.from('read_episodes').select('novel_id').eq('user_id', user.id).limit(100)
    const readNovelIds = Array.from(new Set((myReads || []).map((r: any) => r.novel_id)))
    if (readNovelIds.length > 0) {
      const { data: readNovels } = await supabase.from('novels').select('genre').in('id', readNovelIds)
      const gc: Record<string, number> = {}
      readNovels?.forEach((n: any) => { gc[n.genre] = (gc[n.genre] || 0) + 1 })
      favoriteGenres = Object.entries(gc).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g)
    }
  }
  const recPicked = buildRecommendation(scoredAll, 8, favoriteGenres, user?.id, hideAi)
  const recommended = recPicked.length > 0
    ? await addAuthorNames(supabase, recPicked)
    : [...scored.sort((a: any,b: any)=>b.score-a.score).slice(0,20)].sort(()=>Math.random()-0.5).slice(0,8)  // フォールバック（データ不足時）

  const novelIds4Gem = allNovels.map((n: any) => n.id)
  let commentCountMap: Record<string,number> = {}
  if (novelIds4Gem.length > 0) {
    const { data: gemComments } = await supabase.from('comments').select('novel_id').in('novel_id', novelIds4Gem)
    gemComments?.forEach((c: any) => { commentCountMap[c.novel_id] = (commentCountMap[c.novel_id] || 0) + 1 })
  }
  const gemScored = allNovels.map((n: any) => {
    const epCount = epCountMap[n.id] || 0
    const gemUpdateBoost = epCount > 0 && epCount <= 3 ? 6 : 0
    return {
      ...n,
      gemScore: (discoverMap[n.id]||0)*4 + (likeMap[n.id]||0)*1 + (commentCountMap[n.id]||0)*2 + Math.round((n.originality_score||0)/10) + gemUpdateBoost + (scoredAll.find(s=>s.id===n.id)?.finalScore||0)*20,
      discoverCount: discoverMap[n.id]||0,
      likeCount2: likeMap[n.id]||0,
      hideStats: hideStatsFor(n.created_at, likeMap[n.id] || 0),
    }
  })
  const seed = Date.now()
  const shuffledGem = [...gemScored.sort((a:any,b:any)=>b.gemScore-a.gemScore).slice(0,60)].sort((a:any,b:any)=>{
    const ha = (a.id.charCodeAt(0) * seed) % 997
    const hb = (b.id.charCodeAt(0) * seed) % 997
    return ha - hb
  })
  const seenGemIds = new Set<string>()
  const gemNovels: any[] = []
  for (const n of shuffledGem) {
    if (!seenGemIds.has(n.id)) { seenGemIds.add(n.id); gemNovels.push(n) }
    if (gemNovels.length >= 50) break
  }
  const gemIds = gemNovels.map((n: any) => n.id)
  const discoverCommentMap: Record<string,{comment:string;display_name:string;obi?:any}[]> = {}
  if (gemIds.length > 0) {
    const { data: gemDiscovers } = await supabase
      .from('discovers').select('novel_id, comment, display_name')
      .in('novel_id', gemIds).not('comment', 'is', null).eq('is_pending', false).order('created_at', { ascending: false })
    gemDiscovers?.forEach((d: any) => {
      if (!discoverCommentMap[d.novel_id]) discoverCommentMap[d.novel_id] = []
      if (discoverCommentMap[d.novel_id].length < 2)
        discoverCommentMap[d.novel_id].push({ comment: d.comment, display_name: d.display_name })
    })

    // 承認済みのドット絵帯（コメント欄表示ON）をテキスト推薦文と確率で混在させる
    const { data: obiRows } = await supabase
      .from('obi_dots').select('novel_id, dots')
      .in('novel_id', gemIds).eq('approved', true).eq('show_in_comments', true)
    obiRows?.forEach((o: any) => {
      if (!discoverCommentMap[o.novel_id]) discoverCommentMap[o.novel_id] = []
      const item = { comment: '', display_name: '', obi: o.dots }
      // 50%で先頭（＝表示される）、50%で後ろ（＝テキストが表示される）
      if (Math.random() < 0.5) discoverCommentMap[o.novel_id].unshift(item)
      else discoverCommentMap[o.novel_id].push(item)
    })
  }

  // モバイル用：募集中コンテストを1件取得（バナー表示用）
  const activeContest = (allContests || []).find((c: any) => c.image_url && getContestStatusKey(c.deadline, c.judging_end) === '募集中')

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      {/* ===== デスクトップ：ヒーロー ===== */}
      <section className="desktop-only" style={{background:'var(--color-brand-light)',borderBottom:'1px solid var(--color-brand-border)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'36px 32px 0'}}>
          <h1 className="hero-title" style={{fontFamily:"'Noto Serif JP',serif",fontSize:32,fontWeight:700,color:'var(--color-text)',lineHeight:1.35,marginBottom:20,textAlign:'center'}}>
            次のブームは、<em style={{color:'var(--color-brand)',fontStyle:'normal'}}>ここから</em>生まれる。
          </h1>
        </div>
        {sliderItems.length > 0 && (
          <div style={{width:'100%',padding:'0 0 36px'}}>
            <HeroSlider items={sliderItems} />
          </div>
        )}
      </section>

      {/* ===== デスクトップ：統計バー ===== */}
      <div className="desktop-only" style={{background:'var(--color-bg-card)',borderBottom:'1px solid var(--color-brand-border)'}}>
        <div className="stats-grid" style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {[
            ['投稿作品数', fmtNum(novelCount ?? 0) + '作品'],
            ['登録ユーザー数', fmtNum(userCount ?? 0) + '人'],
            ['累計閲覧数', fmtNum(totalViews ?? 0) + 'PV'],
            ['総コメント数', fmtNum(commentCount ?? 0) + '件'],
          ].map(([l,v])=>(
            <div key={l} style={{padding:'14px 16px',borderRight:'1px solid var(--color-brand-border)',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:700,color:'var(--color-brand)',lineHeight:1.2}}>{v}</div>
              <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== モバイル：コンテストバナー ===== */}
      {activeContest && (
        <div className="mobile-only" style={{padding:'12px 16px 0'}}>
          <Link
            href={activeContest.is_site_contest ? `/contests/${activeContest.id}` : (activeContest.apply_url || '#')}
            style={{display:'block',borderRadius:10,overflow:'hidden',textDecoration:'none'}}>
            <img src={activeContest.image_url} alt={activeContest.title}
              style={{width:'100%',aspectRatio:'16/9',objectFit:'cover',display:'block'}}/>
          </Link>
        </div>
      )}

      {/* ===== モバイル：お知らせ ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>お知らせ</span>
            <Link href="/announcements" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          {(sidebarAnnouncements||[]).slice(0,3).map((a:any)=>(
            <Link key={a.id} href={a.link||`/announcements/${a.id}`}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--color-brand-light)',textDecoration:'none'}}>
              <div>
                <div style={{fontSize:12,color:'var(--color-text)',fontWeight:500,marginBottom:2}}>{a.title}</div>
                <div style={{fontSize:10,color:'var(--color-text-faint)'}}>{new Date(a.created_at).toLocaleDateString('ja-JP')}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== ユーザーの推し ===== */}
      <div className="gem-section-wrap" style={{background:'var(--color-bg)',padding:'16px 0',overflow:'hidden'}}>
        <div style={{width:'100%'}}>
          <GemSection novels={gemNovels} discoverCommentMap={discoverCommentMap} />
        </div>
      </div>

      {/* ===== 作品を探す（デスクトップのみ） ===== */}
      <div className="desktop-only search-banner-section" style={{background:'var(--color-bg)',padding:'20px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px'}}>
          <SearchBanner />
        </div>
      </div>

      {/* ===== デスクトップ：メインエリア ===== */}
      <div className="desktop-only main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:16}}>
          <RecommendedNovels novels={recommended} />
          {/* 短編棚 */}
          {tanpenEpisodes.length > 0 && (
            <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:4,height:16,background:'var(--color-brand)',borderRadius:2,display:'inline-block'}}/>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>短編棚</span>
                </div>
                <Link href="/search?type=短編" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
              </div>
              <LatestEpisodesSection episodes={tanpenEpisodes} />
            </div>
          )}
          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>最新話更新</span>
              <Link href='/ranking' className='more-link' style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
            </div>
            <LatestEpisodesSection episodes={latestEpisodes} />
          </div>
          <div id="novels" style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>新着作品</span>
            </div>
            <NovelList novels={latestNovels} />
          </div>
        </div>
        <div><HomeSidebar announcements={sidebarAnnouncements||[]} contests={sidebarContests} /></div>
      </div>

      {/* ===== 投稿・検索 台形バナー ===== */}
      <div className="desktop-only" style={{background:'var(--color-bg-card)',padding:'24px 0',width:'100%'}}>
        <ActionBanner isLoggedIn={!!user} />
      </div>

      {/* ===== モバイル：おすすめ作品 ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <RecommendedNovels novels={recommended} />
      </div>

      {/* ===== モバイル：短編棚 ===== */}
      {tanpenEpisodes.length > 0 && (
        <div className="mobile-only" style={{padding:'12px 16px 0'}}>
          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{width:4,height:16,background:'var(--color-brand)',borderRadius:2,display:'inline-block'}}/>
                <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>短編棚</span>
              </div>
              <Link href="/search?type=短編" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
            </div>
            <LatestEpisodesSection episodes={tanpenEpisodes} />
          </div>
        </div>
      )}

      {/* ===== モバイル：最新話更新 ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>最新話更新</span>
            <Link href="/ranking" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          <LatestEpisodesSection episodes={latestEpisodes} />
        </div>
      </div>

      {/* ===== モバイル：新着作品 ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div id="novels" style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>新着作品</span>
          </div>
          <NovelList novels={latestNovels} />
        </div>
      </div>

      {/* モバイルボトムナビ分の余白 */}
      <div className="mobile-only" style={{height:80}}/>

      <AdBanner />
      <Footer user={user} />
      <WelcomeToast profile={profile} />
    </div>
  )
}

function WelcomeToast({ profile }: { profile: any }) {
  if (!profile) return null
  return (
    <script dangerouslySetInnerHTML={{__html: `
      (function() {
        var key = 'welcomed_' + '${profile?.user_id ?? ''}';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          var toast = document.createElement('div');
          var brandColor = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim() || '#F26A21';
          var cardColor = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-card').trim() || '#fff';
          toast.style.cssText = 'position:fixed;bottom:80px;right:24px;background:' + brandColor + ';color:' + cardColor + ';padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(242,106,33,.35);animation:slideUp .3s ease';
          toast.textContent = '${profile?.display_name ?? ''}さん、ようこそ！';
          var style = document.createElement('style');
          style.textContent = '@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}';
          document.head.appendChild(style);
          document.body.appendChild(toast);
          setTimeout(function(){ toast.style.opacity='0'; toast.style.transition='opacity .5s'; setTimeout(function(){ toast.remove(); }, 500); }, 3000);
        }
      })();
    `}}/>
  )
}

async function addAuthorNames(supabase: any, novels: any[]) {
  if (!novels || novels.length === 0) return []
  const authorIds = Array.from(new Set(novels.map((n: any) => n.author_id)))
  const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds)
  const authorMap: Record<string,string> = {}
  authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
  return novels.map((n: any) => ({ ...n, display_name: authorMap[n.author_id] || '' }))
}
