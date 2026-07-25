'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Review {
  id: string
  novel_id: string
  episode_id: string
  user_id: string
  episode_title: string
  novel_title: string
  author_name: string
  reason: string
  status: string
  created_at: string
}

interface Props {
  reviews: Review[]
}

export default function AiReviewSection({ reviews: initialReviews }: Props) {
  const supabase = createClient()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [loading, setLoading] = useState<string>('')
  const [toast, setToast] = useState('')

  const pending = reviews.filter(r => r.status === 'pending')
  const handled = reviews.filter(r => r.status !== 'pending')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // 問題なし（誤検知）→ ステータスを cleared に
  async function handleClear(review: Review) {
    setLoading(review.id)
    await supabase.from('ai_reviews').update({ status: 'cleared' }).eq('id', review.id)
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'cleared' } : r))
    setLoading('')
    showToast('問題なしとして処理しました')
  }

  // 削除要請 → 話を非公開にして status を requested に
  async function handleDeleteRequest(review: Review) {
    setLoading(review.id)
    // 該当エピソードを非公開に（novelを非公開）
    await supabase.from('novels').update({ published: false }).eq('id', review.novel_id)
    await supabase.from('ai_reviews').update({ status: 'requested' }).eq('id', review.id)
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'requested' } : r))
    setLoading('')
    showToast('作品を非公開にし、削除要請としてマークしました')
  }

  // 削除実行 → 話を完全削除して status を deleted に
  async function handleDelete(review: Review) {
    if (!confirm(`「${review.novel_title}」を完全に削除しますか？\nこの操作は取り消せません。`)) return
    setLoading(review.id)
    await supabase.from('novels').delete().eq('id', review.novel_id)
    await supabase.from('ai_reviews').update({ status: 'deleted' }).eq('id', review.id)
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, status: 'deleted' } : r))
    setLoading('')
    showToast('作品を削除しました')
  }

  const statusLabel: Record<string,{label:string;color:string;bg:string}> = {
    pending:   { label:'審査待ち', color:'#92400e', bg:'#fffbeb' },
    cleared:   { label:'問題なし', color:'#065f46', bg:'#f0fdf4' },
    requested: { label:'削除要請済', color:'#1d4ed8', bg:'#eff6ff' },
    deleted:   { label:'削除済み',  color:'#6b7280', bg:'#f9fafb' },
  }

  return (
    <div style={{background:'var(--color-bg-card)',border:'1px solid #e2e8f0',borderRadius:12,marginBottom:20,overflow:'hidden'}}>
      {/* ヘッダー */}
      <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16}}>🤖</span>
          <span style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>AI疑い作品の審査</span>
          {pending.length > 0 && (
            <span style={{fontSize:11,background:'#ef4444',color:'var(--color-text-inverse)',padding:'1px 8px',borderRadius:10,fontWeight:700}}>
              {pending.length} 件待ち
            </span>
          )}
        </div>
        <div style={{fontSize:11,color:'#94a3b8'}}>
          投稿時に **太字** などのAIパターンが検出された作品
        </div>
      </div>

      {/* 審査待ち */}
      {pending.length === 0 ? (
        <div style={{padding:'32px',textAlign:'center',color:'#94a3b8',fontSize:13}}>
          審査待ちの作品はありません
        </div>
      ) : (
        <div>
          {pending.map(r => (
            <div key={r.id} style={{padding:'16px 20px',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                {/* 左：情報 */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{r.novel_title}</span>
                    <span style={{fontSize:11,color:'#64748b'}}>／ {r.episode_title}</span>
                    <span style={{fontSize:11,color:'#94a3b8'}}>by {r.author_name}</span>
                  </div>
                  {/* 検出理由 */}
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,padding:'6px 10px',fontSize:11,color:'#78350f',marginBottom:8,lineHeight:1.7}}>
                    <span style={{fontWeight:600}}>検出パターン：</span>{r.reason}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:10,color:'#94a3b8'}}>
                      {new Date(r.created_at).toLocaleDateString('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                    </span>
                    <a href={`/novel/${r.novel_id}`} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:11,color:'#3b82f6',textDecoration:'none'}}>
                      作品を確認 ›
                    </a>
                  </div>
                </div>

                {/* 右：アクションボタン */}
                <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                  <button onClick={()=>handleClear(r)} disabled={loading===r.id}
                    style={{padding:'6px 14px',border:'1px solid #86efac',borderRadius:8,background:'#f0fdf4',color:'#15803d',fontSize:12,fontWeight:600,cursor:'pointer',opacity:loading===r.id?0.5:1,whiteSpace:'nowrap'}}>
                    ✓ 問題なし
                  </button>
                  <button onClick={()=>handleDeleteRequest(r)} disabled={loading===r.id}
                    style={{padding:'6px 14px',border:'1px solid #fca5a5',borderRadius:8,background:'#fff0f0',color:'#dc2626',fontSize:12,fontWeight:600,cursor:'pointer',opacity:loading===r.id?0.5:1,whiteSpace:'nowrap'}}>
                    ⚠ 非公開にする
                  </button>
                  <button onClick={()=>handleDelete(r)} disabled={loading===r.id}
                    style={{padding:'6px 14px',border:'1px solid #dc2626',borderRadius:8,background:'#dc2626',color:'var(--color-text-inverse)',fontSize:12,fontWeight:700,cursor:'pointer',opacity:loading===r.id?0.5:1,whiteSpace:'nowrap'}}>
                    🗑 完全削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 処理済み一覧（折りたたみ） */}
      {handled.length > 0 && (
        <details style={{borderTop:'1px solid #e2e8f0'}}>
          <summary style={{padding:'10px 20px',fontSize:12,color:'#64748b',cursor:'pointer',background:'#fafafa',userSelect:'none'}}>
            処理済み（{handled.length}件）
          </summary>
          <div>
            {handled.map(r => {
              const st = statusLabel[r.status] || { label:r.status, color:'#64748b', bg:'#f9fafb' }
              return (
                <div key={r.id} style={{padding:'12px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:12,opacity:0.7}}>
                  <span style={{fontSize:11,background:st.bg,color:st.color,padding:'2px 8px',borderRadius:6,fontWeight:600,flexShrink:0}}>
                    {st.label}
                  </span>
                  <span style={{fontSize:12,color:'#1e293b',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.novel_title} / {r.episode_title}
                  </span>
                  <span style={{fontSize:11,color:'#94a3b8',flexShrink:0}}>by {r.author_name}</span>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* トースト */}
      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,background:'#1e293b',color:'var(--color-text-inverse)',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
          {toast}
        </div>
      )}
    </div>
  )
}
