import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { user_id, type, message, link } = await req.json()
  if (!user_id || !type || !message) return NextResponse.json({ ok: false })

  // 自分への通知は送らない
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === user_id) return NextResponse.json({ ok: true })

  await supabase.from('notifications').insert({ user_id, type, message, link })
  return NextResponse.json({ ok: true })
}
