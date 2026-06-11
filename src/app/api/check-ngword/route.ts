import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    if (!text) return NextResponse.json({ ok: true })

    const admin = createAdminClient()
    const { data: words } = await admin.from('ng_words').select('word')

    if (!words || words.length === 0) return NextResponse.json({ ok: true })

    const lowerText = text.toLowerCase()
    const matched = words.find((w: any) => lowerText.includes(w.word.toLowerCase()))

    if (matched) {
      return NextResponse.json({ ok: false, word: matched.word })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: true }) // エラー時はブロックしない
  }
}
