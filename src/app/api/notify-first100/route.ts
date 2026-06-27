import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('user_id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { novel_id, novel_title } = await req.json()
  if (!novel_id || !novel_title) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  // 拡散した順に最初の100人を取得
  const { data: discovers } = await supabase
    .from('discovers')
    .select('user_id, created_at')
    .eq('novel_id', novel_id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (!discovers || discovers.length === 0) {
    return NextResponse.json({ sent: 0, message: '拡散者がいません' })
  }

  // 各ユーザーに通知を送る
  const notifications = discovers.map((d: any) => ({
    user_id: d.user_id,
    type: 'first100',
    message: `あなたは「${novel_title}」を最初に応援した${discovers.length}人の一人です！`,
    link: `/novel/${novel_id}`,
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sent: notifications.length })
}
