import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import StoryBoardPage from './StoryBoardPage'

export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/mypage/board')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f8f7f4',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user}/>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',background:'#fff',borderBottom:'1px solid #F0D9C9',flexShrink:0}}>
        <Link href="/mypage" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>マイページ</Link>
        <span style={{fontSize:12,color:'#B8AEA8'}}>›</span>
        <span style={{fontSize:12,color:'#2B211B',fontWeight:600}}>ストーリーボード</span>
      </div>
      <div style={{flex:1,overflow:'hidden'}}>
        <StoryBoardPage userId={user.id}/>
      </div>
    </div>
  )
}
