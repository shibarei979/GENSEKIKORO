import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import PostClient from './PostClient'
import { Suspense } from 'react'

export default async function PostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/post')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#FFF9F2'}}/>}>
      <PostClient profile={profile} userId={user.id} />
    </Suspense>
  )
}
