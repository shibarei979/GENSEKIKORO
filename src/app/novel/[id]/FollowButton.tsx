'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  authorId: string
  userId: string
  initialFollowing: boolean
  followerCount: number
}

export default function FollowButton({ authorId, userId, initialFollowing, followerCount }: Props) {
  const supabase = createClient()
  const [following, setFollowing] = useState(initialFollowing)
  const [count,     setCount]     = useState(followerCount)
  const [loading,   setLoading]   = useState(false)
  const [hovered,   setHovered]   = useState(false)

  async function handleToggle() {
    if (loading) return
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', userId).eq('following_id', authorId)
      setFollowing(false)
      setCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: userId, following_id: authorId })
      setFollowing(true)
      setCount(c => c + 1)
      // 作者に通知
      fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ user_id: authorId, type:'follow',
          message: `新しいフォロワーが増えました（フォロワー ${count+1}人）`,
          link: `/author/${authorId}` }) })
    }
    setLoading(false)
  }

  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:8,marginLeft:8}}>
      <button
        onClick={handleToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={loading}
        style={{
          padding:'3px 14px',
          borderRadius:16,
          fontSize:12,
          fontWeight:600,
          cursor:'pointer',
          transition:'all .15s',
          border: following ? '1px solid #F0D9C9' : '1px solid #F26A21',
          background: following
            ? (hovered ? '#fef2f2' : '#fff')
            : '#F26A21',
          color: following
            ? (hovered ? '#dc2626' : '#77706A')
            : '#fff',
          opacity: loading ? 0.6 : 1,
        }}>
        {following ? (hovered ? 'フォロー解除' : 'フォロー中') : 'フォローする'}
      </button>
      <span style={{fontSize:11,color:'#B8AEA8'}}>{count.toLocaleString()}</span>
    </span>
  )
}
