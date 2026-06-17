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
    setTimeout(() => setShowPop(false), 900)

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
        position:'relative',
        display:'inline-flex', alignItems:'center', gap:8,
        padding: reacted ? '9px 20px' : '9px 18px',
        borderRadius:24,
        border:`1.5px solid ${reacted ? '#F26A21' : '#F0D9C9'}`,
        background: reacted ? '#FFF1E6' : '#fff',
        color: reacted ? '#F26A21' : '#77706A',
        fontSize:14, fontWeight: reacted ? 700 : 500,
        cursor: userId ? 'pointer' : 'default',
        opacity: loading ? 0.6 : 1,
        transition:'all .2s',
        overflow:'visible',
      }}>

      {/* 👍アイコン（押した瞬間ポップ） */}
      <span style={{
        fontSize:18,
        display:'inline-block',
        transform: showPop ? 'scale(1.6) rotate(-8deg)' : 'scale(1)',
        transition: showPop ? 'transform .35s cubic-bezier(.34,1.56,.64,1)' : 'transform .25s ease-out',
      }}>
        👍
      </span>

      {/* テキスト：押したら消える */}
      {!reacted && <span>ぐっと</span>}

      {/* カウント */}
      {count > 0 && (
        <span style={{fontSize:12,opacity:0.85,fontWeight:600}}>{count}</span>
      )}

      {/* 枠内に出る小さな+1ポップ */}
      {showPop && (
        <span style={{
          position:'absolute',
          top:-6, right:-2,
          fontSize:13,
          fontWeight:700,
          color:'#F26A21',
          animation:'floatUp .9s ease-out forwards',
          pointerEvents:'none',
        }}>
          +1
        </span>
      )}

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(0.8); opacity: 0; }
          25%  { transform: translateY(-4px) scale(1.1); opacity: 1; }
          100% { transform: translateY(-22px) scale(1); opacity: 0; }
        }
      `}</style>
    </button>
  )
}
