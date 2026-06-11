import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const user = data.user

      // profilesに行がなければ作成（Googleログイン時のトリガー失敗フォールバック）
      try {
        const admin = createAdminClient()
        const { data: existing } = await admin
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existing) {
          // user_numberの最大値を取得
          const { data: maxData } = await admin
            .from('profiles')
            .select('user_number')
            .order('user_number', { ascending: false })
            .limit(1)
            .maybeSingle()
          const nextNumber = (maxData?.user_number ?? 0) + 1

          const displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'ユーザー'

          await admin.from('profiles').insert({
            user_id: user.id,
            display_name: displayName,
            email: user.email,
            login_provider: 'google',
            user_number: nextNumber,
            age_verified: false,
            is_admin: false,
            frozen: false,
          })
        }
      } catch (e) {
        console.error('profile create error:', e)
      }

      const response = NextResponse.redirect(`${origin}${next}`)
      response.headers.set('Cache-Control', 'no-store')
      return response
    }
    console.error('exchangeCodeForSession error:', error)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`)
}
