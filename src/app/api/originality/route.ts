import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { novel_id } = await req.json()

  // 作品情報を取得
  const { data: novel } = await supabase
    .from('novels')
    .select('id, title, summary, genre, tags, author_id')
    .eq('id', novel_id)
    .single()

  if (!novel) return NextResponse.json({ error: 'novel not found' }, { status: 404 })

  // 同じ作者の過去作を取得
  const { data: pastNovels } = await supabase
    .from('novels')
    .select('title, genre, tags')
    .eq('author_id', novel.author_id)
    .neq('id', novel_id)
    .limit(5)

  // 全作品のジャンル・タグを取得（珍しさの比較用）
  const { data: allNovels } = await supabase
    .from('novels')
    .select('genre, tags')
    .eq('published', true)
    .neq('id', novel_id)
    .limit(100)

  const prompt = `あなたはライトノベル評論家です。以下の作品の独創性を100点満点で採点してください。

## 評価対象作品
タイトル：${novel.title}
ジャンル：${novel.genre}
あらすじ：${novel.summary || '（なし）'}
タグ：${(novel.tags || []).join('、')}

## 作者の過去作（差異評価用）
${pastNovels && pastNovels.length > 0
  ? pastNovels.map((n: any) => `- ${n.title}（${n.genre}）タグ：${(n.tags||[]).join('、')}`).join('\n')
  : '（なし・初投稿）'}

## サイト内の他作品のジャンル分布
${allNovels ? [...new Set(allNovels.map((n: any) => n.genre))].join('、') : ''}

## 採点基準（合計100点）
1. テーマ・設定の新しさ：25点
2. 主人公・キャラクター構造の新しさ：20点
3. 舞台・世界観の新しさ：15点
4. 物語の目的・展開構造の新しさ：15点
5. タグ・要素の組み合わせの珍しさ：10点
6. 作者の過去作との差異：10点
7. 読者の新鮮さ反応（あらすじの意外性）：5点

## 出力形式（JSONのみ・説明不要）
{"total":85,"breakdown":{"theme":22,"character":18,"world":12,"structure":13,"tags":8,"author_diff":9,"freshness":3}}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const json = JSON.parse(text.replace(/```json|```/g, '').trim())
    const score = Math.min(100, Math.max(0, json.total || 0))

    // DBに保存
    await supabase.from('novels').update({ originality_score: score }).eq('id', novel_id)

    return NextResponse.json({ score, breakdown: json.breakdown })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
