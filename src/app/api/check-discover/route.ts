import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LOCAL_NG = [
  'クソ','糞','くそ','クそ','クﾞそ',
  'ゴミ','ごみ','ゴみ',
  'カス','かす',
  'バカ','馬鹿','ばか','バか',
  'アホ','あほ',
  'クズ','くず',
  '死ね','しね','死んで',
  '殺す','ころす','殺して',
  'うんこ','うんち',
  'ちんこ','まんこ',
  'セックス','えっち','エッチ',
  'きもい','キモい','キモイ','キモ',
  'うざい','ウザい','ウザイ','うざ',
  'むかつく','ムカつく',
  'きしょい','キショい','きしょ',
  '消えろ','失せろ','黙れ','失せ',
  '最悪','さいあく',
  'ゴミ野郎','クソ野郎','バカ野郎','馬鹿野郎','カスが','クズが',
  'てめえ','テメエ','てめー','テメー',
  'ふざけんな','ふざけるな',
  'しね','氏ね','シね',
]

function containsNg(text: string, ngList: string[]): string | null {
  // 全角・半角スペース除去して比較
  const normalized = text.replace(/[\s　]/g, '')
  for (const w of ngList) {
    const nw = w.replace(/[\s　]/g, '')
    if (normalized.includes(nw)) return w
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { comment } = await request.json()
    if (!comment) return NextResponse.json({ pending: false })

    // 1. ローカルNGワードチェック
    const localHit = containsNg(comment, LOCAL_NG)
    if (localHit) {
      return NextResponse.json({ pending: true, reason: '不適切な言葉が含まれています' })
    }

    // 2. DBのNGワードチェック
    try {
      const admin = createAdminClient()
      const { data: ngWords } = await admin.from('ng_words').select('word')
      if (ngWords && ngWords.length > 0) {
        const dbHit = containsNg(comment, ngWords.map((w: any) => w.word))
        if (dbHit) {
          return NextResponse.json({ pending: true, reason: '禁止ワードが含まれています' })
        }
      }
    } catch (_) {}

    // 3. 短すぎるチェック
    if (comment.trim().length < 10) {
      return NextResponse.json({ pending: true, reason: 'コメントが短すぎます（10文字以上必要）' })
    }

    // 4. Claude APIで内容審査
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `あなたはライトノベル投稿サイトのコメント審査AIです。
以下の拡散コメントを審査し、JSON形式のみで回答してください。

コメント：「${comment}」

【必ず要審査】
- 作品・作者への批判・否定・侮辱・悪口
- ふざけた内容・テスト文字・意味不明・記号の羅列
- スパム・宣伝・無関係な内容
- 差別・ヘイト・誹謗中傷
- 過度に性的・暴力的な表現
- 感情的な怒り・不満の表現

【承認】
- 作品の魅力を具体的・誠実に紹介している内容のみ

JSON形式のみ（他テキスト一切不要）：
{"ok": true} または {"ok": false, "reason": "20文字以内"}`,
        }],
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    if (!result.ok) {
      return NextResponse.json({ pending: true, reason: result.reason || '内容を確認中' })
    }

    return NextResponse.json({ pending: false })
  } catch (e) {
    // エラー時は安全側に倒して審査待ちにする
    return NextResponse.json({ pending: true, reason: 'システムエラーにより審査中' })
  }
}
