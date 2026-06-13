'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Tweet {
  id: string
  user_id: string
  body: string
  image_url: string | null
  created_at: string
  display_name: string
  icon_url: string | null
  like_count: number
  comment_count: number
  liked: boolean
  comments: TweetComment[]
  showComments: boolean
  showCount: number
}

interface TweetComment {
  id: string
  user_id: string
  body: string
  created_at: string
  display_name: string
  icon_url: string | null
}

interface Props {
  authorId: string
  currentUserId: string | null
  currentUserName: string | null
  currentUserIconUrl: string | null
  isOwner: boolean
}

function fmtDate(s: string) {
  const d = new Date(s), now = new Date(), diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'たった今'
  if (diff < 3600000) return `${Math.floor(diff/60000)}分前`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`
  if (diff < 604800000) return `${Math.floor(diff/86400000)}日前`
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
}

function Avatar({ name, iconUrl, size=32 }: { name: string; iconUrl?: string | null; size?: number }) {
  if (iconUrl) return <img src={iconUrl} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}} alt=""/>
  return <div style={{width:size,height:size,borderRadius:'50%',background:'#F26A21',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.38,fontWeight:700,color:'#fff',flexShrink:0}}>{name?.[0]||'?'}</div>
}

export default function TweetSection({ authorId, currentUserId, currentUserName, currentUserIconUrl, isOwner }: Props) {
  const supabase = createClient()
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [commentBody, setCommentBody] = useState<Record<string, string>>({})
  const [commentPosting, setCommentPosting] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTweets()
  }, [authorId])

  async function loadTweets() {
    setLoading(true)
    const { data: tweetsData } = await supabase
      .from('tweets')
      .select('id, user_id, body, image_url, created_at')
      .eq('user_id', authorId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!tweetsData || tweetsData.length === 0) { setLoading(false); return }

    // プロフィール取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, icon_url')
      .eq('user_id', authorId)
      .single()

    // いいね取得
    const tweetIds = tweetsData.map(t => t.id)
    const { data: likesData } = await supabase
      .from('tweet_likes')
      .select('tweet_id, user_id')
      .in('tweet_id', tweetIds)

    // コメント取得
    const { data: commentsData } = await supabase
      .from('tweet_comments')
      .select('id, tweet_id, user_id, body, created_at')
      .in('tweet_id', tweetIds)
      .order('created_at', { ascending: true })

    // コメントのプロフィール
    const commentUserIds = Array.from(new Set((commentsData||[]).map(c => c.user_id)))
    const commentProfileMap: Record<string, any> = {}
    if (commentUserIds.length > 0) {
      const { data: cProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, icon_url')
        .in('user_id', commentUserIds)
      cProfiles?.forEach(p => { commentProfileMap[p.user_id] = p })
    }

    const likeMap: Record<string, number> = {}
    const likedSet = new Set<string>()
    likesData?.forEach(l => {
      likeMap[l.tweet_id] = (likeMap[l.tweet_id]||0) + 1
      if (l.user_id === currentUserId) likedSet.add(l.tweet_id)
    })

    const commentMap: Record<string, TweetComment[]> = {}
    commentsData?.forEach(c => {
      if (!commentMap[c.tweet_id]) commentMap[c.tweet_id] = []
      commentMap[c.tweet_id].push({
        id: c.id, user_id: c.user_id, body: c.body, created_at: c.created_at,
        display_name: commentProfileMap[c.user_id]?.display_name || '不明',
        icon_url: commentProfileMap[c.user_id]?.icon_url || null,
      })
    })

    setTweets(tweetsData.map(t => ({
      ...t,
      display_name: profile?.display_name || '',
      icon_url: profile?.icon_url || null,
      like_count: likeMap[t.id] || 0,
      comment_count: (commentMap[t.id] || []).length,
      liked: likedSet.has(t.id),
      comments: commentMap[t.id] || [],
      showComments: false,
      showCount: 5,
    })))
    setLoading(false)
  }

  async function handlePost() {
    if (!currentUserId || !body.trim()) return
    setPosting(true)
    let imageUrl: string | null = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `tweets/${currentUserId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('illustrations').upload(path, imageFile)
      if (!upErr) {
        const { data } = supabase.storage.from('illustrations').getPublicUrl(path)
        imageUrl = data.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('tweets')
      .insert({ user_id: currentUserId, body: body.trim(), image_url: imageUrl })
      .select('id, user_id, body, image_url, created_at')
      .single()

    setPosting(false)
    if (error || !data) return

    const newTweet: Tweet = {
      ...data,
      display_name: currentUserName || '',
      icon_url: currentUserIconUrl || null,
      like_count: 0, comment_count: 0,
      liked: false, comments: [], showComments: false,
    }
    setTweets(prev => [newTweet, ...prev])
    setBody('')
    setImageFile(null)
    setImagePreview(null)
  }

  async function handleLike(tweetId: string, liked: boolean) {
    if (!currentUserId) return
    if (liked) {
      await supabase.from('tweet_likes').delete().eq('user_id', currentUserId).eq('tweet_id', tweetId)
    } else {
      await supabase.from('tweet_likes').insert({ user_id: currentUserId, tweet_id: tweetId })
    }
    setTweets(prev => prev.map(t => t.id === tweetId
      ? { ...t, liked: !liked, like_count: liked ? t.like_count-1 : t.like_count+1 }
      : t
    ))
  }

  async function handleComment(tweetId: string) {
    if (!currentUserId || !commentBody[tweetId]?.trim()) return
    setCommentPosting(prev => ({...prev, [tweetId]: true}))
    const { data, error } = await supabase
      .from('tweet_comments')
      .insert({ user_id: currentUserId, tweet_id: tweetId, body: commentBody[tweetId].trim() })
      .select('id, user_id, body, created_at')
      .single()
    setCommentPosting(prev => ({...prev, [tweetId]: false}))
    if (error || !data) return

    const newComment: TweetComment = {
      ...data,
      display_name: currentUserName || '',
      icon_url: currentUserIconUrl || null,
    }
    setTweets(prev => prev.map(t => t.id === tweetId
      ? { ...t, comments: [...t.comments, newComment], comment_count: t.comment_count+1, showComments: true }
      : t
    ))
    setCommentBody(prev => ({...prev, [tweetId]: ''}))
  }

  async function handleDelete(tweetId: string) {
    if (!confirm('このつぶやきを削除しますか？')) return
    await supabase.from('tweets').delete().eq('id', tweetId).eq('user_id', currentUserId!)
    setTweets(prev => prev.filter(t => t.id !== tweetId))
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (!isOwner && tweets.length === 0 && !loading) return null

  return (
    <div>
      {!isOwner && <div style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:12}}>つぶやき</div>}
      {/* 投稿フォーム（マイページからのみ） */}
      {isOwner && (
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'14px',marginBottom:16}}>
          <div style={{display:'flex',gap:10}}>
            <Avatar name={currentUserName||''} iconUrl={currentUserIconUrl} size={36}/>
            <div style={{flex:1}}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="今何してる？近況や作品の進捗を共有しよう"
                style={{width:'100%',padding:'8px 12px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
              />
              {imagePreview && (
                <div style={{position:'relative',display:'inline-block',marginTop:6}}>
                  <img src={imagePreview} style={{maxHeight:120,maxWidth:240,borderRadius:8,display:'block',objectFit:'cover'}} alt="preview"/>
                  <button onClick={()=>{setImageFile(null);setImagePreview(null)}}
                    style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.6)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                </div>
              )}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <button onClick={()=>fileInputRef.current?.click()}
                    style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',border:'1px solid #F0D9C9',borderRadius:16,fontSize:12,color:'#77706A',background:'#fff',cursor:'pointer'}}>
                    🖼️ 画像
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageSelect}/>
                  <span style={{fontSize:11,color:'#B8AEA8'}}>{body.length}/500</span>
                </div>
                <button onClick={handlePost} disabled={posting||!body.trim()}
                  style={{padding:'6px 20px',background:'#F26A21',color:'#fff',border:'none',borderRadius:16,fontSize:13,fontWeight:700,cursor:'pointer',opacity:posting||!body.trim()?0.5:1}}>
                  {posting ? '投稿中...' : '投稿'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* つぶやき一覧 */}
      {loading ? (
        <div style={{textAlign:'center',padding:'24px',color:'#B8AEA8',fontSize:13}}>読み込み中...</div>
      ) : tweets.length === 0 ? (
        isOwner ? (
          <div style={{textAlign:'center',padding:'32px',color:'#B8AEA8',fontSize:13}}>
            まだつぶやきがありません。マイページから投稿できます。
          </div>
        ) : null
      ) : tweets.map(tweet => (
        <div key={tweet.id} style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,marginBottom:12,overflow:'hidden'}}>
          <div style={{padding:'14px 16px'}}>
            {/* ヘッダー */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <Avatar name={tweet.display_name} iconUrl={tweet.icon_url} size={36}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>{tweet.display_name}</div>
                <div style={{fontSize:11,color:'#B8AEA8'}}>{fmtDate(tweet.created_at)}</div>
              </div>
              {isOwner && (
                <button onClick={()=>handleDelete(tweet.id)}
                  style={{fontSize:11,color:'#B8AEA8',background:'none',border:'none',cursor:'pointer',padding:'4px 8px'}}>
                  削除
                </button>
              )}
            </div>

            {/* 本文 */}
            <div style={{fontSize:14,color:'#2B211B',lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:tweet.image_url?10:0}}>
              {tweet.body}
            </div>

            {/* 画像 */}
            {tweet.image_url && (
              <img src={tweet.image_url} style={{maxWidth:'100%',maxHeight:280,objectFit:'contain',borderRadius:8,display:'block',marginBottom:10}} alt=""/>
            )}

            {/* アクション */}
            <div style={{display:'flex',alignItems:'center',gap:16,paddingTop:8,borderTop:'1px solid #FFF1E6'}}>
              <button onClick={()=>handleLike(tweet.id, tweet.liked)}
                style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px',borderRadius:16,border:'1px solid',fontSize:12,cursor:currentUserId?'pointer':'default',
                  background:tweet.liked?'#fef2f2':'#fff',
                  borderColor:tweet.liked?'#fca5a5':'#F0D9C9',
                  color:tweet.liked?'#dc2626':'#77706A'}}>
                {tweet.liked ? '♥' : '♡'} {tweet.like_count}
              </button>
              <button onClick={()=>setTweets(prev=>prev.map(t=>t.id===tweet.id?{...t,showComments:!t.showComments}:t))}
                style={{display:'flex',alignItems:'center',gap:4,padding:'4px 8px',borderRadius:16,border:'1px solid #F0D9C9',fontSize:12,cursor:'pointer',background:tweet.showComments?'#FFF1E6':'#fff',color:tweet.showComments?'#F26A21':'#77706A'}}>
                コメント {tweet.comment_count}
              </button>
            </div>
          </div>

          {/* コメント */}
          {tweet.showComments && (
            <div style={{borderTop:'1px solid #F0D9C9',background:'#FFF9F2'}}>
              {/* コメント入力欄（一番上） */}
              {currentUserId && (
                <div style={{display:'flex',gap:8,padding:'10px 16px',alignItems:'center',borderBottom:'1px solid #F0D9C9',background:'#fff'}}>
                  <Avatar name={currentUserName||''} iconUrl={currentUserIconUrl} size={24}/>
                  <input
                    value={commentBody[tweet.id]||''}
                    onChange={e=>setCommentBody(prev=>({...prev,[tweet.id]:e.target.value}))}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleComment(tweet.id)}}}
                    placeholder="コメントを入力..."
                    maxLength={200}
                    style={{flex:1,padding:'6px 10px',border:'1.5px solid #F0D9C9',borderRadius:16,fontSize:12,outline:'none'}}
                  />
                  <button onClick={()=>handleComment(tweet.id)} disabled={commentPosting[tweet.id]||!commentBody[tweet.id]?.trim()}
                    style={{padding:'6px 12px',background:'#F26A21',color:'#fff',border:'none',borderRadius:16,fontSize:12,cursor:'pointer',opacity:commentPosting[tweet.id]||!commentBody[tweet.id]?.trim()?0.5:1}}>
                    送信
                  </button>
                </div>
              )}
              {/* コメント一覧（5件まで） */}
              {tweet.comments.slice(0, tweet.showCount||5).map(c => (
                <div key={c.id} style={{display:'flex',gap:8,padding:'10px 16px',borderBottom:'1px solid #FFF1E6'}}>
                  <Avatar name={c.display_name} iconUrl={c.icon_url} size={24}/>
                  <div>
                    <span style={{fontSize:12,fontWeight:600,color:'#2B211B',marginRight:6}}>{c.display_name}</span>
                    <span style={{fontSize:11,color:'#B8AEA8'}}>{fmtDate(c.created_at)}</span>
                    <div style={{fontSize:12,color:'#2B211B',marginTop:2}}>{c.body}</div>
                  </div>
                </div>
              ))}
              {/* もっと表示する */}
              {tweet.comments.length > (tweet.showCount||5) && (
                <div style={{padding:'8px 16px',textAlign:'center'}}>
                  <button
                    onClick={()=>setTweets(prev=>prev.map(t=>t.id===tweet.id?{...t,showCount:(t.showCount||5)+5}:t))}
                    style={{fontSize:12,color:'#F26A21',background:'none',border:'none',cursor:'pointer'}}>
                    もっと表示する（残り{tweet.comments.length-(tweet.showCount||5)}件）
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
