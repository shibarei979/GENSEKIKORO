import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import UserManager from '@/components/admin/users/user-manager'

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const q = searchParams.q || ''
  const page = Number(searchParams.page || 1)
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase.from('profiles').select('*', { count: 'exact' })
  if (q) query = (query as any).or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
  const { data: users, count } = await (query as any).order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:900,margin:'0 auto',padding:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <Link href="/admin" style={{fontSize:13,color:'#64748b',textDecoration:'none'}}>← 管理画面</Link>
          <span style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>ユーザー管理</span>
          <span style={{fontSize:13,color:'#64748b'}}>（{count?.toLocaleString()}人）</span>
        </div>
        <UserManager initialUsers={users||[]} total={count||0} currentPage={page} q={q} />
      </div>
      <Footer user={user} />
    </div>
  )
}
