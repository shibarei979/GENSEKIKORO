'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useQuote } from './QuoteContext'

interface Comment {
  id: string
  body: string
  created_at: string
  user_id: string
  display_name: string
  icon_url: string
  like_count: number
  is_pinned: boolean
  rating?: number | null
}

interface Props {
  novelId: string
  episodeId: string
  userId: string | null
  userName: string | null
  userIconUrl: string | null
  authorId: string
  comments: Comment[]
}

function StarDisplay({ rating }: { rating?: number | null }) {
  if (!rating || rating < 1) return null
  return (
    <span style={{ display: 'inline-flex', gap: 1, marginLeft: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: 12, color: i <= rating ? '#f5a623' : '#ddd' }}>★</span>
      ))}
    </span>
  )
}

export default function CommentSection({ novelId, episodeId, userId, userName, userIconUrl, authorId, comments: initialComments }: Props) {
  const supabase = createClient()
  const { quotedText, setQuotedText, setSelecting, commentAnchorRef } = useQuote()

  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [posting, setPosting] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (quotedText && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [quotedText])

  useEffect(() => {
    if (!userId) return
    const commentIds = comments.map(c => c.id)
    if (commentIds.length === 0) return
    supabase.from('comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', commentIds)
      .then(({ data }) => {
        if (data) setLikedComments(new Set(data.map((d: any) => d.comment_id)))
      })
  }, [userId])

  async function handleSubmit() {
    if (!userId) return
    const trimmed = body.trim()
    if (!trimmed) return
    setPosting(true)

    const insertData: any = {
      novel_id: novelId,
      episode_id: episodeId,
      user_id: userId,
      body: quotedText ? `> ${quotedText}\n\n${trimmed}` : trimmed,
    }
    if (rating > 0) insertData.rating = rating

    const { data, error } = await supabase.from('comments').insert(insertData).select().single()

    if (!error && data) {
      const newComment: Comment = {
        id: data.id,
        body: data.body,
        created_at: data.created_at,
        user_id: userId,
        display_name: userName || '名無し',
        icon_url: userIconUrl || '',
        like_count: 0,
        is_pinned: false,
        rating: rating > 0 ? rating : null,
      }
      setComments([newComment, ...comments])
      setBody('')
      setRating(0)
      setQuotedText('')

      // 作者に通知
      if (authorId !== userId) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: authorId,
            type: 'comment',
            message: `${userName || '名無し'}さんがコメントしました`,
            link: `/novel/${novelId}/episode/${episodeId}`,
          }),
        }).catch(() => {})
      }
    }
    setPosting(false)
  }

  async function toggleLike(commentId: string) {
    if (!userId) return
    const isLiked = likedComments.has(commentId)
    if (isLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
      setLikedComments(prev => { const s = new Set(prev); s.delete(commentId); return s })
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count: Math.max(0, c.like_count - 1) } : c))
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
      setLikedComments(prev => new Set(prev).add(commentId))
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, like_count: c.like_count + 1 } : c))
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('このコメントを削除しますか？')) return
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function togglePin(commentId: string, current: boolean) {
    await supabase.from('comments').update({ is_pinned: !current }).eq('id', commentId)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: !current } : c))
  }

  function fmtDate(s: string) {
    const d = new Date(s)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'たった今'
    if (mins < 60) return `${mins}分前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}日前`
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  const sortedComments = [...comments].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div ref={commentAnchorRef} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-brand-border)', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>コメント</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{comments.length}件</span>
      </div>

      {/* 投稿フォーム */}
      {userId ? (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-brand-light)' }}>
          {quotedText && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--color-brand-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)', borderLeft: '3px solid var(--color-brand)', paddingLeft: 8, lineHeight: 1.6 }}>
                {quotedText}
              </div>
              <button onClick={() => setQuotedText('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* 星評価選択（5段階・任意で0もOK） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>評価</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i}
                  onClick={() => setRating(rating === i ? 0 : i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 24, lineHeight: 1, color: i <= (hoverRating || rating) ? '#f5a623' : '#ddd' }}>
                  ★
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="感想を書いてみましょう"
            style={{ width: '100%', minHeight: 70, padding: '10px 12px', border: '1px solid var(--color-brand-border)', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', background: 'var(--color-bg-card)', color: 'var(--color-text)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handleSubmit} disabled={posting || !body.trim()}
              style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: posting || !body.trim() ? 'not-allowed' : 'pointer', opacity: posting || !body.trim() ? 0.5 : 1 }}>
              {posting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px 16px', textAlign: 'center', borderBottom: '1px solid var(--color-brand-light)' }}>
          <Link href="/auth/login" style={{ fontSize: 13, color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 600 }}>ログインしてコメントする</Link>
        </div>
      )}

      {/* コメント一覧 */}
      {sortedComments.length === 0 ? (
        <div style={{ padding: '30px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-faint)' }}>
          まだコメントがありません
        </div>
      ) : (
        sortedComments.map((c, i) => (
          <div key={c.id} style={{ padding: '14px 16px', borderBottom: i < sortedComments.length - 1 ? '1px solid var(--color-brand-light)' : 'none', background: c.is_pinned ? 'var(--color-brand-light)' : 'transparent' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {c.icon_url ? (
                <img src={c.icon_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-brand-light)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {(c.display_name || '?')[0]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <Link href={`/author/${c.user_id}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textDecoration: 'none' }}>{c.display_name}</Link>
                  {c.user_id === authorId && <span style={{ fontSize: 10, background: 'var(--color-brand)', color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>作者</span>}
                  {c.is_pinned && <span style={{ fontSize: 10, background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '1px 6px', borderRadius: 3 }}>ピン留め</span>}
                  <StarDisplay rating={c.rating} />
                  <span style={{ fontSize: 11, color: 'var(--color-text-faint)', marginLeft: 'auto' }}>{fmtDate(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                  <button onClick={() => toggleLike(c.id)} disabled={!userId}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: userId ? 'pointer' : 'default', fontSize: 12, color: likedComments.has(c.id) ? 'var(--color-danger)' : 'var(--color-text-muted)', padding: 0 }}>
                    {likedComments.has(c.id) ? '♥' : '♡'} {c.like_count > 0 && c.like_count}
                  </button>
                  {userId === authorId && (
                    <button onClick={() => togglePin(c.id, c.is_pinned)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)', padding: 0 }}>
                      {c.is_pinned ? 'ピン解除' : 'ピン留め'}
                    </button>
                  )}
                  {(userId === c.user_id || userId === authorId) && (
                    <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-danger)', padding: 0 }}>
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
