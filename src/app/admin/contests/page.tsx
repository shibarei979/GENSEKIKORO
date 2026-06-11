import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ContestManager from './ContestManager'

export default async function AdminContestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const adminSupabase = createAdminClient()
  const { data: contests } = await adminSupabase
    .from('contests').select('*').order('created_at', { ascending: false })

  // 応募データ取得
  const { data: allEntries } = await adminSupabase
    .from('contest_entries')
    .select('contest_id, novel_id, user_id, created_at')
    .order('created_at', { ascending: false })

  // novel_id → タイトル・作者名マップ
  const novelIds = Array.from(new Set((allEntries||[]).map((e:any) => e.novel_id)))
  const userIds  = Array.from(new Set((allEntries||[]).map((e:any) => e.user_id)))
  let novelMap: Record<string,string> = {}
  let authorMap: Record<string,string> = {}

  if (novelIds.length > 0) {
    const { data: novels } = await adminSupabase.from('novels').select('id, title').in('id', novelIds)
    novels?.forEach((n:any) => { novelMap[n.id] = n.title })
  }
  if (userIds.length > 0) {
    const { data: profiles } = await adminSupabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
    profiles?.forEach((p:any) => { authorMap[p.user_id] = p.display_name })
  }

  // contest_id → entries マップ
  const entriesMap: Record<string, any[]> = {}
  for (const e of (allEntries||[])) {
    if (!entriesMap[e.contest_id]) entriesMap[e.contest_id] = []
    entriesMap[e.contest_id].push({
      novel_id: e.novel_id,
      novel_title: novelMap[e.novel_id] || '不明',
      author_name: authorMap[e.user_id] || '不明',
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
