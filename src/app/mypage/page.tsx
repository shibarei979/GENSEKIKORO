import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MypageClient from './MypageClient'

export default async function MypagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirectTo=/mypage')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

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
    .from('novels')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const { data: bookmarkedNovels } = await supabase
    .from('bookmarks')
    .select('novel_id, novels(id, title, genre, is_serial, novel_type, profiles(display_name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // 募集中コンテスト取得
  const now = new Date().toISOString()
  const { data: contests } = await supabase
    .from('contests')
    .select('id, title, deadline, is_site_contest')
    .eq('is_published', true)
    .eq('is_site_contest', true)
    .or(`deadline.is.null,deadline.gt.${now}`)
    .order('created_at', { ascending: false })

  // 自分の応募済みエントリー取得
  const { data: entries } = await supabase
    .from('contest_entries')
    .select('contest_id, novel_id')
    .eq('user_id', user.id)

  const defaultProfile = {
    user_id: user.id,
    display_name: user.email?.split('@')[0] || 'ユーザー',
    email: user.email || '',
    icon_url: '',
    login_provider: 'google',
    user_number: null,
    bio: null,
    birthdate: null,
    age_verified: false,
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
    />
  )
}
