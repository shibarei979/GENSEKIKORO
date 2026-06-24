import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { user_id, type, message, link } = await req.json()
  if (!user_id || !type || !message) return NextResponse.json({ ok: false })

  // 自分への通知は送らない
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === user_id) return NextResponse.json({ ok: true })

  // 通知設定チェック
  const { data: profile } = await supabase
    .from('profiles')
    .select('notify_like, notify_comment, notify_follow, notify_new_episode, notify_new_work')
    .eq('user_id', user_id)
    .single()

  if (profile) {
    const allowed: Record<string, boolean> = {
      like:        profile.notify_like        !== false,
      comment:     profile.notify_comment     !== false,
      reply:       profile.notify_comment     !== false,
      follow:      profile.notify_follow      !== false,
      new_episode: profile.notify_new_episode !== false,
      new_work:    profile.notify_new_work    !== false,
      discover:    true,
    }
    if (allowed[type] === false) return NextResponse.json({ ok: true, skipped: true })
  }

  await supabase.from('notifications').insert({ user_id, type, message, link })
  return NextResponse.json({ ok: true })
}
