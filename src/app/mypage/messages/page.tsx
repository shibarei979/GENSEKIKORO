import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let profile = null
  const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  profile = data

  const { data: messages } = await supabase
    .from('admin_messages')
    .select('*')
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false })

  // 未読を既読に
  const unreadIds = (messages||[]).filter((m:any) => !m.is_read).map((m:any) => m.id)
  if (unreadIds.length > 0) {
    await supabase.from('admin_messages').update({ is_read: true }).in('id', unreadIds)
  }

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:700,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:24}}>
          <Link href="/mypage" style={{fontSize:13,color:'#F26A21',textDecoration:'none'}}>← マイページ</Link>
          <span style={{fontSize:18,fontWeight:700,color:'#2B211B'}}>運営からのメッセージ</span>
        </div>

        {(!messages || messages.length === 0) ? (
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'48px',textAlign:'center',color:'#B8AEA8',fontSize:14}}>
            メッセージはまだありません
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {messages.map((m: any) => (
              <div key={m.id} style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'20px 24px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 8px',borderRadius:4}}>
                    運営
                  </span>
                  <span style={{fontSize:11,color:'#B8AEA8',marginLeft:'auto'}}>
                    {new Date(m.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:10}}>{m.subject}</div>
                <div style={{fontSize:13,color:'#77706A',lineHeight:1.85,whiteSpace:'pre-wrap'}}>{m.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer user={user} />
    </div>
  )
}
