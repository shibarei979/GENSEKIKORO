'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 1件ずつの既読ボタン。押すとread_feedbacksに記録し、その場で「既読」に変わる
export default function MarkReadButton({ itemKey, alreadyRead }: { itemKey: string; alreadyRead: boolean }) {
  const supabase = createClient()
  const [read, setRead] = useState(alreadyRead)
  const [saving, setSaving] = useState(false)

  async function mark() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('read_feedbacks').upsert({ user_id: user.id, item_key: itemKey }, { onConflict: 'user_id,item_key' })
      setRead(true)
    }
    setSaving(false)
  }

  if (read) {
    return <span style={{ fontSize: 11, color: 'var(--color-text-faint)', flexShrink: 0 }}>既読</span>
  }
  return (
    <button onClick={mark} disabled={saving}
      style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-brand)', background: 'none', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '4px 12px', cursor: 'pointer', flexShrink: 0 }}>
      {saving ? '...' : '既読にする'}
    </button>
  )
}
