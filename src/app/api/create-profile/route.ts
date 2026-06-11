import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, display_name, email, login_provider, birthdate, age_verified } = body

    if (!user_id || !display_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('profiles').upsert({
      user_id,
      display_name,
      email,
      login_provider: login_provider || 'email',
      birthdate: birthdate || null,
      age_verified: age_verified || false,
      is_admin: false,
      frozen: false,
      user_number: Math.floor(Math.random() * 999999) + 1,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
