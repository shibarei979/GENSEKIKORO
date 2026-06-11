import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NovelManager from './NovelManager'

export default async function AdminNovelsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const q = searchParams.q || ''
  const page = Number(searchParams.page || 1)
  const PAGE_SIZE = 20
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase.from('novels').select('id, title, genre, author_id, published, is_r18, created_at', { count: 'exact' })
  if (q) query = (query as any).ilike('title', `%${q}%`)
  const { data: novels, count } = await (query as any).order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)

  const authorIds = Array.from(new Set((novels||[]).map((n: any) => n.author_id))]
  const authorMap: Record<string, string> = {}
  if (authorIds.length > 0) {
    const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds as string[])
    authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
  }
  const novelsWithAuthor = (novels||[]).map((n: any) => ({ ...n, display_name: authorMap[n.author_id]||'' }))

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:900,margin:'0 auto',padding:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <Link href="/admin" style={{fontSize:13,color:'#64748b',textDecoration:'none'}}>← 管理画面</Link>
          <span style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>作品管理</span>
          <span style={{fontSize:13,color:'#64748b'}}>（{count?.toLocaleString()}作品）</span>
        </div>
        <NovelManager initialNovels={novelsWithAuthor} total={count||0} currentPage={page} q={q} />
      </div>
      <Footer user={user} />
    </div>
  )
}
