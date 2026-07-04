'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUserId(data.user.id)
    })
  }, [])

  async function handleSubmit() {
    if (!userId) return
    if (!title.trim()) { setError('タイトルを入力してください'); return }
    setSaving(true)
    setError('')

    const { data, error: err } = await supabase.from('projects').insert({
      host_id: userId,
      title: title.trim(),
      theme: theme.trim() || null,
      description: description.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    }).select().single()

    if (err) {
      setError('作成に失敗しました：' + err.message)
      setSaving(false)
      return
    }
    router.push(`/projects/${data.id}`)
  }

  const label = { fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6, display: 'block' } as const
  const input = { width: '100%', padding: '10px 12px', border: '1px solid var(--color-brand-border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'var(--color-bg-card)', color: 'var(--color-text)', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>企画を立てる</h1>
          <button onClick={() => router.push('/projects')} style={{ fontSize: 13, color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>← 一覧に戻る</button>
        </div>

        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={label}>企画タイトル <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：「雨」をテーマにした短編を書こう" style={input} maxLength={50} />
          </div>
          <div>
            <label style={label}>お題・テーマ</label>
            <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="例：雨、青春、別れ" style={input} maxLength={20} />
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>短いキーワードで（一覧にバッジ表示されます）</div>
          </div>
          <div>
            <label style={label}>説明</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="企画の趣旨や参加条件など" style={{ ...input, minHeight: 100, resize: 'vertical' }} maxLength={500} />
          </div>
          <div>
            <label style={label}>締切</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={input} />
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>未設定の場合は「期限なし」になります</div>
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{error}</div>}

          <button onClick={handleSubmit} disabled={saving || !title.trim()}
            style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: saving || !title.trim() ? 'not-allowed' : 'pointer', opacity: saving || !title.trim() ? 0.5 : 1 }}>
            {saving ? '作成中...' : '企画を作成する'}
          </button>
        </div>
      </div>
    </div>
  )
}
