import { createClient } from '@/lib/supabase/server'
export const revalidate = 300 // 5分キャッシュ

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
import Sidebar from '@/components/layout/Sidebar'
import NovelActions from './NovelActions'
import NovelCommentSection from './NovelCommentSection'
import FollowButton from '@/components/FollowButton'

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
    .select('id, title, summary, genre, tags, is_serial, published, views, author_id, created_at, novel_type')
    .eq('id', params.id)
    .maybeSingle()

  if (!novel || novelError) notFound()

  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('display_name, user_id')
    .eq('user_id', novel.author_id)
    .maybeSingle()

  const { data: episodes } = await supabase
    .from('episodes')
    .select('id, title, ep_number, created_at, illust_url')
    .eq('novel_id', params.id)
    .order('ep_number', { ascending: true })

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

    // 既読情報取得
    if (user) {
      const { data: readData } = await supabase
        .from('read_episodes')
        .select('episode_id')
        .eq('user_id', user.id)
        .in('episode_id', epIds)
      readData?.forEach((r: any) => readEpisodeIds.add(r.episode_id))
    }
  }

  const { count: likeCount }     = await supabase.from('likes').select('*',{count:'exact',head:true}).eq('novel_id', params.id)
  // 閲覧数取得
  const { data: viewData } = await supabase.from('novel_views').select('view_count').eq('novel_id', params.id).maybeSingle()
  const viewCount = viewData?.view_count || 0
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

  const author   = authorProfile as any
  const isAuthor = user?.id === author?.user_id

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
    .from('discovers')
    .select('id, comment, display_name, created_at, user_id')
    .eq('novel_id', params.id)
    .not('comment', 'is', null)
    .eq('is_pending', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: rawNovelComments } = await supabase
    .from('comments')
    .select('id, body, created_at, user_id, is_pinned, profiles(display_name, icon_url)')
    .eq('novel_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

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

  function fmtNum(n: number): string {
    if (n >= 10000) return (Math.floor(n / 1000) / 10) + '万'
    if (n >= 1000) return (Math.floor(n / 100) / 10) + 'K'
    return n.toString()
  }

  function fmtDate(d: string) {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`
  }

  // 既読数
  const readCount = readEpisodeIds.size
  const totalCount = episodes?.length ?? 0

  return (
    <div style={{minHeight:'100vh',background:'#fff'}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          {/* パンくず */}
          <div style={{fontSize:12,color:'#77706A',marginBottom:12,display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Link href="/" style={{color:'#F26A21',textDecoration:'none'}}>ホーム</Link>
            <span>›</span>
            <Link href={`/genre/${encodeURIComponent(novel.genre)}`} style={{color:'#F26A21',textDecoration:'none'}}>{novel.genre}</Link>
            <span>›</span>
            <span style={{color:'#2B211B'}}>{novel.title}</span>
          </div>

          {/* 作品情報カード */}
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'20px',marginBottom:14}}>
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'2px 8px',borderRadius:4}}>{novel.genre}</span>
              <span style={{fontSize:10,background:novel.is_serial?'#e8f5e9':'#f5f5f5',color:novel.is_serial?'#2e7d32':'#757575',border:`1px solid ${novel.is_serial?'#a5d6a7':'#e0e0e0'}`,padding:'2px 8px',borderRadius:4}}>
                {novel.is_serial?'連載中':'完結'}
              </span>
              {novel.novel_type && (
                <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'2px 8px',borderRadius:4}}>
                  {novel.novel_type}
                </span>
              )}
              {(novel.tags||[]).map((t: string) => (
                <span key={t} style={{fontSize:10,background:'#FFF9F2',color:'#77706A',border:'1px solid #F0D9C9',padding:'2px 8px',borderRadius:4}}>#{t}</span>
              ))}
            </div>
            <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',lineHeight:1.4,marginBottom:8,fontFamily:"'Noto Serif JP',serif"}}>{novel.title}</h1>
            <div style={{fontSize:13,color:'#77706A',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
              <img src="/author_icon.png" alt="作者" style={{width:18,height:18,objectFit:'contain',opacity:0.7}}/>
              作者：
              <a href={`/author/${author?.user_id}`} style={{color:'#F26A21',textDecoration:'none',fontWeight:600}}>{author?.display_name}</a>
              {!isAuthor && user && author?.user_id && (
                <FollowButton authorId={author.user_id} userId={user.id} initialFollowing={isFollowing} followerCount={followerCount}/>
              )}
              {!user && author?.user_id && (
                <span style={{fontSize:11,color:'#B8AEA8',marginLeft:8}}>フォロワー {followerCount}</span>
              )}
            </div>
            {novel.summary && (
              <div style={{fontSize:13,color:'#5a3a20',lineHeight:1.85,padding:'12px 14px',background:'#FFF9F2',borderRadius:8,borderLeft:'3px solid #f5a060',marginBottom:14,whiteSpace:'pre-wrap'}}>
                {novel.summary}
              </div>
            )}
            {discoverComments && discoverComments.length > 0 && (
              <div style={{margin:'12px 0',borderRadius:10,overflow:'hidden',border:'1.5px solid #a78bfa'}}>
                <div style={{background:'#7c3aed',padding:'6px 14px',fontSize:11,fontWeight:700,color:'#fff'}}>読者の声</div>
                {discoverComments.map((d: any) => d.comment && (
                  <div key={d.id} style={{padding:'10px 14px',borderBottom:'1px solid #ede9fe',background:'#faf5ff'}}>
                    <p style={{fontSize:13,color:'#4c1d95',lineHeight:1.7,margin:0,marginBottom:4}}>「{d.comment}」</p>
                    <div style={{fontSize:11,color:'#a78bfa'}}>{d.display_name}</div>
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
            />
          </div>

          {/* 目次 */}
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>目次（{totalCount}話）</span>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                {user && totalCount > 0 && (
                  <span style={{fontSize:11,color:'#10b981',fontWeight:600}}>
                    ✓ {fmtNum(readCount)}/{fmtNum(totalCount)}話 既読
                  </span>
                )}
                <span style={{fontSize:11,color:'#77706A'}}>
                  最終更新：{episodes?.length ? fmtDate(episodes[episodes.length-1].created_at) : '—'}
                </span>
              </div>
            </div>
            {!episodes || episodes.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>まだ話がありません</div>
            ) : episodes.map((ep) => {
              const isReadEp = readEpisodeIds.has(ep.id)
              return (
                <Link key={ep.id} href={`/novel/${params.id}/episode/${ep.id}`} style={{textDecoration:'none',display:'block'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #FFF1E6',background: isReadEp ? '#e5e7eb' : '#fff'}}>
                    {ep.illust_url && (
                      <img src={ep.illust_url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:4,flexShrink:0}}/>
                    )}
                    <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:6}}>
                      {isReadEp && (
                        <span style={{fontSize:10,color:'#10b981',fontWeight:700,flexShrink:0}}>✓</span>
                      )}
                      <span style={{fontSize:14,fontWeight:500,color: isReadEp ? '#4b5563' : '#2B211B'}}>{ep.title}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      {epLikeCounts[ep.id] > 0 && (
                        <span style={{fontSize:11,color:'#77706A'}}>♡ {fmtNum(epLikeCounts[ep.id])}</span>
                      )}
                      {epCommentCounts[ep.id] > 0 && (
                        <span style={{fontSize:11,color:'#77706A'}}>💬 {fmtNum(epCommentCounts[ep.id])}</span>
                      )}
                      <span style={{fontSize:11,color:'#B8AEA8'}}>{fmtDate(ep.created_at)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
            {episodes && episodes.length > 0 && (
              <div style={{padding:'12px 16px',textAlign:'center',borderTop:'1px solid #F0D9C9'}}>
                <Link href={`/novel/${params.id}/episode/${episodes[0].id}`}
                  style={{display:'inline-block',background:'#F26A21',color:'#fff',fontWeight:700,padding:'10px 32px',borderRadius:20,fontSize:14,textDecoration:'none'}}>
                  最初から読む
                </Link>
              </div>
            )}
          </div>

          {/* 作品コメント */}
          <div style={{marginTop:24}}>
            <NovelCommentSection
              novelId={params.id}
              userId={user?.id || null}
              userName={profile?.display_name || null}
              userIconUrl={profile?.icon_url || null}
              authorId={author?.user_id || ''}
              comments={novelComments}
            />
          </div>
        </div>

        <Sidebar />
      </div>
      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
