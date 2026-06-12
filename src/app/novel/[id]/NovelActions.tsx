'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoginPromptModal from '@/components/LoginPromptModal'

interface Props {
  novelId: string
  userId: string | null
  authorId?: string
  novelTitle?: string
  isAuthor: boolean
  initialLiked: boolean
  initialBookmarked: boolean
  initialDiscovered: boolean
  likeCount: number
  bookmarkCount: number
  discoverCount: number
  userDisplayName?: string
}

function fmtNum(n: number): string {
  if (n >= 10000) return (Math.floor(n / 1000) / 10) + '万'
  if (n >= 1000) return (Math.floor(n / 100) / 10) + 'K'
  return n.toString()
}

export default function NovelActions({ novelId, userId, authorId, novelTitle, isAuthor, initialLiked, initialBookmarked, initialDiscovered, likeCount, bookmarkCount, discoverCount, userDisplayName }: Props) {
  const supabase = createClient()
  const [liked,       setLiked]       = useState(initialLiked)
  const [bookmarked,  setBookmarked]  = useState(initialBookmarked)
  const [discovered,  setDiscovered]  = useState(initialDiscovered)
  const [likes,       setLikes]       = useState(likeCount)
  const [bookmarks,   setBookmarks]   = useState(bookmarkCount)
  const [discovers,   setDiscovers]   = useState(discoverCount)
  const [loading,     setLoading]     = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment,     setComment]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [showLogin,   setShowLogin]   = useState(false)
  const [loginMsg,    setLoginMsg]    = useState('')

  function requireLogin(msg: string) {
    setLoginMsg(msg)
    setShowLogin(true)
  }

  async function toggleLike() {
    if (!userId) return requireLogin('いいねするにはログインが必要です')
    if (loading) return
    setLoading(true)
    if (liked) {
      await supabase.from('likes').delete().eq('novel_id', novelId).eq('user_id', userId)
      setLiked(false); setLikes(c => Math.max(0, c - 1))
    } else {
      await supabase.from('likes').insert({ novel_id: novelId, user_id: userId })
      setLiked(true); setLikes(c => c + 1)
      if (authorId && userId !== authorId) {
        fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ user_id: authorId, type:'like',
            message: `「${novelTitle||'作品'}」にいいねがつきました`, link: `/novel/${novelId}` }) })
      }
    }
    setLoading(false)
  }

  async function toggleBookmark() {
    if (!userId) return requireLogin('ブックマークするにはログインが必要です')
    if (loading) return
    setLoading(true)
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('novel_id', novelId).eq('user_id', userId)
      setBookmarked(false); setBookmarks(c => Math.max(0, c - 1))
    } else {
      await supabase.from('bookmarks').insert({ novel_id: novelId, user_id: userId })
      setBookmarked(true); setBookmarks(c => c + 1)
    }
    setLoading(false)
  }

  async function handleDiscover() {
    if (!userId) return requireLogin('拡散するにはログインが必要です')
    if (isAuthor) return
    if (discovered) {
      if (!confirm('拡散を取り消すと、投稿したコメントも削除されます。よろしいですか？')) return
      await supabase.from('discovers').delete().eq('novel_id', novelId).eq('user_id', userId)
      setDiscovered(false); setDiscovers(c => Math.max(0, c - 1))
      setShowComment(false)
    } else {
      setShowComment(true)
    }
  }

  async function submitDiscover() {
    if (!userId || !comment.trim()) return
    setSubmitting(true)

    let isPending = false
    let pendingReason = ''
    try {
      const checkRes = await fetch('/api/check-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      })
      const checkData = await checkRes.json()
      isPending = checkData.pending || false
      pendingReason = checkData.reason || ''
    } catch (_) {}

    await supabase.from('discovers').insert({
      novel_id: novelId,
      user_id: userId,
      comment: comment.trim(),
      display_name: userDisplayName || '',
      is_pending: isPending,
      pending_reason: pendingReason || null,
    })

    setDiscovered(true)
    if (!isPending) setDiscovers(c => c + 1)
    setShowComment(false); setComment('')
    setSubmitting(false)

    if (isPending) {
      alert('コメントの内容を確認中です。審査通過後に公開されます。')
    } else {
      if (authorId && userId !== authorId) {
        fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ user_id: authorId, type:'discover',
            message: `「${novelTitle||'作品'}」が拡散されました`,
            link: `/novel/${novelId}` }) })
      }
    }
  }

  function handleXShare() {
    const url = `${window.location.origin}/novel/${novelId}`
    const text = `「${novelTitle||'作品'}」\n#原石航路 #ライトノベル\n`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer')
  }

  const btn = (active: boolean, color: string) => ({
    display:'inline-flex' as const, alignItems:'center' as const, gap:6,
    padding:'8px 16px', borderRadius:20, border:'1.5px solid', cursor:'pointer' as const,
    fontSize:13, fontWeight:500 as const,
    background: active ? (color==='#dc2626'?'#fef2f2':'#FFF1E6') : '#fff',
    borderColor: active ? color : '#F0D9C9',
    color: active ? color : '#77706A',
    transition: 'all .15s',
    opacity: loading ? 0.7 : 1,
  })

  return (
    <div>
      <LoginPromptModal show={showLogin} onClose={()=>setShowLogin(false)} message={loginMsg} />

      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <button onClick={toggleLike} style={btn(liked,'#dc2626')}>
          {liked?'♥':'♡'} {fmtNum(likes)}
        </button>
        <button onClick={toggleBookmark} style={btn(bookmarked,'#F26A21')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked?'#F26A21':'none'} stroke={bookmarked?'#F26A21':'#B8AEA8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          {fmtNum(bookmarks)}
        </button>
        <button onClick={handleDiscover}
          disabled={isAuthor}
          style={isAuthor ? {...btn(false,'#B8AEA8'), cursor:'not-allowed' as const, opacity:0.4} : btn(discovered,'#F26A21')}
          title={isAuthor ? '自分の作品は拡散できません' : 'この作品をもっと広めたい！という気持ちを伝える'}>
          拡散する
        </button>
        <button onClick={handleXShare}
          style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:20,
            border:'1.5px solid #e2e8f0',background:'#fff',color:'#374151',
            fontSize:13,fontWeight:500,cursor:'pointer',transition:'all .15s'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          シェア
        </button>
      </div>

      {/* 拡散コメント入力 */}
      {showComment && (
        <div style={{marginTop:12,background:'#FFF1E6',border:'1.5px solid #f5b080',borderRadius:12,padding:'16px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#F26A21',marginBottom:8}}>この作品の魅力を伝えよう！</div>
          <div style={{fontSize:11,color:'#2B211B',marginBottom:8,lineHeight:1.6}}>紹介コメントを書いてください。作品ページに表示されます。</div>
          <textarea value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="例：世界観が独特で、主人公の成長が胸に刺さります！続きが気になりすぎる作品です。"
            rows={3}
            style={{width:'100%',padding:'10px 12px',border:'1.5px solid #c4b5fd',borderRadius:8,
              fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box',
              background:'#fff',lineHeight:1.7}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
            <span style={{fontSize:11,color:'#77706A'}}>{comment.length}/200文字</span>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setShowComment(false);setComment('')}}
                style={{padding:'6px 14px',border:'1px solid #f5b080',borderRadius:16,background:'#fff',color:'#F26A21',fontSize:12,cursor:'pointer'}}>
                キャンセル
              </button>
              <button onClick={submitDiscover} disabled={submitting||!comment.trim()}
                style={{padding:'6px 16px',border:'none',borderRadius:16,background:'#F26A21',
                  color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',opacity:submitting||!comment.trim()?0.5:1}}>
                {submitting?'送信中...':'拡散する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
