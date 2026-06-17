'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  episodeId: string
  userId: string | null
  authorId?: string
  initialCount?: number
}

export default function ContinueReaction({ episodeId, userId, authorId, initialCount = 0 }: Props) {
  const supabase = createClient()
  const [reacted, setReacted] = useState(false)
  const [count,   setCount]   = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [showPop, setShowPop] = useState(false)

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
      // 取り消し
      setLoading(true)
      await supabase.from('episode_reactions').delete()
        .eq('episode_id', episodeId).eq('user_id', userId).eq('type', 'continue')
      setReacted(false)
      setCount(c => Math.max(0, c - 1))
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
    setCount(c => c + 1)
    setShowPop(true)
    setTimeout(() => setShowPop(false), 1400)

    // 作者への通知
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
    <>
      <button onClick={handleClick} disabled={!userId || loading}
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'7px 16px', borderRadius:20,
          border:`1.5px solid ${reacted ? '#F26A21' : '#F0D9C9'}`,
          background: reacted ? '#FFF1E6' : '#fff',
          color: reacted ? '#F26A21' : '#77706A',
          fontSize:13, fontWeight: reacted ? 700 : 500,
          cursor: userId ? 'pointer' : 'default',
          opacity: loading ? 0.6 : 1,
          transition:'all .15s',
        }}>
        <span style={{fontSize:15}}>👍</span>
        続きが気になる
        {count > 0 && <span style={{fontSize:11,opacity:0.8}}>{count}</span>}
      </button>

      {/* 画面中央フワッとアニメーション */}
      {showPop && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center',
          pointerEvents:'none',
        }}>
          <div style={{
            fontSize:120,
            animation:'continuePopIn 1.4s ease-out forwards',
          }}>
            👍
          </div>
        </div>
      )}

      <style>{`
        @keyframes continuePopIn {
          0%   { transform: scale(0.3); opacity: 0; }
          15%  { transform: scale(1.15); opacity: 1; }
          30%  { transform: scale(1); opacity: 1; }
          75%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
      `}</style>
    </>
  )
}
