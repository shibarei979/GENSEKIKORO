import { createClient } from '@/lib/supabase/server'
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

      {/* ===== ユーザーの推し（見出しは本棚内のIntroBlockに統合） ===== */}
      <div className="gem-section-wrap" style={{background:'var(--color-bg-card)',padding:'16px 0',overflow:'hidden'}}>
        <div style={{width:'100%'}}>
          <GemSection novels={gemNovels} discoverCommentMap={discoverCommentMap} />
        </div>
      </div>

      {/* ===== 作品を探す（デスクトップのみ） ===== */}
      <div className="desktop-only search-banner-section" style={{background:'var(--color-bg-card)',padding:'20px 0'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px'}}>
          <SearchBanner />
        </div>
      </div>

      {/* ===== デスクトップ：メインエリア ===== */}
      <div className="desktop-only main-layout" style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>週間ランキング</span>
            </div>
            <RankingSection rankingLong={rankingLong} rankingShort={rankingShort} />
            <div style={{padding:'9px 16px',textAlign:'center',borderTop:'1px solid var(--color-brand-border)'}}>
              <Link href='/ranking' className='more-link' style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none',display:'inline-block'}}>もっと見る ›</Link>
            </div>
          </div>
          <RecommendedNovels novels={recommended} />
          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>最新話更新</span>
            </div>
            <LatestEpisodesSection episodes={latestEpisodes} />
            <div style={{padding:'9px 16px',textAlign:'center',borderTop:'1px solid var(--color-brand-border)'}}>
              <Link href='/ranking' className='more-link' style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none',display:'inline-block'}}>もっと見る ›</Link>
            </div>
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

      {/* ===== 投稿・検索 台形バナー（新着作品の下） ===== */}
      <div className="desktop-only" style={{background:'var(--color-bg-card)',padding:'24px 0',width:'100%'}}>
        <ActionBanner isLoggedIn={!!user} />
      </div>

      {/* ===== モバイル：週間ランキング ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>週間ランキング</span>
            <Link href="/ranking" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
          </div>
          <RankingSection rankingLong={rankingLong} rankingShort={rankingShort} />
        </div>
      </div>

      {/* ===== モバイル：おすすめ作品 ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        <RecommendedNovels novels={recommended} />
      </div>

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
