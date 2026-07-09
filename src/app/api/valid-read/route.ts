import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 有効読者の記録：本日の自分のPV行に is_valid_read を立てる
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const { episode_id, read_seconds, scroll_pct } = await req.json()
    if (!episode_id) return NextResponse.json({ ok: false }, { status: 400 })

    // 作者自身の閲覧は有効読者に含めない
    const { data: ep } = await supabase.from('episodes').select('novel_id').eq('id', episode_id).maybeSingle()
    if (!ep) return NextResponse.json({ ok: false }, { status: 404 })
    const { data: novel } = await supabase.from('novels').select('author_id').eq('id', ep.novel_id).maybeSingle()
    if (!novel || novel.author_id === user.id) return NextResponse.json({ ok: true, skipped: true })

    // 本日の自分のPV行を更新（同一ユーザーの重複は1日1回＝PV制限と同じ枠組み）
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('page_views').select('*', { count: 'exact', head: true })
      .eq('episode_id', episode_id).eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    if ((count || 0) > 0) {
      await supabase.from('page_views').update({
        is_valid_read: true,
        read_seconds: Math.min(9999, Number(read_seconds) || 0),
        scroll_pct: Math.min(100, Number(scroll_pct) || 0),
      }).eq('episode_id', episode_id).eq('user_id', user.id).gte('created_at', todayStart.toISOString())
    } else {
      // PV行が無い場合（稀）は有効読者として新規記録
      await supabase.from('page_views').insert({
        episode_id, user_id: user.id,
        is_valid_read: true,
        read_seconds: Math.min(9999, Number(read_seconds) || 0),
        scroll_pct: Math.min(100, Number(scroll_pct) || 0),
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
