'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const supabase = createClient()

  const [step, setStep]             = useState<1 | 2>(1)
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [pwConfirm, setPwConfirm]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [birthYear, setBirthYear]   = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay]     = useState('')
  const [agree, setAgree]           = useState(false)
  const [agreeAge, setAgreeAge]     = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const currentYear = new Date().getFullYear()
  const years  = Array.from({ length: 100 }, (_, i) => currentYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days   = Array.from({ length: 31 }, (_, i) => i + 1)

  function getAge() {
    if (!birthYear || !birthMonth || !birthDay) return -1
    const birth = new Date(Number(birthYear), Number(birthMonth) - 1, Number(birthDay))
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--
    return age
  }

  function pwStrength() {
    let n = 0
    if (password.length >= 8) n++
    if (password !== password.toLowerCase()) n++
    if (/[0-9]/.test(password)) n++
    if (password.length > 0 && !/[A-Za-z0-9]/.test(password.slice(-1))) n++
    return n
  }

  async function goNext() {
    setError('')
    if (!name.trim() || name.trim().length < 2) { setError('ペンネームは2文字以上で入力してください'); return }
    if (!email.includes('@') || !email.includes('.')) { setError('正しいメールアドレスを入力してください'); return }
    if (password.length < 6) { setError('パスワードは6文字以上で入力してください'); return }
    if (password !== pwConfirm) { setError('パスワードが一致しません'); return }
    setLoading(true)
    const { data: existing } = await supabase.from('profiles').select('user_id').eq('email', email).maybeSingle()
    setLoading(false)
    if (existing) { setError('このメールアドレスはすでに登録されています'); return }
    setStep(2)
  }

  async function handleGoogleRegister() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home-select`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setError('Googleログインに失敗しました')
      setGoogleLoading(false)
    }
  }

  async function handleEmailRegister() {
    setError('')
    const age = getAge()
    if (age < 0) { setError('生年月日を選択してください'); return }
    if (age < 13) { setError('13歳未満の方は登録できません'); return }
    if (!agree) { setError('利用規約への同意が必要です'); return }
    if (!agreeAge) { setError('年齢確認への同意が必要です'); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    })
    
    if (error) {
      setLoading(false)
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('このメールアドレスはすでに登録されています')
      } else {
        setError('登録に失敗しました: ' + error.message)
      }
      return
    }

    if (data.user) {
      const res = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: data.user.id,
          display_name: name.trim(),
          email: email,
          login_provider: 'email',
          birthdate: birthYear && birthMonth && birthDay
            ? `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`
            : null,
          age_verified: getAge() >= 18,
        })
      })
      const result = await res.json()
      if (result.error) {
        setError('プロフィール保存に失敗しました: ' + result.error)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    window.location.href = '/home-select'
  }

  const age = getAge()
  const str = pwStrength()
  const strColor = str <= 1 ? '#dc2626' : str === 2 ? '#f59e0b' : str === 3 ? '#3b82f6' : '#22c55e'
  const strLabel = str <= 1 ? '弱い' : str === 2 ? '普通' : str === 3 ? '強い' : 'とても強い'
  const ageColor = age < 0 ? 'var(--color-text-faint)' : age >= 18 ? '#2e7d32' : age >= 13 ? '#e65100' : '#dc2626'
  const ageMsg   = age < 0 ? '' : age >= 18 ? '✓ 18歳以上：すべての機能を利用できます'
                 : age >= 13 ? '⚠️ 13〜17歳：R18コンテンツは閲覧できません'
                 : '✗ 13歳未満の方は登録できません'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="原石航路" className="h-20 mx-auto mb-3 object-contain" />
          <h1 className="text-xl font-bold text-text">アカウント登録</h1>
          <p className="text-sm text-muted mt-1">投稿・発掘を始めよう</p>
        </div>

        <div className="flex mb-6">
          {['1 アカウント情報', '2 年齢・同意'].map((label, i) => (
            <div key={label} className="flex-1 text-center text-xs pb-2 font-medium transition-colors"
              style={{ borderBottom: step === i+1 ? '2px solid var(--color-brand)' : '2px solid var(--color-brand-border)',
                       color: step === i+1 ? 'var(--color-brand)' : 'var(--color-text-faint)' }}>
              {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <button onClick={handleGoogleRegister} disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 px-4 text-sm font-medium text-text hover:bg-gray-50 transition-colors disabled:opacity-50 mb-4">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? '接続中...' : 'Googleで登録'}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border"/>
              <span className="text-xs text-faint">またはメールアドレスで登録</span>
              <div className="flex-1 h-px bg-border"/>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">ペンネーム <span className="text-red-500">*</span></label>
                <input className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={name} onChange={e => setName(e.target.value)} placeholder="例：月詠零"/>
                <p className="text-xs text-faint mt-1">作者名として公開されます</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">メールアドレス <span className="text-red-500">*</span></label>
                <input type="email" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">パスワード（6文字以上） <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="w-full border border-border rounded-lg px-3 py-2.5 pr-12 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={password} onChange={e => setPassword(e.target.value)} placeholder="6文字以上"/>
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">{showPw ? '非表示' : '表示'}</button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${str * 25}%`, background: strColor }}/>
                    </div>
                    <p className="text-xs mt-1 font-semibold" style={{ color: strColor }}>{strLabel}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">パスワード（確認） <span className="text-red-500">*</span></label>
                <input type="password" className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="もう一度入力"/>
                {pwConfirm.length > 0 && (
                  <p className={`text-xs mt-1 font-semibold ${password === pwConfirm ? 'text-green-700' : 'text-red-600'}`}>
                    {password === pwConfirm ? '✓ 一致しています' : '✗ 一致しません'}
                  </p>
                )}
              </div>
            </div>

            {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <button onClick={goNext} className="w-full mt-5 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg py-3 text-sm transition-colors">
              次へ →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">生年月日 <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select value={birthYear} onChange={e => setBirthYear(e.target.value)}
                  className="flex-[2] border border-border rounded-lg px-2 py-2.5 text-sm text-text outline-none focus:border-primary">
                  <option value="">年</option>
                  {years.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={birthMonth} onChange={e => setBirthMonth(e.target.value)}
                  className="flex-1 border border-border rounded-lg px-2 py-2.5 text-sm text-text outline-none focus:border-primary">
                  <option value="">月</option>
                  {months.map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
                <select value={birthDay} onChange={e => setBirthDay(e.target.value)}
                  className="flex-1 border border-border rounded-lg px-2 py-2.5 text-sm text-text outline-none focus:border-primary">
                  <option value="">日</option>
                  {days.map(d => <option key={d} value={d}>{d}日</option>)}
                </select>
              </div>
              {birthYear && birthMonth && birthDay && age >= 0 && (
                <div className="mt-2 text-xs font-semibold px-3 py-2 rounded-lg border"
                  style={{ color: ageColor, borderColor: ageColor,
                           background: age >= 18 ? '#e8f5e9' : age >= 13 ? '#fff3e0' : '#ffebee' }}>
                  {ageMsg}
                </div>
              )}
              <p className="text-xs text-faint mt-1">年齢確認のために使用します。公開されません。</p>
            </div>

            <div className="space-y-3 mb-5">
              <label className="flex items-start gap-3 bg-bg border border-border rounded-lg p-3 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-primary"/>
                <span className="text-xs text-text leading-relaxed">
                  <span className="text-primary font-semibold">利用規約</span>および
                  <span className="text-primary font-semibold">プライバシーポリシー</span>に同意します <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 bg-bg border border-border rounded-lg p-3 cursor-pointer">
                <input type="checkbox" checked={agreeAge} onChange={e => setAgreeAge(e.target.checked)} className="mt-0.5 flex-shrink-0 accent-primary"/>
                <span className="text-xs text-text leading-relaxed">
                  私は13歳以上です。未成年の場合、保護者の同意を得て登録します。 <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

            <div className="flex gap-2">
              <button onClick={() => { setStep(1); setError('') }}
                className="flex-1 border border-border rounded-lg py-3 text-sm text-muted hover:bg-bg transition-colors">← 戻る</button>
              <button onClick={handleEmailRegister} disabled={loading || (!!birthYear && !!birthMonth && !!birthDay && age >= 0 && age < 13)}
                className="flex-[2] bg-primary hover:bg-primary-dark text-white font-bold rounded-lg py-3 text-sm transition-colors disabled:opacity-40">
                {loading ? '登録中...' : 'アカウントを作成（無料）'}
              </button>
            </div>
            {birthYear && birthMonth && birthDay && age >= 0 && age < 13 && (
              <p className="text-xs text-red-600 text-center mt-2 font-semibold">13歳未満の方は登録できません</p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted mt-6">
          既にアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">ログインはこちら</Link>
        </p>
      </div>
    </div>
  )
}
