'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  episodeId: string
  userId: string | null
  authorId?: string
  initialCount?: number
}

export default function ContinueReaction({ episodeId, userId, authorId }: Props) {
  const supabase = createClient()
  const [reacted, setReacted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('episode_reactions').select('id')
      .eq('episode_id', episodeId).eq('user_id', userId).eq('type', 'continue')
      .maybeSingle()
      .then(({ data }) => { if (data) setReacted(true) })
  }, [episodeId, userId])

  async function handleClick() {
    if (!userId || loading) return

    if (reacted) {
      setLoading(true)
      await supabase.from('episode_reactions').delete()
        .eq('episode_id', episodeId).eq('user_id', userId).eq('type', 'continue')
      setReacted(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const { error } = await supabase.from('episode_reactions').insert({
      episode_id: episodeId, user_id: userId, type: 'continue',
    })
    setLoading(false)
    if (error && error.code !== '23505') return

    setReacted(true)

    if (authorId && authorId !== userId) {
      fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authorId, type: 'reaction',
          message: '読者が「続きが気になる」と反応しました',
          link: window.location.pathname,
        }),
      }).catch(() => {})
    }
  }

  return (
    <button onClick={handleClick} disabled={!userId || loading}
      style={{
        padding:'9px 18px',
        borderRadius:24,
        border:`1.5px solid ${reacted ? 'var(--color-brand)' : 'var(--color-brand-border)'}`,
        background: reacted ? 'var(--color-brand)' : 'var(--base-color-1)',
        color: reacted ? 'var(--base-color-1)' : 'var(--color-text-muted)',
        fontSize:14, fontWeight: reacted ? 700 : 500,
        cursor: userId ? 'pointer' : 'default',
        opacity: loading ? 0.6 : 1,
        transition:'all .2s',
      }}>
      続きが気になる
    </button>
  )
}
