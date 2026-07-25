import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ContestManager from '@/components/admin/contests/contest-manager'

export const dynamic = 'force-dynamic'
import { appConfig } from '@/config'

export default async function AdminContestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const adminSupabase = createAdminClient()
  const { data: contests } = await adminSupabase
    .from('contests').select('*').order('created_at', { ascending: false })

  const { data: allEntries } = await adminSupabase
    .from('contest_entries')
    .select('contest_id, novel_id, user_id, created_at')
    .order('created_at', { ascending: false })

  const novelIds: string[] = Array.from(new Set((allEntries||[]).map((e:any) => e.novel_id as string).filter(Boolean)))
  const userIds: string[]  = Array.from(new Set((allEntries||[]).map((e:any) => e.user_id as string).filter(Boolean)))

  let novelMap: Record<string, { title:string; genre:string; summary:string }> = {}
  let authorMap: Record<string,string> = {}
  let likeMap: Record<string,number> = {}
  let discoverMap: Record<string,number> = {}

  if (novelIds.length > 0) {
    const { data: novels, error: novelError } = await adminSupabase.from('novels').select('id, title, genre, summary').in('id', novelIds)
    if (novelError) console.error('novels fetch error:', novelError)
    console.log('novelIds:', novelIds, 'novels:', novels)
    novels?.forEach((n:any) => { novelMap[n.id] = { title: n.title, genre: n.genre, summary: n.summary || '' } })

    const { data: likes, error: likesError } = await adminSupabase.from('likes').select('novel_id').in('novel_id', novelIds)
    if (likesError) console.error('likes fetch error:', likesError)
    likes?.forEach((l:any) => { likeMap[l.novel_id] = (likeMap[l.novel_id] || 0) + 1 })

    const { data: discovers } = await adminSupabase.from('discovers').select('novel_id').eq('is_pending', false).in('novel_id', novelIds)
    discovers?.forEach((d:any) => { discoverMap[d.novel_id] = (discoverMap[d.novel_id] || 0) + 1 })
  }
  if (userIds.length > 0) {
    const { data: profiles } = await adminSupabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
    profiles?.forEach((p:any) => { authorMap[p.user_id] = p.display_name })
  }

  const siteUrl = appConfig.siteUrl

  const entriesMap: Record<string, any[]> = {}
  for (const e of (allEntries||[])) {
    if (!entriesMap[e.contest_id]) entriesMap[e.contest_id] = []
    const novel = novelMap[e.novel_id]
    entriesMap[e.contest_id].push({
      novel_id: e.novel_id,
      novel_title: novel?.title || '不明',
      novel_genre: novel?.genre || '',
      novel_summary: novel?.summary || '',
      novel_url: `${siteUrl}/novel/${e.novel_id}`,
      author_name: authorMap[e.user_id] || '不明',
      like_count: likeMap[e.novel_id] || 0,
      discover_count: discoverMap[e.novel_id] || 0,
      created_at: e.created_at,
    })
  }

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:900,margin:'0 auto',padding:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <Link href="/admin" style={{fontSize:13,color:'#64748b',textDecoration:'none'}}>← 管理画面</Link>
          <span style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>コンテスト管理</span>
        </div>
        <ContestManager initialContests={contests||[]} entriesMap={entriesMap} />
      </div>
      <Footer user={user} />
    </div>
  )
}
