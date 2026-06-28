'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function HomeSelectPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
    })
  }, [])

  async function handleSelect(role: 'reader' | 'writer') {
    if (!userId) return
    setLoading(true)
    await supabase.from('profiles').update({ user_role: role }).eq('user_id', userId)
    router.push('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Noto Sans JP', sans-serif",
      padding: '24px 16px',
    }}>
      <img src="/logo.png" alt="原石航路" style={{ height: 80, objectFit: 'contain', marginBottom: 32 }}/>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, textAlign: 'center' }}>
        あなたはどちらですか？
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 40, textAlign: 'center' }}>
        後からマイページで変更できます
      </p>

      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 640, flexDirection: 'row' }}>
        {/* 読み手 */}
        <button onClick={() => handleSelect('reader')} disabled={loading}
          style={{
            flex: 1,
            padding: '40px 24px',
            borderRadius: 16,
            border: '2px solid var(--color-brand-border)',
            background: 'var(--color-bg-card)',
            cursor: 'pointer',
            textAlign: 'center' as const,
            transition: 'all .2s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.background = 'var(--color-brand-light)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-brand-border)'; e.currentTarget.style.background = 'var(--color-bg-card)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>読み手</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            作品を読んで<br/>お気に入りを見つけたい
          </div>
        </button>

        {/* 書き手 */}
        <button onClick={() => handleSelect('writer')} disabled={loading}
          style={{
            flex: 1,
            padding: '40px 24px',
            borderRadius: 16,
            border: '2px solid var(--color-brand-border)',
            background: 'var(--color-bg-card)',
            cursor: 'pointer',
            textAlign: 'center' as const,
            transition: 'all .2s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.background = 'var(--color-brand-light)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-brand-border)'; e.currentTarget.style.background = 'var(--color-bg-card)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>書き手</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
            作品を書いて<br/>読者に届けたい
          </div>
        </button>
      </div>

      <button onClick={() => router.push('/')}
        style={{ marginTop: 24, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-faint)', textDecoration: 'underline' }}>
        スキップしてホームへ
      </button>
    </div>
  )
}
