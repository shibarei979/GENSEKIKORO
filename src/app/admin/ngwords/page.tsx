import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import NgWordManager from './NgWordManager'

export default async function AdminNgWordsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const adminSupabase = createAdminClient()
  const { data: words } = await adminSupabase
    .from('ng_words')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:700,margin:'0 auto',padding:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <Link href="/admin" style={{fontSize:13,color:'#64748b',textDecoration:'none'}}>← 管理画面</Link>
          <span style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>NGワード設定</span>
          <span style={{fontSize:11,color:'#64748b',background:'#f1f5f9',padding:'2px 8px',borderRadius:8}}>
            {(words||[]).length}件登録中
          </span>
        </div>
        <NgWordManager initialWords={words||[]} />
      </div>
      <Footer user={user} />
    </div>
  )
}
