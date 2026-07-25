import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { serverEnv } from '@/config/env.server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { novel_id } = await req.json()

  const { data: novel } = await supabase
    .from('novels')
    .select('id, title, summary, genre, tags, author_id')
    .eq('id', novel_id)
    .single()

  if (!novel) return NextResponse.json({ error: 'novel not found' }, { status: 404 })

  const { data: pastNovels } = await supabase
    .from('novels')
    .select('title, genre, tags')
    .eq('author_id', novel.author_id)
    .neq('id', novel_id)
    .limit(5)

  const { data: allNovels } = await supabase
    .from('novels')
    .select('genre, tags')
    .eq('published', true)
    .neq('id', novel_id)
    .limit(100)

  // 本文を採点対象に加える：公開済みの最初の数話から冒頭を抽出（合計約6000字まで）
  const { data: eps } = await supabase
    .from('episodes')
    .select('ep_number, title, body')
    .eq('novel_id', novel_id)
    .eq('published', true)
    .order('ep_number', { ascending: true })
    .limit(3)

  let bodyExcerpt = ''
  if (eps && eps.length > 0) {
    const CHAR_BUDGET = 6000
    for (const ep of eps) {
      if (bodyExcerpt.length >= CHAR_BUDGET) break
      const remain = CHAR_BUDGET - bodyExcerpt.length
      const chunk = (ep.body || '').slice(0, remain)
      bodyExcerpt += `\n【第${ep.ep_number}話 ${ep.title || ''}】\n${chunk}\n`
    }
  }

  const prompt = `あなたはライトノベル評論家です。以下の作品の独創性を100点満点で採点してください。

## 評価対象作品
タイトル：${novel.title}
ジャンル：${novel.genre}
あらすじ：${novel.summary || '（なし）'}
タグ：${(novel.tags || []).join('、')}

## 本文（冒頭抜粋・独創性判断の主要材料）
${bodyExcerpt ? bodyExcerpt : '（本文がまだ投稿されていません。あらすじ等から判断してください）'}

## 作者の過去作（差異評価用）
${pastNovels && pastNovels.length > 0
  ? pastNovels.map((n: any) => `- ${n.title}（${n.genre}）タグ：${(n.tags||[]).join('、')}`).join('\n')
  : '（なし・初投稿）'}

## サイト内の他作品のジャンル分布
${allNovels ? Array.from(new Set(allNovels.map((n: any) => n.genre))).join('、') : ''}

## 採点の考え方
あらすじだけでなく、上記の本文の書き出し・文体・語り口・展開の運び方まで踏まえて総合的に判断してください。あらすじが平凡でも本文に独自性があれば評価し、あらすじが派手でも本文が凡庸なら割り引いてください。

## 採点基準（各項目、下記の段階を目安に採点。中間の点も可）
1. テーマ・設定の新しさ（25点満点）
   - 王道テンプレをほぼそのまま踏襲：0〜8点
   - 定番の型にひとひねり加えている：9〜17点
   - ほとんど類を見ない着想：18〜25点
2. 主人公・キャラクター構造の新しさ（20点満点）
   - よくある造形・役割そのまま：0〜6点
   - 既存型だが独自の内面や関係性がある：7〜13点
   - 造形や関係性が際立って独創的：14〜20点
3. 舞台・世界観の新しさ（15点満点）
   - 既存世界（テンプレ異世界等）の踏襲：0〜5点
   - 既存下地に独自要素を足している：6〜10点
   - 独自に構築された世界観：11〜15点
4. 物語の目的・展開構造の新しさ（15点満点）
   - お約束の筋・展開が読める：0〜5点
   - 定番だが運び方に工夫がある：6〜10点
   - 構造や展開に意外性がある：11〜15点
5. タグ・要素の組み合わせの珍しさ（10点満点）
   - ありふれた組み合わせ：0〜3点
   - やや珍しい掛け合わせ：4〜7点
   - 滅多に見ない組み合わせ：8〜10点
6. 作者の過去作との差異（10点満点／過去作がなければ満点付近）
   - 過去作の焼き直しに近い：0〜3点
   - 傾向は近いが新しい挑戦がある：4〜7点
   - 過去作と明確に異なる新境地：8〜10点
7. 本文の文体・語り口の独自性（5点満点）
   - 凡庸・没個性：0〜1点
   - 読みやすく安定した文体：2〜3点
   - 際立つ個性・独自のリズム：4〜5点

## 出力形式（JSONのみ・説明不要）
{"total":85,"breakdown":{"theme":22,"character":18,"world":12,"structure":13,"tags":8,"author_diff":9,"style":3}}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': serverEnv.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const json = JSON.parse(text.replace(/```json|```/g, '').trim())
    const score = Math.min(100, Math.max(0, json.total || 0))

    await supabase.from('novels').update({ originality_score: score }).eq('id', novel_id)

    return NextResponse.json({ score, breakdown: json.breakdown })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
