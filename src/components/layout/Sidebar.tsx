import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Sidebar() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let ageVerified = false
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('age_verified').eq('user_id', user.id).single()
    ageVerified = prof?.age_verified || false
  }

  const { data: weeklyLikes } = await supabase
    .from('weekly_likes').select('novel_id, like_count')
    .order('like_count', { ascending: false }).limit(5)

  const weeklyIds = (weeklyLikes || []).map((w: any) => w.novel_id)
  const likeMap: Record<string,number> = {}
  weeklyLikes?.forEach((w: any) => { likeMap[w.novel_id] = w.like_count })

  let weeklyNovels: any[] = []
  if (weeklyIds.length > 0) {
    const { data: novels } = await supabase.from('novels')
      .select('id, title, genre, author_id').in('id', weeklyIds)
      .eq('published', true).eq('is_r18', false)
    const authorIds = (novels||[]).map((n:any) => n.author_id).filter((v:string,i:number,a:string[]) => a.indexOf(v)===i)
    const authorMap: Record<string,string> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds as string[])
      authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
    }
    weeklyNovels = (novels||[])
      .sort((a:any,b:any) => weeklyIds.indexOf(a.id) - weeklyIds.indexOf(b.id))
      .map((n:any) => ({ ...n, display_name: authorMap[n.author_id]||'', likeCount: likeMap[n.id]||0 }))
  }

  const { data: notices } = await supabase.from('announcements')
    .select('id, title, type, created_at').eq('is_published', true)
    .order('created_at', { ascending: false }).limit(4)

  function rankColor(i: number) {
    if (i === 0) return 'var(--color-brand)'
    if (i === 1) return '#9ca3af'
    if (i === 2) return '#cd7f32'
    return 'var(--color-text)'
  }

  function noticeTypeLabel(type: string) {
    if (type === 'important') return { label: '重要', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' }
    if (type === 'contest') return { label: 'コンテスト', color: 'var(--color-brand)', bg: 'var(--color-brand-light)', border: 'var(--color-tag-border)' }
    return { label: 'お知らせ', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' }
  }

  const GENRES = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','その他', ...(ageVerified ? ['官能'] : [])]

  return (
    <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>

      {/* お知らせ */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
        <div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'var(--color-text)',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          お知らせ
          <Link href="/announcements" style={{fontSize:10,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</Link>
        </div>
        {(notices||[]).length > 0 ? (notices||[]).map((n: any) => {
          const tag = noticeTypeLabel(n.type)
          return (
            <div key={n.id} style={{padding:'9px 12px',borderBottom:'1px solid var(--color-brand-light)'}}>
              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
                <span style={{fontSize:9,fontWeight:700,color:tag.color,background:tag.bg,border:`1px solid ${tag.border}`,padding:'1px 5px',borderRadius:3,flexShrink:0}}>{tag.label}</span>
                <span style={{fontSize:9,color:'var(--color-text-faint)'}}>{new Date(n.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
              <div style={{fontSize:11,color:'var(--color-text)',lineHeight:1.5}}>{n.title}</div>
            </div>
          )
        }) : (
          <div style={{padding:'12px',fontSize:11,color:'var(--color-text-faint)',textAlign:'center'}}>お知らせはまだありません</div>
        )}
      </div>

      {/* 週間ランキング */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
        <div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'var(--color-text)',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          週間ランキング
          <a href='/ranking' style={{fontSize:10,color:'var(--color-brand)',textDecoration:'none'}}>もっと見る ›</a>
        </div>
        {Array.from({length:5},(_,i) => {
          const n = weeklyNovels[i]
          return (
            <div key={i} style={{display:'flex',gap:7,padding:'8px 12px',borderBottom:'1px solid var(--color-brand-light)',alignItems:'flex-start'}}>
              <span style={{fontSize:i<3?15:13,fontWeight:800,color:rankColor(i),minWidth:16,flexShrink:0,fontFamily:"'Noto Serif JP',serif"}}>{i+1}</span>
              {n ? (
                <Link href={`/novel/${n.id}`} style={{textDecoration:'none',flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--color-text)',lineHeight:1.4,marginBottom:1}}>{n.title}</div>
                  <div style={{fontSize:10,color:'var(--color-text-muted)'}}>{n.display_name} · ♡{n.likeCount}</div>
                </Link>
              ) : (
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:'var(--color-brand)',marginBottom:1}}>ジャンル</div>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--color-text)'}}>作品タイトル（準備中）</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ジャンルから探す */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
        <div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'var(--color-text)',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
          ジャンルから探す
        </div>
        <div style={{padding:'10px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
          {GENRES.map(g => (
            <Link key={g} href={`/search?genre=${encodeURIComponent(g)}`}
              style={{fontSize:11,padding:'3px 10px',borderRadius:12,border:'1px solid var(--color-brand-border)',
                background:'var(--color-bg)',color:'var(--color-text-muted)',textDecoration:'none'}}>
              {g}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
