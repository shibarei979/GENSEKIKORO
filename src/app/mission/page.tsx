import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import MissionClient from './MissionClient'

export const dynamic = 'force-dynamic'

export default async function MissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  // ユーザーの行動データを取得
  let stats = {
    likeCount: 0,
    discoverCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    novelCount: 0,
    episodeCount: 0,
    followCount: 0,
  }

  if (user) {
    const [likes, discovers, comments, bookmarks, novels, follows] = await Promise.all([
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('discovers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('novels').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('published', true),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ])
    const { data: episodes } = await supabase.from('episodes')
      .select('id', { count: 'exact' })
      .in('novel_id', (await supabase.from('novels').select('id').eq('author_id', user.id)).data?.map((n:any)=>n.id) || [])
    stats = {
      likeCount: likes.count || 0,
      discoverCount: discovers.count || 0,
      commentCount: comments.count || 0,
      bookmarkCount: bookmarks.count || 0,
      novelCount: novels.count || 0,
      episodeCount: episodes?.length || 0,
      followCount: follows.count || 0,
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user}/>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <MissionClient user={user} stats={stats}/>
          <div className="mobile-only" style={{height:80}}/>
        </div>
        <div className="desktop-only"><Sidebar/></div>
      </div>
      <AdBanner/>
      <Footer user={user}/>
    </div>
  )
}
