'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('メールアドレスまたはパスワードが違います')
    } else {
      // ホームへ遷移
      window.location.href = '/'
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError('Googleログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="原石航路" className="h-16 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-bold text-text">ログイン</h1>
          <p className="text-sm text-muted mt-1">続きを読む・投稿・発掘を楽しもう</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 px-4 text-sm font-medium text-text hover:bg-gray-50 transition-colors disabled:opacity-50 mb-4"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? '接続中...' : 'Googleでログイン'}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-faint">またはメールアドレスで</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">メールアドレス</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">パスワード</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="パスワードを入力" required
                className="w-full border border-border rounded-lg px-3 py-2.5 pr-12 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-xs">
                {showPw ? '非表示' : '表示'}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-lg py-3 text-sm transition-colors disabled:opacity-50">
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-xs mt-3" style={{color:'#77706A'}}>
          <Link href="/auth/reset-password" style={{color:'#F26A21',fontSize:12}}>パスワードを忘れた方はこちら</Link>
        </p>

        <p className="text-center text-xs text-muted mt-4">
          アカウントをお持ちでない方は{' '}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">新規登録（無料）</Link>
        </p>
      </div>
    </div>
  )
}
