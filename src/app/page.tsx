import { createClient } from '@/lib/supabase/server'
export const revalidate = 30
import Link from 'next/link'
import HomeSidebar from './HomeSidebar'
import NovelList from './NovelList'
import GemComment from './GemComment'
import RecommendedNovels from './RecommendedNovels'
import SearchBanner from './SearchBanner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import HeroSlider from './HeroSlider'
import GemSection from './GemSection'
import RankingSection from './RankingSection'
import LatestEpisodesSection from './LatestEpisodesSection'

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

  // 統計データ
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

  // スライダー用データ
  const sliderAnnouncements = (sidebarAnnouncements || [])
    .filter((n: any) => n.type !== 'contest' && n.image_url)
    .slice(0, 6)
    .map((n: any) => ({ id: `ann-${n.id}`, image_url: n.image_url, link: n.link, title: n.title }))
  const sliderContests = (allContests || [])
    .filter((c: any) => c.image_url && getContestStatusKey(c.deadline, c.judging_end) === '募集中')
    .map((c: any) => ({ id: `con-${c.id}`, image_url: c.image_url, link: c.is_site_contest ? `/contests/${c.id}` : c.apply_url, title: c.title }))
  const sliderItems = [...sliderAnnouncements, ...sliderContests]

  // 最新話
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

  // 新着作品
  const oneMonthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString()
  const { data: allLatestRaw } = await supabase
    .from('novels')
    .select('id, title, genre, is_serial, novel_type, author_id, created_at, summary, catchcopy, tags')
    .eq('published', true)
    .eq('is_r18', false)
    .neq('genre', '官能')
    .gte('created_at', oneMonthAgo)
    .order('created_at', { ascending: false })
    .limit(50)
  const shuffledLatest = [...(allLatestRaw||[])].sort(()=>Math.random()-0.5).slice(0,8)

  // 週間ランキング
  const { data: weeklyLikes } = await supabase
    .from('weekly_likes')
    .select('novel_id, like_count')
    .order('like_count', { ascending: false })
    .limit(20)
  const weeklyNovelIds = (weeklyLikes || []).map((w: any) => w.novel_id)
  const weeklyLikeMap = Object.fromEntries((weeklyLikes || []).map((w: any) => [w.novel_id, w.like_count]))
  let rankingLongRaw: any[] = []
  let rankingShortRaw: any[] = []
  if (weeklyNovelIds.length > 0) {
    const { data: weeklyNovels } = await supabase
      .from('novels')
      .select('id, title, genre, novel_type, author_id, summary, catchcopy, tags')
      .in('id', weeklyNovelIds)
      .eq('published', true)
    const sorted = (weeklyNovels || []).sort((a: any, b: any) => (weeklyLikeMap[b.id]||0) - (weeklyLikeMap[a.id]||0))
    rankingLongRaw  = sorted.filter((n: any) => n.novel_type === '長編').slice(0, 5)
    rankingShortRaw = sorted.filter((n: any) => n.novel_type === '短編').slice(0, 5)
  }

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
  }))

  // おすすめ
  const { data: allNovelsRaw } = await supabase
    .from('novels')
    .select('id, title, genre, novel_type, author_id, created_at, originality_score, is_r18, summary, catchcopy, tags')
    .eq('published', true)
    .eq('is_r18', false)
    .neq('genre', '官能')
    .order('created_at', { ascending: false })
    .limit(50)
  const allNovels = await addAuthorNames(supabase, allNovelsRaw || [])
  const allIds = allNovels.map((n: any) => n.id)
  let likeMap: Record<string,number> = {}
  let discoverMap: Record<string,number> = {}
  let bookmarkMap: Record<string,number> = {}
  if (allIds.length > 0) {
    const [lData, dData, bData] = await Promise.all([
      supabase.from('likes').select('novel_id').in('novel_id', allIds),
      supabase.from('discovers').select('novel_id').in('novel_id', allIds).eq('is_pending', false),
      supabase.from('bookmarks').select('novel_id').in('novel_id', allIds),
    ])
    lData.data?.forEach((l: any) => { likeMap[l.novel_id]     = (likeMap[l.novel_id]     || 0) + 1 })
    dData.data?.forEach((d: any) => { discoverMap[d.novel_id] = (discoverMap[d.novel_id] || 0) + 1 })
    bData.data?.forEach((b: any) => { bookmarkMap[b.novel_id] = (bookmarkMap[b.novel_id] || 0) + 1 })
  }
  const scored = allNovels.map((n: any) => ({
    ...n,
    score: (likeMap[n.id]||0)*3 + (bookmarkMap[n.id]||0)*2 + (discoverMap[n.id]||0)*4 + Math.round((n.originality_score||0)/5),
    likeCount: likeMap[n.id]||0,
    like_count: likeMap[n.id]||0,
  }))
  const recommended = [...scored.sort((a: any,b: any)=>b.score-a.score).slice(0,20)].sort(()=>Math.random()-0.5).slice(0,8)

  // 原石発掘
  const novelIds4Gem = allNovels.map((n: any) => n.id)
  let commentCountMap: Record<string,number> = {}
  if (novelIds4Gem.length > 0) {
    const { data: gemComments } = await supabase.from('comments').select('novel_id').in('novel_id', novelIds4Gem)
    gemComments?.forEach((c: any) => { commentCountMap[c.novel_id] = (commentCountMap[c.novel_id] || 0) + 1 })
  }
  const gemScored = allNovels.map((n: any) => ({
    ...n,
    gemScore: (discoverMap[n.id]||0)*4 + (likeMap[n.id]||0)*1 + (commentCountMap[n.id]||0)*2 + Math.round((n.originality_score||0)/10),
    discoverCount: discoverMap[n.id]||0,
    likeCount2: likeMap[n.id]||0,
  }))
  const seed = Date.now()
  const shuffledGem = [...gemScored.sort((a:any,b:any)=>b.gemScore-a.gemScore).slice(0,20)].sort((a:any,b:any)=>{
    const ha = (a.id.charCodeAt(0) * seed) % 997
    const hb = (b.id.charCodeAt(0) * seed) % 997
    return ha - hb
  })
  const seenGemIds = new Set<string>()
  const gemNovels: any[] = []
  for (const n of shuffledGem) {
    if (!seenGemIds.has(n.id)) { seenGemIds.add(n.id); gemNovels.push(n) }
    if (gemNovels.length >= 7) break
  }
  const gemIds = gemNovels.map((n: any) => n.id)
  const discoverCommentMap: Record<string,{comment:string;display_name:string}[]> = {}
  if (gemIds.length > 0) {
    const { data: gemDiscovers } = await supabase
      .from('discovers').select('novel_id, comment, display_name')
      .in('novel_id', gemIds).not('comment', 'is', null).eq('is_pending', false).order('created_at', { ascending: false })
    gemDiscovers?.forEach((d: any) => {
      if (!discoverCommentMap[d.novel_id]) discoverCommentMap[d.novel_id] = []
      if (discoverCommentMap[d.novel_id].length < 2)
        discoverCommentMap[d.novel_id].push({ comment: d.comment, display_name: d.display_name })
    })
  }

  const rankingLong  = (await addAuthorNames(supabase, rankingLongRaw  || [])).map((n: any) => ({...n, like_count: weeklyLikeMap[n.id]||0}))
  const rankingShort = (await addAuthorNames(supabase, rankingShortRaw || [])).map((n: any) => ({...n, like_count: weeklyLikeMap[n.id]||0}))

  // モバイル用：募集中コンテストを1件取得
  const activeContest = (allContests || []).find((c: any) => c.image_url && getContestStatusKey(c.deadline, c.judging_end) === '募集中')

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      {/* ===== デスクトップ：ヒーロー ===== */}
      <section className="desktop-only" style={{background:'#FFF1E6',borderBottom:'1px solid #F0D9C9'}}>
        <div className="hero-section" style={{maxWidth:1200,margin:'0 auto',padding:'36px 32px'}}>
          <h1 className="hero-title" style={{fontFamily:"'Noto Serif JP',serif",fontSize:32,fontWeight:700,color:'#2B211B',lineHeight:1.35,marginBottom:12}}>
            次のブームは、<em style={{color:'#F26A21',fontStyle:'normal'}}>ここから</em>生まれる。
          </h1>
          <div className="hero-flex" style={{display:'flex',gap:24,alignItems:'center',marginRight:-80}}>
            <div style={{flexShrink:0}}>
              <p style={{fontSize:13,color:'#77706A',lineHeight:1.85,marginBottom:16}}>まだ知られていない物語の原石を、<br/>読者とともに発掘するライトノベル投稿サイト。</p>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <Link href={user?'/post':'/auth/register'} style={{padding:'11px 22px',border:'none',borderRadius:6,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none'}}>今すぐ作品を投稿する</Link>
                <Link href="/search" style={{padding:'10px 22px',border:'1.5px solid #F26A21',borderRadius:6,background:'#FFF9F2',color:'#F26A21',fontSize:13,fontWeight:500,textDecoration:'none'}}>作品を探す</Link>
              </div>
            </div>
            {sliderItems.length > 0 && (
              <div style={{flex:1,minWidth:0}}>
                <HeroSlider items={sliderItems} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== デスクトップ：統計バー ===== */}
      <div className="desktop-only" style={{background:'#fff',borderBottom:'1px solid #F0D9C9'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
          {[
            ['投稿作品数', fmtNum(novelCount ?? 0) + '作品'],
            ['登録ユーザー数', fmtNum(userCount ?? 0) + '人'],
            ['累計閲覧数', fmtNum(totalViews ?? 0) + 'PV'],
            ['総コメント数', fmtNum(commentCount ?? 0) + '件'],
          ].map(([l,v])=>(
            <div key={l} style={{padding:'14px 16px',borderRight:'1px solid #F0D9C9',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:700,color:'#F26A21',lineHeight:1.2}}>{v}</div>
              <div style={{fontSize:11,color:'#77706A',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== モバイル：バナー（コンテスト） ===== */}
      {activeContest && (
        <div className="mobile-only" style={{padding:'12px 16px 0'}}>
          <Link href={activeContest.is_site_contest ? `/contests/${activeContest.id}` : (activeContest.apply_url || '#')}
            style={{display:'block',borderRadius:12,overflow:'hidden',textDecoration:'none'}}>
            <img
              src={activeContest.image_url}
              alt={activeContest.title}
              style={{width:'100%',height:'auto',maxHeight:140,objectFit:'cover',display:'block'}}
            />
          </Link>
        </div>
      )}

      {/* ===== モバイル：急上昇作品 ===== */}
      <div className="mobile-only" style={{padding:'16px 16px 0'}}>
        <div style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid #F0D9C9'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>急上昇作品</span>
            </div>
            <Link href="/ranking" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          <div style={{overflowX:'auto',padding:'12px 16px',display:'flex',gap:10,scrollbarWidth:'none'}}>
            {gemNovels.slice(0,5).map((n: any) => (
              <Link key={n.id} href={`/novel/${n.id}`} style={{textDecoration:'none',flexShrink:0,width:100}}>
                <div style={{width:100,height:130,background:'linear-gradient(135deg, #FFF1E6, #FFF9F2)',border:'1px solid #F0D9C9',borderRadius:8,overflow:'hidden',marginBottom:6,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:8}}>
                  <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3,marginBottom:4,textAlign:'center'}}>{n.genre}</span>
                  <div style={{fontSize:11,fontWeight:700,color:'#2B211B',textAlign:'center',lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
                </div>
                <div style={{fontSize:10,color:'#2B211B',fontWeight:500,lineHeight:1.3,textAlign:'center',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
                <div style={{fontSize:9,color:'#77706A',textAlign:'center',marginTop:2}}>{n.display_name}</div>
                <div style={{fontSize:9,color:'#B8AEA8',textAlign:'center'}}>♡ {n.likeCount2||0}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ===== モバイル：編集部のおすすめ ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid #F0D9C9'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
            <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>編集部のおすすめ</span>
            <Link href="/search" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          {recommended.slice(0,3).map((n: any) => (
            <Link key={n.id} href={`/novel/${n.id}`} style={{display:'flex',gap:12,padding:'12px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',alignItems:'flex-start'}}>
              {/* サムネ代替：ジャンルカラーブロック */}
              <div style={{width:52,height:68,borderRadius:6,background:'linear-gradient(135deg,#FFF1E6,#fde8d8)',border:'1px solid #F0D9C9',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:9,fontWeight:700,color:'#F26A21',textAlign:'center',lineHeight:1.3,padding:'0 4px'}}>{n.genre}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#2B211B',lineHeight:1.4,marginBottom:3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
                <div style={{fontSize:11,color:'#77706A',marginBottom:3}}>{n.display_name}</div>
                {n.catchcopy && <div style={{fontSize:11,color:'#77706A',lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{n.catchcopy}</div>}
                <div style={{fontSize:10,color:'#B8AEA8',marginTop:3}}>♡ {n.likeCount||0}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== モバイル：新着作品 ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid #F0D9C9'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
            <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>新着作品</span>
            <Link href="/search" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          {latestNovels.slice(0,4).map((n: any) => (
            <Link key={n.id} href={`/novel/${n.id}`} style={{display:'flex',gap:10,padding:'11px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',alignItems:'center'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                  {n.novel_type && <span style={{fontSize:9,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 5px',borderRadius:3}}>{n.novel_type}</span>}
                  <span style={{background:'#F26A21',color:'#fff',fontSize:9,padding:'0 4px',borderRadius:3,fontWeight:700}}>NEW</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.title}</div>
                <div style={{fontSize:11,color:'#77706A'}}>{n.display_name}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B8AEA8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== ユーザーの推し（モバイル：gem-mobile 内で表示） ===== */}
      <div className="gem-section-wrap" style={{padding:'12px 0 0'}}>
        <div className="gem-inner" style={{maxWidth:1200,margin:'0 auto',padding:'0 32px'}}>
          {/* デスクトップ */}
          <div className="desktop-only" style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden',padding:'16px'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:28}}>
              <div style={{flexShrink:0,minWidth:160,maxWidth:160}}>
                <h2 style={{fontSize:17,fontWeight:700,color:'#2B211B',marginBottom:8}}>ユーザーの推し</h2>
                <p style={{fontSize:12,color:'#2B211B',lineHeight:1.9,marginBottom:12}}>推しの作品を拡散しよう！</p>
                <Link href="/search" style={{display:'inline-block',fontSize:11,color:'#F26A21',border:'1.5px solid #F26A21',borderRadius:14,padding:'5px 12px',textDecoration:'none',fontWeight:600}}>作品を検索する</Link>
              </div>
              <GemSection novels={gemNovels} discoverCommentMap={discoverCommentMap} />
            </div>
          </div>
          {/* モバイル */}
          <div className="mobile-only">
            <GemSection novels={gemNovels} discoverCommentMap={discoverCommentMap} />
          </div>
        </div>
      </div>

      {/* ===== 作品を探す（デスクトップのみ） ===== */}
      <div className="desktop-only search-banner-section" style={{padding:'20px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px'}}>
          <SearchBanner />
        </div>
      </div>

      {/* ===== デスクトップ：メインエリア ===== */}
      <div className="desktop-only main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:16}}>
          {/* 週間ランキング */}
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>週間ランキング</span>
            </div>
            <RankingSection rankingLong={rankingLong} rankingShort={rankingShort} />
            <div style={{padding:'9px 16px',textAlign:'center',borderTop:'1px solid #F0D9C9'}}>
              <Link href='/ranking' className='more-link' style={{fontSize:12,color:'#F26A21',textDecoration:'none',display:'inline-block'}}>もっと見る ›</Link>
            </div>
          </div>
          <RecommendedNovels novels={recommended} />
          {/* 最新話更新 */}
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>最新話更新</span>
            </div>
            <LatestEpisodesSection episodes={latestEpisodes} />
            <div style={{padding:'9px 16px',textAlign:'center',borderTop:'1px solid #F0D9C9'}}>
              <Link href='/ranking' className='more-link' style={{fontSize:12,color:'#F26A21',textDecoration:'none',display:'inline-block'}}>もっと見る ›</Link>
            </div>
          </div>
          {/* 新着作品 */}
          <div id="novels" style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>新着作品</span>
            </div>
            <NovelList novels={latestNovels} />
          </div>
        </div>
        <div><HomeSidebar announcements={sidebarAnnouncements||[]} contests={sidebarContests} /></div>
      </div>

      {/* ===== モバイル：週間ランキング ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'1px solid #F0D9C9'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>週間ランキング</span>
              <span style={{fontSize:10,color:'#B8AEA8'}}>更新日：{new Date().toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span>
            </div>
            <Link href="/ranking" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          <RankingSection rankingLong={rankingLong} rankingShort={rankingShort} />
        </div>
      </div>

      {/* モバイルボトムナビ分の余白 */}
      <div className="mobile-only" style={{height:72}}/>

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
          toast.style.cssText = 'position:fixed;bottom:80px;right:24px;background:#F26A21;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 16px rgba(242,106,33,.35);animation:slideUp .3s ease';
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
