import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MessageSender from './MessageSender'

export default async function AdminMessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const adminSupabase = createAdminClient()
  const { data: users } = await adminSupabase
    .from('profiles')
    .select('user_id, display_name, email, icon_url')
    .order('created_at', { ascending: false })

  const { data: sentMessages } = await adminSupabase
    .from('admin_messages')
    .select('id, to_user_id, subject, body, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // 受信者名をマップ
  const userMap = Object.fromEntries((users||[]).map((u:any) => [u.user_id, u]))
  const messages = (sentMessages||[]).map((m:any) => ({
    ...m,
    to_name: userMap[m.to_user_id]?.display_name || '不明',
    to_email: userMap[m.to_user_id]?.email || '',
  }))

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:900,margin:'0 auto',padding:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <Link href="/admin" style={{fontSize:13,color:'#64748b',textDecoration:'none'}}>← 管理画面</Link>
          <span style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>ユーザーへのDM</span>
        </div>
        <MessageSender users={users||[]} sentMessages={messages} />
      </div>
      <Footer user={user} />
    </div>
  )
}
