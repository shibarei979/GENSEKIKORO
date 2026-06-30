import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // 未発掘作品の候補を広めに取得（公開済み・全年齢のみ）
  const { data: novels } = await supabase
    .from('novels')
    .select('id, title, genre, novel_type, author_id, created_at, summary, catchcopy, tags, is_serial')
    .eq('published', true)
    .eq('is_r18', false)
    .neq('genre', '官能')
    .order('created_at', { ascending: false })
    .limit(200)

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

  const pool = undiscovered.length > 0 ? undiscovered : novels
  const picked = pool[Math.floor(Math.random() * pool.length)]

  // 作者名取得
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
