import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import StoryBoardPage from '@/components/mypage/board/story-board-page'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/mypage/board')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f8f7f4',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user}/>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'var(--color-bg-card)',borderBottom:'1px solid var(--color-brand-border)',flexShrink:0}}>
        <Link href="/mypage" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>マイページ</Link>
        <span style={{fontSize:12,color:'var(--color-text-faint)'}}>›</span>
        <span style={{fontSize:12,color:'var(--color-text)',fontWeight:600}}>ストーリーボード</span>
      </div>
      <div style={{flex:1,overflow:'hidden'}}>
        <StoryBoardPage userId={user.id}/>
      </div>
    </div>
  )
}
