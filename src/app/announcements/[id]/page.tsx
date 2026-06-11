import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const TYPE_OPTIONS: Record<string, { label: string; color: string }> = {
  info:      { label: 'お知らせ',       color: '#3b82f6' },
  important: { label: '重要なお知らせ', color: '#ef4444' },
  contest:   { label: 'コンテスト',     color: '#F26A21' },
}

interface Props { params: { id: string } }

export default async function AnnouncementDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', params.id)
    .eq('is_published', true)
    .maybeSingle()

  if (!announcement) notFound()

  const t = TYPE_OPTIONS[announcement.type] ?? TYPE_OPTIONS['info']

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:800,margin:'0 auto',padding:'32px 24px'}}>
        {/* パンくず */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:20,fontSize:12,color:'#94a3b8'}}>
          <Link href="/" style={{color:'#F26A21',textDecoration:'none'}}>ホーム</Link>
          <span>›</span>
          <Link href="/announcements" style={{color:'#F26A21',textDecoration:'none'}}>お知らせ一覧</Link>
          <span>›</span>
          <span style={{color:'#77706A'}}>{announcement.title}</span>
        </div>

        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden'}}>
          {/* 画像 */}
          {announcement.image_url && (
            <div style={{padding:'20px 20px 0'}}>
              <img src={announcement.image_url} alt={announcement.title}
                style={{width:'100%',aspectRatio:'2/1',objectFit:'cover',borderRadius:12,display:'block'}}/>
            </div>
          )}

          <div style={{padding:'28px 32px'}}>
            {/* 種別・日付 */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <span style={{
                fontSize:11,fontWeight:700,color:t.color,
                background:`${t.color}15`,border:`1px solid ${t.color}40`,
                padding:'2px 10px',borderRadius:4,
              }}>
                {t.label}
              </span>
              <span style={{fontSize:12,color:'#B8AEA8'}}>
                {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>

            {/* タイトル */}
            <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',lineHeight:1.5,marginBottom:20,fontFamily:"'Noto Serif JP',serif"}}>
              {announcement.title}
            </h1>

            {/* 本文 */}
            <div style={{fontSize:14,color:'#2B211B',lineHeight:2.0,whiteSpace:'pre-wrap',marginBottom:announcement.link?24:0}}>
              {announcement.body}
            </div>

            {/* リンクボタン */}
            {announcement.link && (
              <a href={announcement.link} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-block',padding:'10px 24px',background:'#F26A21',color:'#fff',
                  fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none'}}>
                詳しくはこちら →
              </a>
            )}
          </div>
        </div>

        {/* 戻るリンク */}
        <div style={{marginTop:20,textAlign:'center'}}>
          <Link href="/announcements"
            style={{fontSize:13,color:'#F26A21',textDecoration:'none',border:'1px solid #F0D9C9',
              padding:'8px 20px',borderRadius:20,background:'#fff',display:'inline-block'}}>
            ← お知らせ一覧に戻る
          </Link>
        </div>
      </div>

      <Footer user={user} />
    </div>
  )
}
