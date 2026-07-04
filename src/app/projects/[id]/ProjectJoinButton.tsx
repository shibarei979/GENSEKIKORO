'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  userId: string
  myNovels: { id: string; title: string }[]
  enteredNovelIds: string[]
}

export default function ProjectJoinButton({ projectId, userId, myNovels, enteredNovelIds }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // まだ参加していない自分の作品
  const available = myNovels.filter(n => !enteredNovelIds.includes(n.id))

  async function handleJoin() {
    if (!selectedId) { setError('作品を選んでください'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('project_entries').insert({
      project_id: projectId,
      novel_id: selectedId,
      user_id: userId,
    })
    if (err) {
      setError('参加に失敗しました：' + err.message)
      setSaving(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  if (myNovels.length === 0) {
    return (
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
        参加するには公開作品が必要です
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          style={{ width: '100%', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          この企画に参加する
        </button>
      ) : (
        <div style={{ background: 'var(--color-bg-card)', border: '1.5px solid var(--color-brand)', borderRadius: 12, padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>参加する作品を選択</div>
          {available.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>参加できる作品がありません（すべて参加済み）</div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', padding: '10px 40px 10px 14px', borderRadius: 8, border: '1px solid var(--color-brand-border)', background: 'var(--color-bg-card)', color: 'var(--color-text)', fontSize: 14, cursor: 'pointer' }}>
                <option value="">作品を選ぶ</option>
                {available.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
              </select>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setOpen(false); setError('') }} style={{ flex: 1, padding: '10px', border: '1px solid var(--color-brand-border)', borderRadius: 8, background: 'var(--color-bg-card)', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={handleJoin} disabled={saving || !selectedId} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || !selectedId ? 'not-allowed' : 'pointer', opacity: saving || !selectedId ? 0.5 : 1 }}>
              {saving ? '参加中...' : '参加する'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
