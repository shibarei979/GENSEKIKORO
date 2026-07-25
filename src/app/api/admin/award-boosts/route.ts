import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('user_id', user.id).single()
  if (!profile?.is_admin) return null
  return admin
}

// 付与
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { novel_id, label, multiplier, days } = await req.json()
  if (!novel_id || !multiplier || !days) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const expires_at = new Date(Date.now() + Number(days) * 86400000).toISOString()
  const { error } = await admin.from('award_boosts').insert({
    novel_id, label: label || '受賞',
    multiplier: Math.min(5, Math.max(1, Number(multiplier))),
    expires_at,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 削除
export async function DELETE(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const { error } = await admin.from('award_boosts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
