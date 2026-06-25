'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuote } from './QuoteContext'

interface Comment {
  id: string; body: string; created_at: string; user_id: string
  display_name: string; icon_url?: string; like_count?: number
  is_pinned?: boolean; parent_id?: string | null; replies?: Comment[]
  quoted_text?: string | null
}

interface Props {
  novelId: string; episodeId: string; userId: string | null
  userName: string | null; userIconUrl?: string | null; authorId: string
  comments?: any[]
  quotedText?: string | null
  onClearQuote?: () => void
}

function Avatar({ name, iconUrl, size=26 }: { name:string; iconUrl?:string; size?:number }) {
  if (iconUrl) return <img src={iconUrl} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt=""/>
  return <div style={{width:size,height:size,borderRadius:'50%',background:'var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.4,color:'var(--color-brand)',fontWeight:700,flexShrink:0}}>{name?.[0]||'?'}</div>
}

function fmtDate(s: string) {
  const d = new Date(s), now = new Date(), diff = now.getTime()-d.getTime()
  if (diff < 60000) return 'たった今'
  if (diff < 3600000) return `${Math.floor(diff/60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`
  if (diff < 604800000) return `${Math.floor(diff/86400000)}日前`
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
}

export default function CommentSection({ novelId, episodeId, userId, userName, userIconUrl, authorId, quotedText: quotedTextProp, onClearQuote: onClearQuoteProp }: Props) {
  const supabase = createClient()
  const quoteCtx = useQuote()
  const quotedText = quotedTextProp !== undefined ? quotedTextProp : quoteCtx.quotedText
  const onClearQuote = onClearQuoteProp || (() => quoteCtx.setQuotedText(null))
  const { selecting, setSelecting, commentAnchorRef } = quoteCtx
  const [comments,    setComments]    = useState<Comment[]>([])
  const [body,        setBody]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [likedIds,    setLikedIds]    = useState<Set<string>>(new Set())
  const [deletingId,  setDeletingId]  = useState('')
  const [showAll,     setShowAll]     = useState(false)
  const [replyTo,     setReplyTo]     = useState<{id:string;name:string}|null>(null)
  const [replyBody,   setReplyBody]   = useState('')
  const [replyLoading,setReplyLoading]= useState(false)
  const [commentsAllowed, setCommentsAllowed] = useState(true)
  const LIMIT = 50

  useEffect(() => {
    // 作品ごとのコメント許可チェック
    supabase.from('novels').select('allow_comments').eq('id', novelId).single()
      .then(({ data }) => { if (data?.allow_comments === false) setCommentsAllowed(false) })
  }, [novelId])

  useEffect(() => {
    supabase.from('comments')
      .select('id,body,created_at,user_id,is_pinned,parent_id,quoted_text')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(async ({ data }) => {
        if (!data) return
        const uids = Array.from(new Set(data.map((d: any) => d.user_id)))
        const { data: profiles } = await supabase
          .from('profiles').select('user_id,display_name,icon_url').in('user_id', uids)
        const profileMap: Record<string,any> = {}
        profiles?.forEach((p: any) => { profileMap[p.user_id] = p })
        const flat: Comment[] = data.map((d: any) => ({
          id: d.id, body: d.body, created_at: d.created_at,
          user_id: d.user_id, is_pinned: d.is_pinned,
          like_count: 0, parent_id: d.parent_id,
          quoted_text: d.quoted_text || null,
          display_name: profileMap[d.user_id]?.display_name||'不明',
          icon_url: profileMap[d.user_id]?.icon_url||'',
        }))
        const roots = flat.filter(c => !c.parent_id)
        roots.forEach(r => { r.replies = flat.filter(c => c.parent_id === r.id) })
        roots.sort((a,b) => (b.is_pinned?1:0)-(a.is_pinned?1:0) || (b.like_count||0)-(a.like_count||0))
        setComments(roots)
      })
  }, [episodeId])

  useEffect(() => {
    if (!userId || comments.length === 0) return
    const allIds = comments.flatMap(c => [c.id, ...(c.replies||[]).map(r=>r.id)])
    supabase.from('comment_likes').select('comment_id').eq('user_id', userId).in('comment_id', allIds)
      .then(({ data }) => { if (data) setLikedIds(new Set(data.map((d: any) => d.comment_id))) })
  }, [userId, comments.length])

  async function handleSubmit() {
    if (!userId || !body.trim()) return
    // 作品ごとのコメント許可チェック
    if (!commentsAllowed) {
      alert('この作品はコメントを受け付けていません')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('comments')
      .insert({ novel_id: novelId, episode_id: episodeId, user_id: userId, body: body.trim(), parent_id: null, quoted_text: quotedText || null })
      .select('id,body,created_at,user_id,quoted_text').single()
    setLoading(false)
    if (error || !data) return
    const newComment = { ...data, display_name: userName||'', icon_url: userIconUrl||'', like_count:0, replies:[] }
    setComments(prev => [...prev, newComment])
    setBody('')
    onClearQuote?.()
    if (userId !== authorId) {
      fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ user_id: authorId, type:'comment',
          message: `${userName||'読者'}さんがコメントしました：「${data.body.slice(0,30)}${data.body.length>30?'…':''}」`,
          link: window.location.pathname }) })
    }
  }

  async function handleReply(parentId: string) {
    if (!userId || !replyBody.trim()) return
    setReplyLoading(true)
    const { data, error } = await supabase.from('comments')
      .insert({ novel_id: novelId, episode_id: episodeId, user_id: userId, body: replyBody.trim(), parent_id: parentId })
      .select('id,body,created_at,user_id').single()
    setReplyLoading(false)
    if (error || !data) return
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
        ...c, like_count: c.id===commentId?(c.like_count||1)-1:c.like_count,
        replies:(c.replies||[]).map(r=>r.id===commentId?{...r,like_count:(r.like_count||1)-1}:r)
      })))
    } else {
      await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId })
      setLikedIds(prev => new Set([...Array.from(prev), commentId]))
      setComments(prev => prev.map(c => ({
        ...c, like_count: c.id===commentId?(c.like_count||0)+1:c.like_count,
        replies:(c.replies||[]).map(r=>r.id===commentId?{...r,like_count:(r.like_count||0)+1}:r)
      })))
    }
  }

  async function handlePin(commentId: string, current: boolean) {
    await supabase.from('comments').update({ is_pinned: !current }).eq('id', commentId)
    setComments(prev => prev.map(c=>c.id===commentId?{...c,is_pinned:!current}:c)
      .sort((a,b)=>(b.is_pinned?1:0)-(a.is_pinned?1:0)))
  }

  async function handleDelete(commentId: string, isReply=false, parentId?: string) {
    if (!confirm('コメントを削除しますか？')) return
    setDeletingId(commentId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setDeletingId(''); return }
    await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user.id)
    if (isReply && parentId) {
      setComments(prev => prev.map(c=>c.id===parentId?{...c,replies:(c.replies||[]).filter(r=>r.id!==commentId)}:c))
    } else {
      setComments(prev => prev.filter(c=>c.id!==commentId))
    }
    setDeletingId('')
  }

  function CommentCard({ c, isReply=false, parentId, parentRootId }: { c:Comment; isReply?:boolean; parentId?:string; parentRootId?:string }) {
    const isAuthor = c.user_id === authorId
    const liked = likedIds.has(c.id)
    const isMe = c.user_id === userId
    return (
      <div style={{
        padding: isReply?'8px 12px':'12px 16px',
        borderBottom: isReply?'none':'1px solid var(--color-brand-light)',
        background: c.is_pinned?'#fffbeb':isReply?'var(--color-bg-subtle)':'transparent',
        borderLeft: isReply?'2px solid var(--color-brand-border)':'none',
        marginLeft: isReply?36:0,
        borderRadius: isReply?'0 0 6px 6px':0,
      }}>
        {c.is_pinned && !isReply && <div style={{fontSize:10,color:'var(--color-warning)',marginBottom:4}}>📌 ピン留め</div>}
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
          <Avatar name={c.display_name} iconUrl={c.icon_url} size={isReply?22:26}/>
          <span style={{fontSize:isReply?11:12,fontWeight:600,color:isAuthor?'var(--color-info)':'var(--color-text)'}}>{c.display_name}</span>
          {isAuthor && <span style={{fontSize:9,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 5px',borderRadius:3,fontWeight:700}}>作者</span>}
          <span style={{fontSize:10,color:'var(--color-text-faint)',marginLeft:'auto'}}>{fmtDate(c.created_at)}</span>
        </div>
        {!isReply && c.quoted_text && (
          <div style={{paddingLeft:33,marginBottom:6}}>
            <div style={{fontSize:11.5,color:'#8a5a3a',background:'#FFF6EC',border:'1px solid #f0d9c0',borderLeft:'3px solid var(--color-brand)',borderRadius:'2px 6px 6px 2px',padding:'6px 10px',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
              <span style={{fontSize:10,color:'var(--color-brand)',fontWeight:700,marginRight:4}}>引用</span>
              "{c.quoted_text.length > 60 ? c.quoted_text.slice(0,60)+'…' : c.quoted_text}"
            </div>
          </div>
        )}
        <div style={{fontSize:12,color:'var(--color-text)',lineHeight:1.7,paddingLeft:isReply?29:33,whiteSpace:'pre-wrap'}}>{c.body}</div>
        <div style={{paddingLeft:isReply?29:33,marginTop:5,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <button onClick={()=>handleCommentLike(c.id)}
            style={{display:'inline-flex',alignItems:'center',gap:3,padding:'2px 8px',borderRadius:10,border:'1px solid',fontSize:11,cursor:userId?'pointer':'default',
              background:liked?'#fef2f2':'var(--color-bg-card)',borderColor:liked?'#fca5a5':'var(--color-brand-border)',color:liked?'var(--color-danger)':'var(--color-text-muted)'}}>
            ♡ {c.like_count||0}
          </button>
          {userId && (
            <button onClick={()=>{setReplyTo({id: parentRootId||c.id, name:c.display_name});setReplyBody('')}}
              style={{fontSize:11,color:'var(--color-text-muted)',background:'none',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'2px 8px',cursor:'pointer'}}>
              返信
            </button>
          )}
          {userId===authorId && !isReply && c.user_id!==authorId && (
            <button onClick={()=>handlePin(c.id,c.is_pinned||false)}
              style={{fontSize:10,color:c.is_pinned?'var(--color-warning)':'var(--color-text-muted)',background:'none',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'2px 8px',cursor:'pointer'}}>
              {c.is_pinned?'ピン解除':'ピン留め'}
            </button>
          )}
          {isMe && (
            <button onClick={()=>handleDelete(c.id,isReply,parentId)} disabled={deletingId===c.id}
              style={{fontSize:10,color:'var(--color-text-faint)',background:'none',border:'none',cursor:'pointer',padding:0,marginLeft:'auto'}}>
              {deletingId===c.id?'削除中…':'削除'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const displayComments = showAll ? comments : comments.slice(0, LIMIT)

  return (
    <div ref={commentAnchorRef} style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden',marginTop:20,scrollMarginTop:80}}>
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)'}}>
        <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>コメント ({comments.reduce((sum,c)=>sum+(c.replies?.length||0)+1,0)})</span>
      </div>
      <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
        {!commentsAllowed ? (
          <div style={{textAlign:'center',fontSize:12,color:'var(--color-text-muted)',padding:'6px'}}>
            この作品はコメントを受け付けていません
          </div>
        ) : userId ? (
          <>
            {quotedText ? (
              <div style={{display:'flex',alignItems:'flex-start',gap:8,background:'#FFF6EC',border:'1px solid #f0d9c0',borderLeft:'3px solid var(--color-brand)',borderRadius:'2px 8px 8px 2px',padding:'8px 10px',marginBottom:8}}>
                <div style={{flex:1,fontSize:12,color:'#8a5a3a',lineHeight:1.6}}>
                  <span style={{fontSize:10,color:'var(--color-brand)',fontWeight:700,marginRight:4}}>引用</span>
                  "{quotedText.length > 80 ? quotedText.slice(0,80)+'…' : quotedText}"
                </div>
                <button onClick={onClearQuote} style={{fontSize:11,color:'var(--color-text-faint)',background:'none',border:'none',cursor:'pointer',padding:0,flexShrink:0}}>✕</button>
              </div>
            ) : (
              <button onClick={()=>setSelecting(!selecting)}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'8px 12px',marginBottom:8,background:selecting?'var(--color-brand-light)':'var(--color-bg-card)',border:`1.5px dashed ${selecting?'var(--color-brand)':'var(--color-brand-border)'}`,borderRadius:8,fontSize:12,color:selecting?'var(--color-brand)':'var(--color-text-muted)',cursor:'pointer',fontWeight:500}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                {selecting ? '本文中の文をクリックしてください（キャンセルする場合は再度タップ）' : '本文から引用する'}
              </button>
            )}
            <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
              {['最高だった','続きが気になる','うぽつ'].map(label => (
                <button key={label} onClick={()=>setBody(label)}
                  style={{padding:'5px 12px',background:body===label?'var(--color-brand-light)':'var(--color-bg)',border:`1.5px solid ${body===label?'var(--color-brand)':'var(--color-brand-border)'}`,borderRadius:16,fontSize:12,cursor:'pointer',color:body===label?'var(--color-brand)':'var(--color-text)',fontWeight:500}}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <Avatar name={userName||''} iconUrl={userIconUrl||''} size={28}/>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2}
                placeholder={quotedText ? 'この文へのコメントを書く...' : 'コメントを書く...'}
                style={{flex:1,padding:'8px 12px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:12,resize:'none',outline:'none',fontFamily:'inherit'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,alignItems:'center'}}>
              <span style={{fontSize:11,color:'var(--color-text-faint)'}}>{body.length}/1000</span>
              <button onClick={handleSubmit} disabled={loading||!body.trim()}
                style={{padding:'5px 16px',background:'var(--color-brand)',color:'var(--color-bg-card)',border:'none',borderRadius:14,fontSize:12,fontWeight:600,cursor:'pointer',opacity:loading||!body.trim()?0.5:1}}>
                {loading?'送信中...':'投稿'}
              </button>
            </div>
          </>
        ) : (
          <div style={{textAlign:'center',fontSize:12,color:'var(--color-text-muted)',padding:'6px'}}>
            <a href="/auth/login" style={{color:'var(--color-brand)',fontWeight:600}}>ログイン</a>してコメントする
          </div>
        )}
      </div>
      {comments.length === 0
        ? <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'var(--color-text-faint)'}}>まだコメントがありません</div>
        : displayComments.map(c => (
          <div key={c.id}>
            <CommentCard c={c}/>
            {(c.replies||[]).map(r => <CommentCard key={r.id} c={r} isReply parentId={c.id} parentRootId={c.id}/>)}
            {replyTo?.id === c.id && (
              <div style={{marginLeft:36,padding:'8px 12px',background:'var(--color-bg)',borderLeft:'2px solid var(--color-brand)'}}>
                <div style={{fontSize:11,color:'var(--color-brand)',marginBottom:4}}>{replyTo.name} への返信</div>
                <textarea value={replyBody} onChange={e=>setReplyBody(e.target.value)} rows={2}
                  placeholder="返信を書く..."
                  style={{width:'100%',padding:'6px 10px',border:'1.5px solid var(--color-brand-border)',borderRadius:6,fontSize:12,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end',marginTop:4}}>
                  <button onClick={()=>{setReplyTo(null);setReplyBody('')}}
                    style={{fontSize:11,color:'var(--color-text-muted)',background:'none',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'3px 10px',cursor:'pointer'}}>
                    キャンセル
                  </button>
                  <button onClick={()=>handleReply(c.id)} disabled={replyLoading||!replyBody.trim()}
                    style={{fontSize:11,color:'var(--color-bg-card)',background:'var(--color-brand)',border:'none',borderRadius:10,padding:'3px 10px',cursor:'pointer',opacity:replyLoading||!replyBody.trim()?0.5:1}}>
                    {replyLoading?'送信中...':'返信する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      }
      {comments.length > LIMIT && !showAll && (
        <div style={{padding:'10px',textAlign:'center',borderTop:'1px solid var(--color-brand-border)'}}>
          <button onClick={()=>setShowAll(true)}
            style={{fontSize:12,color:'var(--color-brand)',background:'none',border:'1px solid var(--color-brand-border)',borderRadius:16,padding:'6px 20px',cursor:'pointer'}}>
            もっと見る（残り{comments.length-LIMIT}件）
          </button>
        </div>
      )}
    </div>
  )
}
