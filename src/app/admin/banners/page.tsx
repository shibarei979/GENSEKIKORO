import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import BannerManager from '@/components/admin/banners/banner-manager'

export default async function AdminBannersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const { data: banners } = await supabase.from('banners').select('*').order('created_at', { ascending: false })

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:900,margin:'0 auto',padding:'32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <Link href="/admin" style={{fontSize:13,color:'#64748b',textDecoration:'none'}}>← 管理画面</Link>
          <span style={{fontSize:18,fontWeight:800,color:'#1e293b'}}>バナー管理</span>
        </div>
        <BannerManager initialBanners={banners||[]} />
      </div>
      <Footer user={user} />
    </div>
  )
}
