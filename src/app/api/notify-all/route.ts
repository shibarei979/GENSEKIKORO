import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { title, message, link } = await req.json()
    if (!title && !message) {
      return NextResponse.json({ error: 'title or message is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 管理者チェック（リクエスト元が管理者か確認）
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // 全ユーザーのIDを取得
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles').select('user_id')
    if (profileErr) throw profileErr
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const finalMessage = message || title

    const rows = profiles.map((p: any) => ({
      user_id: p.user_id,
      type: 'announcement',
      message: finalMessage,
      link: link || '/announcements',
    }))

    const BATCH = 500
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      const { error: insertErr } = await supabase.from('notifications').insert(chunk)
      if (insertErr) throw insertErr
    }

    return NextResponse.json({ sent: rows.length })
  } catch (e: any) {
    console.error('notify-all error:', e)
    return NextResponse.json({ error: e.message || 'failed' }, { status: 500 })
  }
}
