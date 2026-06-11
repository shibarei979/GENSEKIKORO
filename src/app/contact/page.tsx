import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Link from 'next/link'
import ContactForm from './ContactForm'

const navLinks = [
  { href: '/about',    label: '原石航路とは' },
  { href: '/guide',    label: '投稿ガイド' },
  { href: '/faq',      label: 'よくある質問' },
  { href: '/help',     label: 'ヘルプ・FAQ' },
  { href: '/contact',  label: 'お問い合わせ', active: true },
  { href: '/feedback', label: 'ご意見・ご要望' },
]

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',overflowX:'auto'}}>
        <div style={{maxWidth:860,margin:'0 auto',padding:'0 24px',display:'flex'}}>
          {navLinks.map(n => (
            <Link key={n.href} href={n.href}
              style={{padding:'12px 18px',fontSize:13,color:(n as any).active?'#F26A21':'#77706A',textDecoration:'none',whiteSpace:'nowrap',
                borderBottom:(n as any).active?'2px solid #F26A21':'2px solid transparent',fontWeight:(n as any).active?700:400}}>
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:'0 auto',padding:'40px 24px 60px'}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:24,fontWeight:700,color:'#2B211B',marginBottom:4}}>お問い合わせ</h1>
          <p style={{fontSize:13,color:'#77706A'}}>ご不明な点はお気軽にお問い合わせください</p>
        </div>

        {/* 確認事項 */}
        <div style={{background:'#FFF1E6',border:'1px solid #f5b080',borderRadius:12,padding:'16px 20px',marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:700,color:'#F26A21',marginBottom:8}}>お問い合わせ前にご確認ください</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {['よくある質問に同じ内容がないか','ヘルプ・FAQに解決方法がないか','ブラウザの再読み込みで解決しないか','ログアウト・再ログインで解決しないか'].map((item,i) => (
              <div key={i} style={{fontSize:12,color:'#2B211B',display:'flex',gap:6}}>
                <span style={{color:'#F26A21'}}>✓</span>{item}
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <Link href="/faq" style={{fontSize:12,color:'#F26A21',textDecoration:'none',border:'1px solid #f5b080',borderRadius:8,padding:'4px 12px',background:'#FFF9F2'}}>よくある質問</Link>
            <Link href="/help" style={{fontSize:12,color:'#F26A21',textDecoration:'none',border:'1px solid #f5b080',borderRadius:8,padding:'4px 12px',background:'#FFF9F2'}}>ヘルプ・FAQ</Link>
          </div>
        </div>

        {/* お問い合わせフォーム */}
        <ContactForm userId={user?.id || null} userEmail={profile?.email || null} userName={profile?.display_name || null} />
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
