'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  body: string
  created_at: string
  user_id: string
  display_name: string
  icon_url?: string
  like_count?: number
  is_pinned?: boolean
  parent_id?: string | null
  replies?: Comment[]
}

interface Props {
  novelId: string
  userId: string | null
  userName: string | null
  userIconUrl?: string | null
  authorId: string
}

function Avatar({ name, iconUrl, size=28 }: { name:string; iconUrl?:string; size?:number }) {
  if (iconUrl) return <img src={iconUrl} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt=""/>
  return <div style={{width:size,height:size,borderRadius:'50%',background:'#F0D9C9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.4,color:'#F26A21',fontWeight:700,flexShrink:0}}>{name?.[0]||'?'}</div>
}

function fmtDate(s: string) {
  const d = new Date(s), now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'たった今'
  if (diff < 3600000) return `${Math.floor(diff/60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`
  if (diff < 604800000) return `${Math.floor(diff/86400000)}日前`
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
}

export default function NovelCommentSection({ novelId, userId, userName, userIconUrl, authorId }: Props) {
  const supabase = createClient()
  const [comments,    setComments]    = useState<Comment[]>([])
  const [body,        setBody]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [likedIds,    setLikedIds]    = useState<Set<string>>(new Set())
  const [deletingId,  setDeletingId]  = useState('')
  const [showAll,     setShowAll]     = useState(false)
  const [replyTo,     setReplyTo]     = useState<{id:string;name:string}|null>(null)
  const [replyBody,   setReplyBody]   = useState('')
  const [replyLoading,setReplyLoading]= useState(false)
  const LIMIT = 50

  useEffect(() => {
    supabase.from('comments')
      .select('id,body,created_at,user_id,is_pinned,parent_id')
      .eq('novel_id', novelId)
      .is('episode_id', null)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!data) return
        const flat: Comment[] = data.map((d: any) => ({
          id: d.id, body: d.body, created_at: d.created_at,
          user_id: d.user_id, is_pinned: d.is_pinned,
          like_count: 0, parent_id: d.parent_id,
          display_name: d.profiles?.display_name || '不明',
          icon_url: d.profiles?.icon_url || '',
        }))
        const roots = flat.filter(c => !c.parent_id)
        roots.forEach(r => { r.replies = flat.filter(c => c.parent_id === r.id) })
        roots.sort((a,b) => (b.is_pinned?1:0)-(a.is_pinned?1:0) || (b.like_count||0)-(a.like_count||0))
        setComments(roots)
      })
  }, [novelId])

  useEffect(() => {
    if (!userId || comments.length === 0) return
    const allIds = comments.flatMap(c => [c.id, ...(c.replies||[]).map(r=>r.id)])
    supabase.from('comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', allIds)
      .then(({ data }) => { if (data) setLikedIds(new Set(data.map((d: any) => d.comment_id))) })
  }, [userId, comments.length])

  async function handleSubmit() {
    if (!userId || !body.trim()) return
    setLoading(true); setError('')
    const { data, error: err } = await supabase.from('comments')
      .insert({ novel_id: novelId, user_id: userId, body: body.trim(), parent_id: null })
      .select('id,body,created_at,user_id').single()
    setLoading(false)
    if (err || !data) { setError('投稿に失敗しました'); return }
    const newComment: Comment = { ...data, display_name: userName||'', icon_url: userIconUrl||'', like_count:0, replies:[] }
    setComments(prev => [...prev, newComment])
    setBody('')
  }

  async function handleReply(parentId: string) {
    if (!userId || !replyBody.trim()) return
    setReplyLoading(true)
    const { data, error: err } = await supabase.from('comments')
      .insert({ novel_id: novelId, user_id: userId, body: replyBody.trim(), parent_id: parentId })
      .select('id,body,created_at,user_id').single()
    setReplyLoading(false)
    if (err || !data) return
    const newReply: Comment = { ...data, display_name: userName||'', icon_url: userIconUrl||'', like_count:0 }
    setComments(prev => prev.map(c => {
      if (c.id !== parentId) return c
      if (userId !== c.user_id) {
        fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ user_id: c.user_id, type:'reply',
            message: `${userName||'読者'}さんが返信しました：「${data.body.slice(0,30)}${data.body.length>30?'…':''}」`,
            link: window.location.pathname }) })
      }
      return { ...c, replies: [...(c.replies||[]), newReply] }
    }))
    setReplyBody(''); setReplyTo(null)
  }

  async function handleCommentLike(commentId: string) {
    if (!userId) return
    const liked = likedIds.has(commentId)
    if (liked) {
      await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId)
      setLikedIds(prev => { const s = new Set(prev); s.delete(commentId); return s })
      setComments(prev => prev.map(c => ({
        ...c,
        like_count: c.id === commentId ? (c.like_count||1)-1 : c.like_count,
        replies: (c.replies||[]).map(r => r.id === commentId ? {...r, like_count:(r.like_count||1)-1} : r)
      })))
    } else {
      await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId })
      setLikedIds(prev => new Set([...Array.from(prev), commentId]))
      setComments(prev => prev.map(c => ({
        ...c,
        like_count: c.id === commentId ? (c.like_count||0)+1 : c.like_count,
        replies: (c.replies||[]).map(r => r.id === commentId ? {...r, like_count:(r.like_count||0)+1} : r)
      })))
    }
  }

  async function handlePin(commentId: string, current: boolean) {
    await supabase.from('comments').update({ is_pinned: !current }).eq('id', commentId)
    setComments(prev => {
      const updated = prev.map(c => c.id === commentId ? { ...c, is_pinned: !current } : c)
      return updated.sort((a,b) => (b.is_pinned?1:0)-(a.is_pinned?1:0))
    })
  }

  async function handleDelete(commentId: string, isReply=false, parentId?: string) {
    if (!confirm('コメントを削除しますか？')) return
    setDeletingId(commentId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setDeletingId(''); return }
    await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id)
    if (isReply && parentId) {
      setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: (c.replies||[]).filter(r => r.id !== commentId) } : c))
    } else {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
    setDeletingId('')
  }

  const displayComments = showAll ? comments : comments.slice(0, LIMIT)

  function CommentCard({ c, isReply=false, parentId, parentRootId }: { c:Comment; isReply?:boolean; parentId?:string; parentRootId?:string }) {
    const isAuthor = c.user_id === authorId
    const liked = likedIds.has(c.id)
    const isMe = c.user_id === userId
    return (
      <div style={{
        padding: isReply ? '8px 12px' : '12px 16px',
        borderBottom: isReply ? 'none' : '1px solid #FFF1E6',
        background: c.is_pinned ? '#fffbeb' : isReply ? '#f8f8f8' : 'transparent',
        borderLeft: isReply ? '2px solid #F0D9C9' : 'none',
        marginLeft: isReply ? 36 : 0,
        borderRadius: isReply ? '0 0 6px 6px' : 0,
      }}>
        {c.is_pinned && !isReply && (
          <div style={{fontSize:10,color:'#92400e',marginBottom:4}}>📌 ピン留め</div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
          <Avatar name={c.display_name} iconUrl={c.icon_url} size={isReply?22:26}/>
          <span style={{fontSize:isReply?11:12,fontWeight:600,color:isAuthor?'#1d4ed8':'#2B211B'}}>{c.display_name}</span>
          {isAuthor && <span style={{fontSize:9,background:'#eff6ff',color:'#1d4ed8',border:'1px solid #93c5fd',padding:'1px 5px',borderRadius:3,fontWeight:700}}>作者</span>}
          <span style={{fontSize:10,color:'#B8AEA8',marginLeft:'auto'}}>{fmtDate(c.created_at)}</span>
        </div>
        <div style={{fontSize:12,color:'#2B211B',lineHeight:1.7,paddingLeft:isReply?29:33,whiteSpace:'pre-wrap'}}>
          {c.body}
        </div>
        <div style={{paddingLeft:isReply?29:33,marginTop:5,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <button onClick={()=>handleCommentLike(c.id)}
            style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:10,border:'1px solid',fontSize:11,cursor:userId?'pointer':'default',
              background:liked?'#fef2f2':'#fff',borderColor:liked?'#fca5a5':'#F0D9C9',color:liked?'#dc2626':'#77706A'}}>
            ♡ {c.like_count||0}
          </button>
          {userId && !isReply && (
            <button onClick={()=>{ setReplyTo({id:c.id,name:c.display_name}); setReplyBody('') }}
              style={{fontSize:11,color:'#77706A',background:'none',border:'1px solid #F0D9C9',borderRadius:10,padding:'2px 8px',cursor:'pointer'}}>
              返信
            </button>
          )}
          {userId === authorId && !isReply && c.user_id !== authorId && (
            <button onClick={()=>handlePin(c.id, c.is_pinned||false)}
              style={{fontSize:10,color:c.is_pinned?'#92400e':'#77706A',background:'none',border:'1px solid #F0D9C9',borderRadius:10,padding:'2px 8px',cursor:'pointer'}}>
              {c.is_pinned?'ピン解除':'ピン留め'}
            </button>
          )}
          {isMe && (
            <button onClick={()=>handleDelete(c.id, isReply, parentId)} disabled={deletingId===c.id}
              style={{fontSize:10,color:'#B8AEA8',background:'none',border:'none',cursor:'pointer',padding:0,marginLeft:'auto'}}>
              {deletingId===c.id?'削除中…':'削除'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>コメント ({comments.reduce((sum,c)=>sum+(c.replies?.length||0)+1,0)})</span>
      </div>
      <div style={{padding:'12px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
        {userId ? (
          <>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <Avatar name={userName||''} iconUrl={userIconUrl||''} size={28}/>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2}
                placeholder="コメントを書く..."
                style={{flex:1,padding:'8px 12px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:12,resize:'none',outline:'none',fontFamily:'inherit'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,alignItems:'center'}}>
              {error && <span style={{fontSize:11,color:'#dc2626',marginRight:'auto'}}>{error}</span>}
              <span style={{fontSize:11,color:'#B8AEA8'}}>{body.length}/1000</span>
              <button onClick={handleSubmit} disabled={loading||!body.trim()}
                style={{padding:'5px 16px',background:'#F26A21',color:'#fff',border:'none',borderRadius:14,fontSize:12,fontWeight:600,cursor:'pointer',opacity:loading||!body.trim()?0.5:1}}>
                {loading?'送信中...':'投稿'}
              </button>
            </div>
          </>
        ) : (
          <div style={{textAlign:'center',fontSize:12,color:'#77706A',padding:'6px'}}>
            <a href="/auth/login" style={{color:'#F26A21',fontWeight:600}}>ログイン</a>してコメントする
          </div>
        )}
      </div>
      {comments.length === 0
        ? <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'#B8AEA8'}}>まだコメントがありません</div>
        : displayComments.map(c => (
          <div key={c.id}>
            <CommentCard c={c}/>
            {(c.replies||[]).map(r => <CommentCard key={r.id} c={r} isReply parentId={c.id} parentRootId={c.id}/>)}
            {replyTo?.id === c.id && (
              <div style={{marginLeft:36,padding:'8px 12px',background:'#FFF9F2',borderLeft:'2px solid #F26A21'}}>
                <div style={{fontSize:11,color:'#F26A21',marginBottom:4}}>{replyTo.name} への返信</div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={2}
                  placeholder="返信を書く..."
                  style={{width:'100%',padding:'6px 10px',border:'1.5px solid #F0D9C9',borderRadius:6,fontSize:12,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end',marginTop:4}}>
                  <button onClick={()=>{setReplyTo(null);setReplyBody('')}}
                    style={{fontSize:11,color:'#77706A',background:'none',border:'1px solid #F0D9C9',borderRadius:10,padding:'3px 10px',cursor:'pointer'}}>
                    キャンセル
                  </button>
                  <button onClick={()=>handleReply(c.id)} disabled={replyLoading||!replyBody.trim()}
                    style={{fontSize:11,color:'#fff',background:'#F26A21',border:'none',borderRadius:10,padding:'3px 10px',cursor:'pointer',opacity:replyLoading||!replyBody.trim()?0.5:1}}>
                    {replyLoading?'送信中...':'返信する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      }
      {comments.length > LIMIT && !showAll && (
        <div style={{padding:'10px',textAlign:'center',borderTop:'1px solid #F0D9C9'}}>
          <button onClick={()=>setShowAll(true)}
            style={{fontSize:12,color:'#F26A21',background:'none',border:'1px solid #F0D9C9',borderRadius:16,padding:'6px 20px',cursor:'pointer'}}>
            もっと見る（残り{comments.length - LIMIT}件）
          </button>
        </div>
      )}
    </div>
  )
}
