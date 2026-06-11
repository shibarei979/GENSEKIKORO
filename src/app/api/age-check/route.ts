import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ age_verified: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('birthdate, age_verified')
    .eq('user_id', user.id)
    .single()

  if (!profile?.birthdate) return NextResponse.json({ age_verified: false })

  const birth = new Date(profile.birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--

  const verified = age >= 18
  if (verified !== profile.age_verified) {
    await supabase.from('profiles').update({ age_verified: verified }).eq('user_id', user.id)
  }

  return NextResponse.json({ age_verified: verified })
}
