'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string | null
  celebratedLike: boolean
  celebratedDiscover: boolean
}

type Celebration = { type: 'like' | 'discover'; fromName: string | null } | null

// 初めての「いいね」「発掘」が付いたら、次にサイトを開いた瞬間に祝う小さなモーダル
export default function FirstCelebration({ userId, celebratedLike, celebratedDiscover }: Props) {
  const supabase = createClient()
  const [celebration, setCelebration] = useState<Celebration>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!userId) return
    if (celebratedLike && celebratedDiscover) return
    // 1セッション1回だけチェック（ページ遷移ごとのクエリを防ぐ）
    if (typeof window !== 'undefined' && sessionStorage.getItem('first-celebration-checked')) return
    sessionStorage.setItem('first-celebration-checked', '1')

    ;(async () => {
      // 自分の作品ID
      const { data: myNovels } = await supabase.from('novels').select('id').eq('author_id', userId).limit(50)
      const novelIds = (myNovels || []).map((n: any) => n.id)
      if (novelIds.length === 0) return

      // 発掘を優先して祝う（より大きな出来事）
      if (!celebratedDiscover) {
        const { data: dc } = await supabase
          .from('discovers').select('display_name, user_id')
          .in('novel_id', novelIds).eq('is_pending', false)
          .order('created_at', { ascending: true }).limit(1)
        if (dc && dc.length > 0) {
          setCelebration({ type: 'discover', fromName: dc[0].display_name || null })
          await supabase.from('profiles').update({ celebrated_first_discover: true }).eq('user_id', userId)
          return
        }
      }
      if (!celebratedLike) {
        const { data: lk } = await supabase
          .from('likes').select('user_id')
          .in('novel_id', novelIds)
          .order('created_at', { ascending: true }).limit(1)
        if (lk && lk.length > 0) {
          let fromName: string | null = null
          if (lk[0].user_id) {
            const { data: p } = await supabase.from('profiles').select('display_name').eq('user_id', lk[0].user_id).maybeSingle()
            fromName = p?.display_name || null
          }
          setCelebration({ type: 'like', fromName })
          await supabase.from('profiles').update({ celebrated_first_like: true }).eq('user_id', userId)
        }
      }
    })()
  }, [userId])

  if (!celebration) return null

  const isDiscover = celebration.type === 'discover'

  function close() {
    setClosing(true)
    setTimeout(() => setCelebration(null), 250)
  }

  return (
    <div onClick={close}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, opacity: closing ? 0 : 1, transition: 'opacity .25s' }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-card)', borderRadius: 18, padding: '30px 26px', maxWidth: 380, width: '100%', textAlign: 'center',
          border: isDiscover ? '2px solid var(--color-brand)' : '1px solid var(--color-brand-border)',
          boxShadow: isDiscover ? '0 8px 40px rgba(242,106,33,0.35)' : '0 8px 30px rgba(0,0,0,0.15)',
          transform: closing ? 'scale(0.95)' : 'scale(1)', transition: 'transform .25s',
        }}>
        <div style={{ fontSize: 46, marginBottom: 8, lineHeight: 1 }}>{isDiscover ? '💎✨' : '🎉'}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: isDiscover ? 'var(--color-brand)' : 'var(--color-text)', marginBottom: 8, lineHeight: 1.5 }}>
          {isDiscover ? 'あなたの作品が発掘されました！' : 'はじめての いいね が届きました！'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.8, marginBottom: 18 }}>
          {isDiscover ? (
            <>
              {celebration.fromName ? `${celebration.fromName}さんが、` : '読者が、'}あなたの作品を「原石」として見つけ、
              推薦してくれました。<br/>物語が、誰かの心に届いた証です。
            </>
          ) : (
            <>
              {celebration.fromName ? `${celebration.fromName}さんから、` : ''}最初のいいねが届きました。<br/>
              あなたの物語を読んだ人が、確かにいます。
            </>
          )}
        </div>
        <button onClick={close}
          style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--color-brand)', border: 'none', borderRadius: 12, padding: '11px 32px', cursor: 'pointer' }}>
          {isDiscover ? 'これからも書き続ける' : 'うれしい！'}
        </button>
      </div>
    </div>
  )
}
