import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { serverEnv } from '@/config/env.server'

export async function GET(req: NextRequest) {
  // cronからのリクエストか確認
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()

  // 日間・週間・月間のランキングを取得
  const periods = [
    { key: 'daily',   label: '日間', view: null },
    { key: 'weekly',  label: '週間', view: 'weekly_likes' },
    { key: 'monthly', label: '月間', view: 'monthly_likes' },
  ]

  // novel_id → { rank, periods } のマップ
  const novelRankMap: Record<string, { novel_id: string; ranks: string[] }> = {}

  for (const period of periods) {
    let rankedIds: string[] = []

    if (period.key === 'daily') {
      const today = new Date(); today.setHours(0,0,0,0)
      const { data: dl } = await adminSupabase.from('likes').select('novel_id').gte('created_at', today.toISOString())
      const likeMap: Record<string,number> = {}
      dl?.forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id]||0)+1 })
      rankedIds = Object.entries(likeMap).sort((a,b)=>b[1]-a[1]).slice(0,100).map(([id])=>id)
    } else {
      const { data: likes } = await adminSupabase.from(period.view!).select('novel_id, like_count').order('like_count',{ascending:false}).limit(100)
      rankedIds = (likes||[]).map((l:any) => l.novel_id)
    }

    rankedIds.slice(0, 100).forEach((id, idx) => {
      if (!novelRankMap[id]) novelRankMap[id] = { novel_id: id, ranks: [] }
      novelRankMap[id].ranks.push(`${period.label}${idx+1}位`)
    })
  }

  if (Object.keys(novelRankMap).length === 0) {
    return NextResponse.json({ sent: 0, message: 'ランクイン作品なし' })
  }

  // novel_id → author_id・title を取得
  const novelIds = Object.keys(novelRankMap)
  const { data: novels } = await adminSupabase.from('novels').select('id, title, author_id').in('id', novelIds).eq('published', true)

  if (!novels || novels.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 今日すでに通知送信済みかチェック
  const today = new Date(); today.setHours(0,0,0,0)
  const { data: alreadySent } = await adminSupabase
    .from('notifications')
    .select('user_id, link')
    .eq('type', 'ranking')
    .gte('created_at', today.toISOString())

  const sentSet = new Set((alreadySent||[]).map((n:any) => `${n.user_id}:${n.link}`))

  const notifications: any[] = []

  for (const novel of novels) {
    const rankData = novelRankMap[novel.id]
    if (!rankData) continue

    const key = `${novel.author_id}:/novel/${novel.id}`
    if (sentSet.has(key)) continue // 今日すでに送信済み

    const ranksStr = rankData.ranks.join('・')
    notifications.push({
      user_id: novel.author_id,
      type: 'ranking',
      message: `「${novel.title}」がランキング入りしました！（${ranksStr}）`,
      link: `/novel/${novel.id}`,
      is_read: false,
    })
  }

  if (notifications.length === 0) {
    return NextResponse.json({ sent: 0, message: '全て送信済み' })
  }

  const { error } = await adminSupabase.from('notifications').insert(notifications)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sent: notifications.length })
}
