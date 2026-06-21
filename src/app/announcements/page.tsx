import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const TYPE_OPTIONS: Record<string, { label: string; color: string }> = {
  info:      { label: 'お知らせ',       color: '#3b82f6' },
  important: { label: '重要なお知らせ', color: '#ef4444' },
  contest:   { label: 'コンテスト',     color: 'var(--color-brand)' },
}

function getType(t: string) {
  return TYPE_OPTIONS[t] ?? TYPE_OPTIONS['info']
}

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:800,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:20,fontSize:12,color:'#94a3b8'}}>
          <Link href="/" style={{color:'var(--color-brand)',textDecoration:'none'}}>ホーム</Link>
          <span>›</span>
          <span style={{color:'var(--color-text-muted)'}}>お知らせ一覧</span>
        </div>

        <h1 style={{fontSize:22,fontWeight:700,color:'var(--color-text)',marginBottom:24,fontFamily:"'Noto Serif JP',serif"}}>
          お知らせ一覧
        </h1>

        {(!announcements || announcements.length === 0) ? (
          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'48px',textAlign:'center',color:'var(--color-text-faint)',fontSize:14}}>
            お知らせはまだありません
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {announcements.map((n: any) => {
              const t = getType(n.type)
              // リンク先：外部リンクがあればそれ、なければ詳細ページ
              const href = n.link || `/announcements/${n.id}`
              const isExternal = !!n.link
              return (
                <a key={n.id} href={href} target={isExternal?'_blank':'_self'} rel="noopener noreferrer"
                  style={{textDecoration:'none',display:'flex',gap:16,alignItems:'flex-start',background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'16px 20px'} as any}>
                  {n.image_url && (
                    <div style={{flexShrink:0,width:160,height:80,borderRadius:8,overflow:'hidden',background:'var(--color-bg)'}}>
                      <img src={n.image_url} alt={n.title}
                        style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                    </div>
                  )}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:10,fontWeight:700,color:t.color,background:`${t.color}15`,border:`1px solid ${t.color}40`,padding:'1px 8px',borderRadius:4,flexShrink:0}}>
                        {t.label}
                      </span>
                      <span style={{fontSize:11,color:'var(--color-text-faint)'}}>
                        {new Date(n.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:'var(--color-text)',lineHeight:1.5,marginBottom:6}}>
                      {n.title}
                    </div>
                    <div style={{fontSize:12,color:'var(--color-text-muted)',lineHeight:1.8,whiteSpace:'pre-wrap',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                      {n.body}
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      <Footer user={user} />
    </div>
  )
}
