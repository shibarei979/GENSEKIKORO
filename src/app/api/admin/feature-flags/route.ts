import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// フラグの状態を更新（アドミンのみ）
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('user_id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { key, label, status } = body
  if (!key || !['off', 'preview', 'on'].includes(status)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { error } = await admin.from('feature_flags').upsert({
    key,
    label: label || key,
    status,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
