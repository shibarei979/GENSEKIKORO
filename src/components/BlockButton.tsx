'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  targetId: string
  userId: string
  initialBlocked: boolean
}

export default function BlockButton({ targetId, userId, initialBlocked }: Props) {
  const supabase = createClient()
  const [blocked, setBlocked] = useState(initialBlocked)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  async function handleToggle() {
    if (loading) return
    if (blocked) {
      if (!confirm('ブロックを解除しますか？')) return
    } else {
      if (!confirm('このユーザーをブロックしますか？\nブロックすると相手の作品がおすすめに表示されなくなります。')) return
    }
    setLoading(true)
    if (blocked) {
      await supabase.from('user_blocks').delete().eq('blocker_id', userId).eq('blocked_id', targetId)
      setBlocked(false)
    } else {
      await supabase.from('user_blocks').insert({ blocker_id: userId, blocked_id: targetId })
      setBlocked(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      title={blocked ? 'ブロック解除' : 'ブロックする'}
      style={{
        padding: '3px 12px',
        borderRadius: 16,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .15s',
        border: blocked ? '1px solid #fca5a5' : '1px solid var(--color-brand-border)',
        background: blocked
          ? (hovered ? '#fef2f2' : '#fff')
          : 'var(--color-bg-card)',
        color: blocked
          ? (hovered ? 'var(--color-danger)' : '#9ca3af')
          : 'var(--color-text-faint)',
        opacity: loading ? 0.6 : 1,
      }}>
      {blocked ? (hovered ? 'ブロック解除' : 'ブロック中') : 'ブロック'}
    </button>
  )
}
