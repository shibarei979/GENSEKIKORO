import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string; epId: string } }) {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const [{ data: episode }, { data: novel }] = await Promise.all([
    supabase.from('episodes').select('title, illust_url').eq('id', params.epId).maybeSingle(),
    supabase.from('novels').select('title').eq('id', params.id).maybeSingle(),
  ])
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://genseki-koro.vercel.app'
  const ogImage = episode?.illust_url || `${siteUrl}/og-image.png`
  const title = episode?.title && novel?.title
    ? `${novel.title}「${episode.title}」| 原石航路`
    : '原石航路'
  const description = novel?.title
    ? `${novel.title} - ライトノベル投稿サイト「原石航路」`
    : 'ライトノベル投稿サイト「原石航路」'
  return {
    title, description,
    openGraph: { title, description, images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import CommentSection from './CommentSection'
import EpisodeLikeButton from './EpisodeLikeButton'
import ReadButton from './ReadButton'
import EpisodeBody from './EpisodeBody'
import { QuoteProvider } from './QuoteContext'

interface Props { params: { id: string; epId: string } }

export default async function EpisodePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: episode } = await supabase
    .from('episodes').select('*').eq('id', params.epId).maybeSingle()
  if (!episode) notFound()

  const { data: novel } = await supabase
    .from('novels').select('id, title, genre, is_serial, author_id, views').eq('id', params.id).maybeSingle()
  if (!novel) notFound()

  // ===== 予約投稿の自動公開判定 =====
  // 予約時刻を過ぎていれば公開状態に更新する。作者本人は予約中でも閲覧可（プレビュー目的）。
  const isOwner = user?.id === novel.author_id
  if (episode.published === false && episode.scheduled_at) {
    const scheduledTime = new Date(episode.scheduled_at).getTime()
    if (scheduledTime <= Date.now()) {
      await supabase.from('episodes').update({ published: true, scheduled_at: null }).eq('id', episode.id)
      episode.published = true
      episode.scheduled_at = null
      // 作品自体がまだ非公開の場合も公開にする
      const { data: novelPubCheck } = await supabase.from('novels').select('published').eq('id', novel.id).maybeSingle()
      if (novelPubCheck && novelPubCheck.published === false) {
        await supabase.from('novels').update({ published: true }).eq('id', novel.id)
      }
    } else if (!isOwner) {
      notFound()
    }
  } else if (episode.published === false && !isOwner) {
    notFound()
  }

  const { data: authorData } = await supabase
    .from('profiles').select('display_name, user_id').eq('user_id', novel.author_id).maybeSingle()

  const { data: allEps } = await supabase
    .from('episodes').select('id, ep_number, title, published, scheduled_at').eq('novel_id', params.id).order('ep_number', { ascending: true })

  const { data: rawComments } = await supabase
    .from('comments')
    .select('id, body, created_at, user_id, is_pinned')
    .eq('novel_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const commentIds = (rawComments || []).map((c: any) => c.id)
  let commentLikeCounts: Record<string, number> = {}
  if (commentIds.length > 0) {
    const { data: clData } = await supabase.from('comment_likes').select('comment_id').in('comment_id', commentIds)
    clData?.forEach((cl: any) => { commentLikeCounts[cl.comment_id] = (commentLikeCounts[cl.comment_id] || 0) + 1 })
  }

  const commentUserIds = Array.from(new Set((rawComments || []).map((c: any) => c.user_id).filter(Boolean)))
  let commentProfiles: Record<string, {display_name: string, icon_url: string}> = {}
  if (commentUserIds.length > 0) {
    const { data: cpData } = await supabase.from('profiles').select('user_id, display_name, icon_url').in('user_id', commentUserIds as string[])
    cpData?.forEach((p: any) => { commentProfiles[p.user_id] = { display_name: p.display_name || '名無し', icon_url: p.icon_url || '' } })
  }
  const comments = (rawComments || []).map((c: any) => ({
    id: c.id, body: c.body, created_at: c.created_at, user_id: c.user_id,
    display_name: commentProfiles[c.user_id]?.display_name || '名無し',
    icon_url: commentProfiles[c.user_id]?.icon_url || '',
    like_count: commentLikeCounts[c.id] || 0,
    is_pinned: c.is_pinned || false,
  }))

  const { count: epLikeCount } = await supabase
    .from('episode_likes').select('*', { count: 'exact', head: true }).eq('episode_id', params.epId)
  let epLiked = false
  if (user) {
    const { data: el } = await supabase.from('episode_likes').select('user_id')
      .eq('episode_id', params.epId).eq('user_id', user.id).maybeSingle()
    epLiked = !!el
  }

  let isRead = false
  if (user) {
    const { data: rd } = await supabase.from('read_episodes')
      .select('id').eq('user_id', user.id).eq('episode_id', params.epId).maybeSingle()
    isRead = !!rd
  }

  // 読者向けには、未公開（予約投稿中）の話をナビゲーションから除外
  const visibleEps = isOwner ? (allEps || []) : (allEps || []).filter(e => e.published !== false)
  const currentIdx = visibleEps.findIndex(e => e.id === params.epId) ?? -1
  const prevEp = currentIdx > 0 ? visibleEps[currentIdx - 1] : null
  const nextEp = currentIdx >= 0 && currentIdx < visibleEps.length - 1 ? visibleEps[currentIdx + 1] : null

  try {
    await supabase.from('page_views').insert({ episode_id: params.epId, user_id: user?.id || null })
  } catch (_) {}

  const author = authorData as any

  function fmtDate(d: string) {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`
  }

  const navBtn = {fontSize:12,color:'#F26A21',border:'1px solid #F0D9C9',padding:'6px 14px',borderRadius:16,background:'#fff',textDecoration:'none'} as const

  return (
    <QuoteProvider>
    <div style={{minHeight:'100vh',background:'#FFF9F2'}}>
      <Header profile={profile} user={user} />

      {/* ===== デスクトップレイアウト（元のまま） ===== */}
      <div className="desktop-only" style={{maxWidth:1200,margin:'0 auto',padding:'20px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          {/* パンくず */}
          <div style={{fontSize:12,color:'#77706A',marginBottom:14,display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Link href="/" style={{color:'#F26A21',textDecoration:'none'}}>ホーム</Link>
            <span>›</span>
            <Link href={`/novel/${params.id}`} style={{color:'#F26A21',textDecoration:'none'}}>{novel.title}</Link>
            <span>›</span>
            <span style={{color:'#2B211B'}}>{episode.title}</span>
          </div>
          {/* 予約投稿中バナー（作者のみ） */}
          {isOwner && episode.published === false && episode.scheduled_at && (
            <div style={{background:'#eff6ff',border:'1.5px solid #93c5fd',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:12,color:'#1d4ed8',fontWeight:600}}>
              📅 この話は予約投稿中です。{new Date(episode.scheduled_at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} に公開されます（このプレビューは作者にのみ表示されています）
            </div>
          )}
          {/* 上ナビ */}
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:16,gap:8}}>
            {prevEp ? <Link href={`/novel/${params.id}/episode/${prevEp.id}`} style={navBtn}>← 前の話</Link> : <div/>}
            <Link href={`/novel/${params.id}`} style={{...navBtn,color:'#77706A'}}>目次</Link>
            {nextEp ? <Link href={`/novel/${params.id}/episode/${nextEp.id}`} style={navBtn}>次の話 →</Link> : <div/>}
          </div>
          {/* 挿絵 */}
          {episode.illust_url && (
            <div style={{textAlign:'center',marginBottom:12}}>
              <img src={episode.illust_url} alt="挿絵" style={{maxWidth:'100%',maxHeight:480,objectFit:'contain',borderRadius:8}}/>
            </div>
          )}
          <EpisodeBody title={episode.title} body={episode.body} preface={episode.preface} afterword={episode.afterword} authorName={author?.display_name}/>
          {/* いいね・読了・シェア */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <EpisodeLikeButton episodeId={params.epId} userId={user?.id||null} initialLiked={epLiked} initialCount={epLikeCount??0}/>
            {user && <ReadButton novelId={params.id} episodeId={params.epId} userId={user.id} initialRead={isRead}/>}
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`「${novel.title}」\n「${episode.title}」\n#原石航路 #ライトノベル\n`)}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL||''}/novel/${params.id}/episode/${params.epId}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:20,border:'1.5px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:13,fontWeight:500,textDecoration:'none'}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              シェア
            </a>
          </div>
          {/* 下ナビ */}
          <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:16}}>
            {prevEp ? (
              <Link href={`/novel/${params.id}/episode/${prevEp.id}`}
                style={{flex:1,textAlign:'center',fontSize:13,color:'#F26A21',border:'1.5px solid #F0D9C9',padding:'10px',borderRadius:10,background:'#fff',textDecoration:'none'}}>
                ← 前の話<br/><span style={{fontSize:11,color:'#77706A'}}>{prevEp.title}</span>
              </Link>
            ) : <div style={{flex:1}}/>}
            {nextEp ? (
              <Link href={`/novel/${params.id}/episode/${nextEp.id}`}
                style={{flex:1,textAlign:'center',fontSize:13,color:'#F26A21',border:'1.5px solid #F26A21',padding:'10px',borderRadius:10,background:'#FFF1E6',textDecoration:'none'}}>
                次の話 →<br/><span style={{fontSize:11,color:'#77706A'}}>{nextEp.title}</span>
              </Link>
            ) : (
              <div style={{flex:1,textAlign:'center',fontSize:13,color:'#77706A',border:'1px solid #F0D9C9',padding:'10px',borderRadius:10,background:'#fff'}}>
                最新話です<br/>
                <Link href={`/novel/${params.id}`} style={{fontSize:11,color:'#F26A21',textDecoration:'none'}}>目次に戻る</Link>
              </div>
            )}
          </div>
          {/* 作品情報 */}
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1}}>
              <Link href={`/novel/${params.id}`} style={{fontSize:14,fontWeight:700,color:'#2B211B',textDecoration:'none',display:'block',marginBottom:2}}>{novel.title}</Link>
              <span style={{fontSize:12,color:'#2B211B'}}>作者：{author?.display_name}</span>
            </div>
            <Link href={`/novel/${params.id}`} style={{fontSize:12,border:'1px solid #F0D9C9',padding:'6px 14px',borderRadius:14,color:'#77706A',background:'#FFF9F2',textDecoration:'none'}}>
              目次を見る
            </Link>
          </div>
          <CommentSection novelId={params.id} episodeId={params.epId} userId={user?.id||null} userName={profile?.display_name||null} userIconUrl={profile?.icon_url||null} authorId={novel.author_id} comments={comments}/>
        </div>
        <Sidebar />
      </div>

      {/* ===== モバイルレイアウト ===== */}
      <div className="mobile-only" style={{padding:'12px 16px 0'}}>
        {/* パンくず：コンパクト */}
        <div style={{fontSize:11,color:'#77706A',marginBottom:10,display:'flex',alignItems:'center',gap:4,overflow:'hidden'}}>
          <Link href="/" style={{color:'#F26A21',textDecoration:'none',flexShrink:0}}>ホーム</Link>
          <span style={{flexShrink:0}}>›</span>
          <Link href={`/novel/${params.id}`} style={{color:'#F26A21',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{novel.title}</Link>
          <span style={{flexShrink:0}}>›</span>
          <span style={{color:'#2B211B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{episode.title}</span>
        </div>

        {/* 上ナビ：3ボタン均等 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:6,marginBottom:12}}>
          {prevEp
            ? <Link href={`/novel/${params.id}/episode/${prevEp.id}`} style={{...navBtn,textAlign:'center',display:'block'}}>← 前の話</Link>
            : <div/>
          }
          <Link href={`/novel/${params.id}`} style={{...navBtn,color:'#77706A',textAlign:'center',display:'block',whiteSpace:'nowrap'}}>目次</Link>
          {nextEp
            ? <Link href={`/novel/${params.id}/episode/${nextEp.id}`} style={{...navBtn,textAlign:'center',display:'block'}}>次の話 →</Link>
            : <div/>
          }
        </div>

        {/* 挿絵 */}
        {episode.illust_url && (
          <div style={{textAlign:'center',marginBottom:10}}>
            <img src={episode.illust_url} alt="挿絵" style={{maxWidth:'100%',maxHeight:300,objectFit:'contain',borderRadius:8}}/>
          </div>
        )}

        {/* 本文 */}
        <EpisodeBody title={episode.title} body={episode.body} preface={episode.preface} afterword={episode.afterword} authorName={author?.display_name}/>

        {/* いいね・読了・シェア */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          <EpisodeLikeButton episodeId={params.epId} userId={user?.id||null} initialLiked={epLiked} initialCount={epLikeCount??0}/>
          {user && <ReadButton novelId={params.id} episodeId={params.epId} userId={user.id} initialRead={isRead}/>}
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`「${novel.title}」\n「${episode.title}」\n#原石航路 #ライトノベル\n`)}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL||''}/novel/${params.id}/episode/${params.epId}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{display:'inline-flex',alignItems:'center',gap:5,padding:'8px 14px',borderRadius:20,border:'1.5px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:12,fontWeight:500,textDecoration:'none'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            シェア
          </a>
        </div>

        {/* 下ナビ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {prevEp ? (
            <Link href={`/novel/${params.id}/episode/${prevEp.id}`}
              style={{textAlign:'center',fontSize:12,color:'#F26A21',border:'1.5px solid #F0D9C9',padding:'10px 8px',borderRadius:10,background:'#fff',textDecoration:'none',display:'block'}}>
              ← 前の話<br/><span style={{fontSize:10,color:'#77706A',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prevEp.title}</span>
            </Link>
          ) : <div/>}
          {nextEp ? (
            <Link href={`/novel/${params.id}/episode/${nextEp.id}`}
              style={{textAlign:'center',fontSize:12,color:'#F26A21',border:'1.5px solid #F26A21',padding:'10px 8px',borderRadius:10,background:'#FFF1E6',textDecoration:'none',display:'block'}}>
              次の話 →<br/><span style={{fontSize:10,color:'#77706A',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nextEp.title}</span>
            </Link>
          ) : (
            <div style={{textAlign:'center',fontSize:12,color:'#77706A',border:'1px solid #F0D9C9',padding:'10px 8px',borderRadius:10,background:'#fff'}}>
              最新話です<br/>
              <Link href={`/novel/${params.id}`} style={{fontSize:11,color:'#F26A21',textDecoration:'none'}}>目次に戻る</Link>
            </div>
          )}
        </div>

        {/* 作品情報 */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,padding:'12px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <Link href={`/novel/${params.id}`} style={{fontSize:13,fontWeight:700,color:'#2B211B',textDecoration:'none',display:'block',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{novel.title}</Link>
            <span style={{fontSize:11,color:'#2B211B'}}>作者：{author?.display_name}</span>
          </div>
          <Link href={`/novel/${params.id}`} style={{fontSize:11,border:'1px solid #F0D9C9',padding:'5px 10px',borderRadius:12,color:'#77706A',background:'#FFF9F2',textDecoration:'none',flexShrink:0}}>
            目次
          </Link>
        </div>

        {/* コメント */}
        <CommentSection novelId={params.id} episodeId={params.epId} userId={user?.id||null} userName={profile?.display_name||null} userIconUrl={profile?.icon_url||null} authorId={novel.author_id} comments={comments}/>

        <div style={{height:80}}/>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
    </QuoteProvider>
  )
}
