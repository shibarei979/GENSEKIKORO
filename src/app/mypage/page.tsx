import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MypageClient from './MypageClient'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirectTo=/mypage')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  if (!profile) {
    await supabase.from('profiles').upsert({
      user_id: user.id,
      display_name: user.email?.split('@')[0] || 'ユーザー',
      email: user.email || '',
      icon_url: '',
    })
  }

  const [
    { count: followerCount },
    { count: followingCount2 },
  ] = await Promise.all([
    supabase.from('follows').select('*', { count:'exact', head:true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count:'exact', head:true }).eq('follower_id', user.id),
  ])

  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id, profiles!follows_following_id_fkey(user_id, display_name, icon_url)')
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const followingAuthors = (followingData || []).map((f: any) => f.profiles).filter(Boolean)

  const { data: novels } = await supabase
    .from('novels').select('*').eq('author_id', user.id).order('created_at', { ascending: false })

  // 作品ごとのいいね・コメント・閲覧数
  const novelIds = (novels || []).map((n: any) => n.id)
  const novelLikeMap: Record<string,number> = {}
  const novelCommentMap: Record<string,number> = {}
  const novelViewMap: Record<string,number> = {}
  const novelEpCountMap: Record<string,number> = {}
  if (novelIds.length > 0) {
    const [likesData, commentsData, viewsData, epsData] = await Promise.all([
      supabase.from('likes').select('novel_id').in('novel_id', novelIds),
      supabase.from('comments').select('novel_id').in('novel_id', novelIds),
      supabase.from('page_views').select('novel_id').in('novel_id', novelIds),
      supabase.from('episodes').select('novel_id').in('novel_id', novelIds).eq('published', true),
    ])
    likesData.data?.forEach((l:any) => { novelLikeMap[l.novel_id] = (novelLikeMap[l.novel_id]||0)+1 })
    commentsData.data?.forEach((c:any) => { novelCommentMap[c.novel_id] = (novelCommentMap[c.novel_id]||0)+1 })
    viewsData.data?.forEach((v:any) => { novelViewMap[v.novel_id] = (novelViewMap[v.novel_id]||0)+1 })
    epsData.data?.forEach((e:any) => { novelEpCountMap[e.novel_id] = (novelEpCountMap[e.novel_id]||0)+1 })
  }

  // カレンダー用：過去1年のエピソード投稿日
  const oneYearAgo = new Date(Date.now() - 365*24*60*60*1000).toISOString()
  const { data: calendarEps } = await supabase
    .from('episodes').select('created_at').in('novel_id', novelIds.length > 0 ? novelIds : [''])
    .eq('published', true).gte('created_at', oneYearAgo)
  const postDates = (calendarEps||[]).map((e:any) => e.created_at.slice(0,10))

  const { data: bookmarkedNovels } = await supabase
    .from('bookmarks')
    .select('novel_id, created_at, folder_id, novels(id, title, genre, is_serial, novel_type, summary, tags, author_id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // 保存済み作品の作者名
  const bmAuthorIds = Array.from(new Set((bookmarkedNovels||[]).map((b:any) => b.novels?.author_id).filter(Boolean)))
  const bmAuthorMap: Record<string,string> = {}
  if (bmAuthorIds.length > 0) {
    const { data: bmAuthors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', bmAuthorIds as string[])
    bmAuthors?.forEach((a:any) => { bmAuthorMap[a.user_id] = a.display_name })
  }

  const now = new Date().toISOString()
  const { data: contests } = await supabase
    .from('contests').select('id, title, deadline, is_site_contest')
    .eq('is_published', true).eq('is_site_contest', true)
    .or(`deadline.is.null,deadline.gt.${now}`).order('created_at', { ascending: false })

  const { data: entries } = await supabase.from('contest_entries').select('contest_id, novel_id').eq('user_id', user.id)

  const { data: claimedMissions } = await supabase.from('user_missions').select('mission_id').eq('user_id', user.id)
  const claimedMissionIds = (claimedMissions || []).map((r: any) => r.mission_id)

  // 閲覧履歴
  const { data: views } = await supabase
    .from('page_views').select('episode_id, novel_id, viewed_at')
    .eq('user_id', user.id).order('viewed_at', { ascending: false }).limit(200)

  const epIds = Array.from(new Set((views||[]).map((v:any) => v.episode_id).filter(Boolean)))
  const latestViewMap: Record<string,string> = {}
  views?.forEach((v:any) => { if (v.episode_id && !latestViewMap[v.episode_id]) latestViewMap[v.episode_id] = v.viewed_at })

  let historyItems: any[] = []
  if (epIds.length > 0) {
    const { data: episodes } = await supabase
      .from('episodes').select('id, title, ep_number, novel_id, novels(id, title, genre, author_id, summary, tags, novel_type, is_serial)')
      .in('id', epIds as string[])

    const authorIds2 = Array.from(new Set((episodes||[]).map((e:any) => e.novels?.author_id).filter(Boolean)))
    const authorMap2: Record<string,string> = {}
    if (authorIds2.length > 0) {
      const { data: authors2 } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds2 as string[])
      authors2?.forEach((a:any) => { authorMap2[a.user_id] = a.display_name })
    }

    const novelMap: Record<string,any> = {}
    episodes?.forEach((ep:any) => {
      const novel = ep.novels; if (!novel) return
      const viewedAt = latestViewMap[ep.id]
      if (!novelMap[novel.id] || viewedAt > novelMap[novel.id].viewedAt) {
        novelMap[novel.id] = {
          novelId: novel.id, novelTitle: novel.title,
          genre: novel.genre, novelType: novel.novel_type||'',
          isSerial: novel.is_serial, authorId: novel.author_id,
          displayName: authorMap2[novel.author_id]||'',
          summary: novel.summary||'', tags: novel.tags||[],
          epId: ep.id, epTitle: ep.title, epNumber: ep.ep_number, viewedAt,
        }
      }
    })
    historyItems = Object.values(novelMap).sort((a,b) => b.viewedAt > a.viewedAt ? 1 : -1)
  }

  const historyNovelIds = historyItems.map((i:any) => i.novelId)
  const firstEpMap: Record<string,string> = {}
  if (historyNovelIds.length > 0) {
    const { data: firstEps } = await supabase.from('episodes').select('id, novel_id, ep_number')
      .in('novel_id', historyNovelIds).eq('published', true).order('ep_number', { ascending: true })
    firstEps?.forEach((ep:any) => { if (!firstEpMap[ep.novel_id]) firstEpMap[ep.novel_id] = ep.id })
  }

  const charCountMap: Record<string,number> = {}
  const likeMap2: Record<string,number> = {}
  if (historyNovelIds.length > 0) {
    const [epData, likeData] = await Promise.all([
      supabase.from('episodes').select('novel_id, body').in('novel_id', historyNovelIds),
      supabase.from('likes').select('novel_id').in('novel_id', historyNovelIds),
    ])
    epData.data?.forEach((ep:any) => { charCountMap[ep.novel_id] = (charCountMap[ep.novel_id]||0)+(ep.body?.length||0) })
    likeData.data?.forEach((l:any) => { likeMap2[l.novel_id] = (likeMap2[l.novel_id]||0)+1 })
  }

  // ミッション用stats
  let missionStats = { likeCount:0, discoverCount:0, commentCount:0, bookmarkCount:0, novelCount:0, episodeCount:0, followCount:0 }
  const [likesM, discoversM, commentsM, bookmarksM, novelsCountM, followsCountM] = await Promise.all([
    supabase.from('likes').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('discovers').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('comments').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('bookmarks').select('*',{count:'exact',head:true}).eq('user_id',user.id),
    supabase.from('novels').select('*',{count:'exact',head:true}).eq('author_id',user.id).eq('published',true),
    supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',user.id),
  ])
  const myNovelIds2 = (await supabase.from('novels').select('id').eq('author_id',user.id)).data?.map((n:any)=>n.id)||[]
  let episodeCount2 = 0
  if (myNovelIds2.length > 0) {
    const {count} = await supabase.from('episodes').select('*',{count:'exact',head:true}).in('novel_id',myNovelIds2)
    episodeCount2 = count||0
  }
  missionStats = {
    likeCount: likesM.count||0, discoverCount: discoversM.count||0,
    commentCount: commentsM.count||0, bookmarkCount: bookmarksM.count||0,
    novelCount: novelsCountM.count||0, episodeCount: episodeCount2,
    followCount: followsCountM.count||0,
  }

  const defaultProfile = {
    user_id: user.id, display_name: user.email?.split('@')[0] || 'ユーザー',
    email: user.email || '', icon_url: '', login_provider: 'google',
    user_number: null, bio: null, birthdate: null, age_verified: false,
  }

  return (
    <MypageClient
      profile={profile || defaultProfile}
      novels={novels ?? []}
      bookmarkedNovels={bookmarkedNovels ?? []}
      followingAuthors={followingAuthors}
      followerCount={followerCount || 0}
      followingCount={followingCount2 || 0}
      contests={contests || []}
      initialEntries={entries || []}
      claimedMissionIds={claimedMissionIds}
      missionStats={missionStats}
      historyItems={historyItems}
      firstEpMap={firstEpMap}
      charCountMap={charCountMap}
      likeMap={likeMap2}
      novelLikeMap={novelLikeMap}
      postDates={postDates}
      novelCommentMap={novelCommentMap}
      novelViewMap={novelViewMap}
      novelEpCountMap={novelEpCountMap}
      bmAuthorMap={bmAuthorMap}
    />
  )
}
