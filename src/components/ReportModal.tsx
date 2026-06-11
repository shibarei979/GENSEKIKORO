'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const REASONS: Record<string, string[]> = {
  novel: [
    '著作権・権利侵害',
    'AI生成コンテンツの無断投稿',
    '誹謗中傷・差別的表現',
    '性的・暴力的な不適切表現',
    '未成年に有害なコンテンツ',
    'スパム・宣伝目的',
    'その他',
  ],
  comment: [
    '誹謗中傷・嫌がらせ',
    'スパム・宣伝目的',
    '個人情報の掲載',
    '差別的・ヘイト的表現',
    'その他',
  ],
  user: [
    '不正行為・なりすまし',
    'スパム・迷惑行為',
    '誹謗中傷・嫌がらせ',
    'その他',
  ],
}

interface Props {
  targetType: 'novel' | 'comment' | 'user'
  targetId: string
  targetName?: string
  userId: string
  onClose: () => void
}

export default function ReportModal({ targetType, targetId, targetName, userId, onClose }: Props) {
  const supabase = createClient()
  const [reason,  setReason]  = useState('')
  const [body,    setBody]    = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const typeLabel = targetType === 'novel' ? '作品' : targetType === 'comment' ? 'コメント' : 'ユーザー'

  async function handleSubmit() {
    setError('')
    if (!reason) { setError('通報理由を選択してください'); return }
    setLoading(true)
    const { error: err } = await supabase.from('reports').insert({
      reporter_id: userId,
      target_type: targetType,
      target_id: targetId,
      reason,
      body: body.trim() || null,
    })
    setLoading(false)
    if (err) { setError('送信に失敗しました'); return }
    setSent(true)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}
      onClick={e=>{ if (e.target === e.currentTarget) onClose() }}>
      <div style={{background:'#fff',borderRadius:14,padding:'24px',maxWidth:440,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>

        {sent ? (
          <>
            <div style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:10}}>通報を受け付けました</div>
            <p style={{fontSize:13,color:'#77706A',lineHeight:1.8,marginBottom:20}}>
              内容を確認し、必要に応じて対応いたします。<br/>
              通報の処理結果は個別にお知らせできない場合があります。
            </p>
            <button onClick={onClose}
              style={{width:'100%',padding:'10px',background:'#F26A21',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
              閉じる
            </button>
          </>
        ) : (
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>{typeLabel}を通報する</div>
              <button onClick={onClose} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#77706A',padding:'0 4px'}}>×</button>
            </div>

            {targetName && (
              <div style={{fontSize:12,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:8,padding:'8px 12px',marginBottom:14}}>
                対象：{targetName}
              </div>
            )}

            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:700,color:'#2B211B',display:'block',marginBottom:8}}>
                通報理由<span style={{color:'#F26A21',marginLeft:4}}>必須</span>
              </label>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {REASONS[targetType].map(r => (
                  <label key={r} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'8px 10px',
                    border:`1px solid ${reason===r?'#F26A21':'#F0D9C9'}`,borderRadius:8,background:reason===r?'#FFF1E6':'#fff'}}>
                    <input type="radio" name="reason" value={r} checked={reason===r} onChange={()=>setReason(r)} style={{accentColor:'#F26A21'}}/>
                    <span style={{fontSize:13,color:'#2B211B'}}>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#2B211B',display:'block',marginBottom:6}}>
                詳細<span style={{color:'#B8AEA8',marginLeft:4,fontWeight:400}}>任意</span>
              </label>
              <textarea value={body} onChange={e=>setBody(e.target.value)} rows={3}
                placeholder="詳しい状況があればご記入ください"
                style={{width:'100%',padding:'8px 12px',border:'1px solid #F0D9C9',borderRadius:8,fontSize:12,resize:'none',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>

            {error && <div style={{fontSize:12,color:'#dc2626',marginBottom:10}}>{error}</div>}

            <div style={{display:'flex',gap:10}}>
              <button onClick={onClose}
                style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>
                キャンセル
              </button>
              <button onClick={handleSubmit} disabled={loading}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:loading?0.6:1}}>
                {loading?'送信中…':'通報する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
