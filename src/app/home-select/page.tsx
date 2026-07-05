'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomeSelectPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [step, setStep] = useState<'role' | 'ai'>('role')
  const [role, setRole] = useState<'reader' | 'writer' | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
    })
  }, [])

  // ステップ1：役割を選ぶ → 保存してAI設問へ
  async function handleSelectRole(r: 'reader' | 'writer') {
    if (!userId) return
    setLoading(true)
    await supabase.from('profiles').update({ user_role: r }).eq('user_id', userId)
    setRole(r)
    setStep('ai')
    setLoading(false)
  }

  // ステップ2（読み手）：AI作品を表示するか
  async function handleReaderAi(show: boolean) {
    if (!userId) return
    setLoading(true)
    await supabase.from('profiles').update({ show_ai_works: show }).eq('user_id', userId)
    router.push('/')
  }

  // ステップ2（書き手）：デフォルトのAI利用状況
  async function handleWriterAi(usage: 'none' | 'assist' | 'full') {
    if (!userId) return
    setLoading(true)
    await supabase.from('profiles').update({ default_ai_usage: usage }).eq('user_id', userId)
    router.push('/')
  }

  const cardBtn = {
    flex: 1,
    minWidth: 150,
    padding: '28px 20px',
    borderRadius: 16,
    border: '2px solid var(--color-brand-border)',
    background: 'var(--color-bg-card)',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all .2s',
  }
  const hoverOn = (e: any) => { e.currentTarget.style.borderColor = 'var(--color-brand)'; e.currentTarget.style.background = 'var(--color-brand-light)' }
  const hoverOff = (e: any) => { e.currentTarget.style.borderColor = 'var(--color-brand-border)'; e.currentTarget.style.background = 'var(--color-bg-card)' }

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

      {step === 'role' && (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, textAlign: 'center' }}>
            あなたはどちらですか？
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 40, textAlign: 'center' }}>
            後からマイページで変更できます
          </p>

          <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 640, flexDirection: 'row' }}>
            <button onClick={() => handleSelectRole('reader')} disabled={loading}
              style={{ ...cardBtn, padding: '40px 24px' }} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>読み手</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                作品を読んで<br/>お気に入りを見つけたい
              </div>
            </button>

            <button onClick={() => handleSelectRole('writer')} disabled={loading}
              style={{ ...cardBtn, padding: '40px 24px' }} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>書き手</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                作品を書いて<br/>読者に届けたい
              </div>
            </button>
          </div>
        </>
      )}

      {step === 'ai' && role === 'reader' && (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, textAlign: 'center' }}>
            AI作品を表示しますか？
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 40, textAlign: 'center', lineHeight: 1.7 }}>
            AIが全面的に生成した作品の表示を選べます。<br/>後から設定で変更できます
          </p>

          <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 640, flexWrap: 'wrap' }}>
            <button onClick={() => handleReaderAi(true)} disabled={loading}
              style={cardBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>表示する</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                AI作品も人間の作品も<br/>すべて楽しみたい
              </div>
            </button>

            <button onClick={() => handleReaderAi(false)} disabled={loading}
              style={cardBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>表示しない</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                人の手で書かれた<br/>作品だけを読みたい
              </div>
            </button>
          </div>
        </>
      )}

      {step === 'ai' && role === 'writer' && (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, textAlign: 'center' }}>
            執筆でAIを使いますか？
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 40, textAlign: 'center', lineHeight: 1.7 }}>
            投稿時のデフォルト設定になります。<br/>作品ごとに変更できます
          </p>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 720, flexWrap: 'wrap' }}>
            <button onClick={() => handleWriterAi('none')} disabled={loading}
              style={cardBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✍️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>AI未使用</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                AIを使わずに執筆する
              </div>
            </button>

            <button onClick={() => handleWriterAi('assist')} disabled={loading}
              style={cardBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🛠️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>補助的利用</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                校正・アイデア出し等に<br/>AIを利用する
              </div>
            </button>

            <button onClick={() => handleWriterAi('full')} disabled={loading}
              style={cardBtn} onMouseOver={hoverOn} onMouseOut={hoverOff}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>全面的利用</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                本文生成などAIが主体<br/>（AI作品バッジが付きます）
              </div>
            </button>
          </div>
        </>
      )}

      <button onClick={() => router.push('/')}
        style={{ marginTop: 24, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-faint)', textDecoration: 'underline' }}>
        スキップしてホームへ
      </button>
    </div>
  )
}
