'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  novelId: string
  initialPublished: boolean
  initialIsSerial: boolean
}

export default function NovelManageActions({ novelId, initialPublished, initialIsSerial }: Props) {
  const supabase = createClient()
  const [published, setPublished] = useState(initialPublished)
  const [isSerial, setIsSerial] = useState(initialIsSerial)
  const [saving, setSaving] = useState('')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  async function togglePublished() {
    setSaving('published')
    const next = !published
    const { error } = await supabase.from('novels').update({ published: next }).eq('id', novelId)
    if (!error) { setPublished(next); showToast(next ? '公開しました' : '非公開にしました') }
    setSaving('')
  }

  async function toggleSerial() {
    setSaving('serial')
    const next = !isSerial
    const { error } = await supabase.from('novels').update({ is_serial: next }).eq('id', novelId)
    if (!error) { setIsSerial(next); showToast(next ? '連載中に戻しました' : '完結にしました') }
    setSaving('')
  }

  const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--color-brand-light)' }

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-text)', color: 'var(--color-bg-card)', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 100 }}>{toast}</div>
      )}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-brand-light)', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>公開・状態設定</div>

      <div style={rowStyle}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>公開状態</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{published ? '読者に公開されています' : '非公開（自分だけが見られます）'}</div>
        </div>
        <button onClick={togglePublished} disabled={saving === 'published'}
          style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 14, cursor: 'pointer', border: '1px solid var(--color-brand-border)', background: published ? 'var(--color-bg-card)' : 'var(--color-brand)', color: published ? 'var(--color-text-muted)' : '#fff' }}>
          {saving === 'published' ? '...' : published ? '非公開にする' : '公開する'}
        </button>
      </div>

      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>完結設定</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{isSerial ? '連載中として表示されます' : '完結として表示されます'}</div>
        </div>
        <button onClick={toggleSerial} disabled={saving === 'serial'}
          style={{ fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 14, cursor: 'pointer', border: '1px solid var(--color-brand-border)', background: 'var(--color-bg-card)', color: isSerial ? 'var(--color-info)' : 'var(--color-text-muted)' }}>
          {saving === 'serial' ? '...' : isSerial ? '完結にする' : '連載に戻す'}
        </button>
      </div>
    </div>
  )
}
