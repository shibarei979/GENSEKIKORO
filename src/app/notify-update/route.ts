import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  const { novel_id, ep_title } = await req.json()
  if (!novel_id) return NextResponse.json({ ok: false })

  // 作品情報を取得
  const { data: novel } = await supabase
    .from('novels')
    .select('id, title, author_id')
    .eq('id', novel_id)
    .single()

  if (!novel || novel.author_id !== user.id) return NextResponse.json({ ok: false })

  const message = `「${novel.title}」が更新されました：${ep_title}`
  const link = `/novel/${novel.id}`

  // ブックマークしているユーザーを取得
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('user_id')
    .eq('novel_id', novel_id)

  // フォロワーを取得
  const { data: followers } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id)

  // 通知対象ユーザーをまとめて重複除去（作者自身を除外）
  const bookmarkUsers = new Set((bookmarks || []).map((b: any) => b.user_id))
  const followerUsers = new Set((followers || []).map((f: any) => f.follower_id))
  const allTargets = new Set([...bookmarkUsers, ...followerUsers])
  allTargets.delete(user.id)

  if (allTargets.size === 0) return NextResponse.json({ ok: true, count: 0 })

  // 既に同じ通知が送られていないか確認（直近24時間）
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentNotifs } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'update')
    .like('message', `%${novel.title}%`)
    .gte('created_at', since)

  const alreadyNotified = new Set((recentNotifs || []).map((n: any) => n.user_id))

  // 未通知ユーザーのみに送信
  const toNotify = [...allTargets].filter(uid => !alreadyNotified.has(uid))

  if (toNotify.length > 0) {
    await supabase.from('notifications').insert(
      toNotify.map(uid => ({
        user_id: uid,
        type: 'update',
        message,
        link,
      }))
    )
  }

  return NextResponse.json({ ok: true, count: toNotify.length })
}
