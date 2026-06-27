'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FloatingMemo({ userId }: { userId: string | null }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  if (!userId) return null

  async function handleSubmit() {
    if (!text.trim()) return
    setSaving(true)
    const { data: maxRow } = await supabase.from('novel_memos')
      .select('order_num').eq('user_id', userId).eq('category', 'memo')
      .order('order_num', { ascending: false }).limit(1).maybeSingle()
    const nextOrder = (maxRow?.order_num ?? -1) + 1
    await supabase.from('novel_memos').insert({
      novel_id: null,
      user_id: userId,
      category: 'memo',
      title: title.trim() || '無題のメモ',
      body: text.trim(),
      order_num: nextOrder,
    })
    setSaving(false)
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setOpen(false)
      setText('')
      setTitle('')
    }, 1200)
  }

  return (
    <>
      {/* 付箋パネル */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }}/>
          <div style={{
            position: 'fixed', bottom: 80, right: 20, zIndex: 999,
            width: 280, background: '#fefce8',
            border: '1px solid #fde68a',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}>
            {/* ヘッダー */}
            <div style={{ background: '#fbbf24', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#78350f' }}>クイックメモ</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#78350f', padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="タイトル（省略可）"
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #fde68a', background: 'none', fontSize: 12, fontWeight: 600, color: '#78350f', outline: 'none', marginBottom: 8, padding: '2px 0', boxSizing: 'border-box' as const }}/>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="メモを書く..."
                autoFocus
                rows={5}
                style={{ width: '100%', border: 'none', background: 'none', fontSize: 13, color: '#451a03', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' as const }}/>
              {text.trim() && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  {done ? (
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>投函しました！</span>
                  ) : (
                    <button onClick={handleSubmit} disabled={saving}
                      style={{ padding: '6px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                      {saving ? '投函中...' : '投函する'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* フローティングボタン */}
      <button onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 999,
          width: 48, height: 48, borderRadius: '50%',
          background: open ? '#f59e0b' : 'var(--color-brand)',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: 24, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
        }}>
        {open ? '×' : '＋'}
      </button>
    </>
  )
}
