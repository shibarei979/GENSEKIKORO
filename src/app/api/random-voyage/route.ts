import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 候補プール取得（公開済み・全年齢のみ）
  const { data: novels } = await supabase
    .from('novels')
    .select('id, title, genre, novel_type, author_id, created_at, summary, catchcopy, tags, is_serial')
    .eq('published', true)
    .eq('is_r18', false)
    .neq('genre', '官能')
    .order('created_at', { ascending: false })
    .limit(300)

  if (!novels || novels.length === 0) {
    return NextResponse.json({ novel: null })
  }

  const novelIds = novels.map(n => n.id)

  const [{ data: likes }, { data: discovers }, { data: comments }, { data: views }] = await Promise.all([
    supabase.from('likes').select('novel_id').in('novel_id', novelIds),
    supabase.from('discovers').select('novel_id').in('novel_id', novelIds).eq('is_pending', false),
    supabase.from('comments').select('novel_id').in('novel_id', novelIds),
    supabase.from('novel_views').select('novel_id, view_count').in('novel_id', novelIds),
  ])

  const likeMap: Record<string, number> = {}
  likes?.forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id] || 0) + 1 })
  const discoverMap: Record<string, number> = {}
  discovers?.forEach((d: any) => { discoverMap[d.novel_id] = (discoverMap[d.novel_id] || 0) + 1 })
  const commentMap: Record<string, number> = {}
  comments?.forEach((c: any) => { commentMap[c.novel_id] = (commentMap[c.novel_id] || 0) + 1 })
  const viewMap: Record<string, number> = {}
  views?.forEach((v: any) => { viewMap[v.novel_id] = v.view_count || 0 })

  // 未発掘条件：PV100未満 かつ いいね10未満 かつ 発掘5未満
  const undiscovered = novels.filter(n =>
    (viewMap[n.id] || 0) < 100 &&
    (likeMap[n.id] || 0) < 10 &&
    (discoverMap[n.id] || 0) < 5
  )

  // ユーザーの好みジャンルを取得（閲覧履歴から）
  let preferredGenres: string[] = []
  if (user) {
    const { data: historyData } = await supabase
      .from('page_views')
      .select('novel_id, novels(genre)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    const genreFreq: Record<string, number> = {}
    historyData?.forEach((h: any) => {
      const g = h.novels?.genre
      if (g) genreFreq[g] = (genreFreq[g] || 0) + 1
    })
    preferredGenres = Object.entries(genreFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g)
  }

  const preferredPool = preferredGenres.length > 0
    ? novels.filter(n => preferredGenres.includes(n.genre))
    : []

  // 抽選：未発掘50% / 傾向に合う作品40% / 完全ランダム10%
  const rand = Math.random()
  let pool: typeof novels

  if (rand < 0.5 && undiscovered.length > 0) {
    pool = undiscovered
  } else if (rand < 0.9 && preferredPool.length > 0) {
    pool = preferredPool
  } else {
    pool = novels
  }

  if (pool.length === 0) pool = novels

  const picked = pool[Math.floor(Math.random() * pool.length)]

  const { data: author } = await supabase.from('profiles').select('display_name').eq('user_id', picked.author_id).maybeSingle()

  return NextResponse.json({
    novel: {
      ...picked,
      display_name: author?.display_name || '',
      like_count: likeMap[picked.id] || 0,
      comment_count: commentMap[picked.id] || 0,
    }
  })
}
