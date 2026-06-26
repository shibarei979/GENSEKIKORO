'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Memo {
  id: string
  category: string
  title: string
  body: string
  order_num: number
}

interface Props {
  novelId: string | null
  userId: string
}

const CATEGORIES = [
  { id: 'character', label: '登場人物' },
  { id: 'world',     label: '世界観' },
  { id: 'plot',      label: 'プロット' },
  { id: 'memo',      label: 'メモ' },
]

export default function MemoSidebar({ novelId, userId }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(true)
  const [activeCategory, setActiveCategory] = useState('character')
  const [memos, setMemos] = useState<Memo[]>([])
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!novelId) return
    supabase.from('novel_memos').select('*').eq('novel_id', novelId).eq('user_id', userId)
      .order('order_num').then(({ data }) => {
        setMemos(data || [])
      })
  }, [novelId])

  const filtered = memos.filter(m => m.category === activeCategory)

  async function handleNew() {
    if (!novelId) return
    const { data } = await supabase.from('novel_memos').insert({
      novel_id: novelId, user_id: userId, category: activeCategory,
      title: '新規', body: '', order_num: filtered.length,
    }).select().single()
    if (data) {
      setMemos(prev => [...prev, data])
      selectMemo(data)
    }
  }

  function selectMemo(m: Memo) {
    setSelectedMemo(m)
    setEditTitle(m.title)
    setEditBody(m.body)
  }

  function handleTitleChange(v: string) {
    setEditTitle(v)
    autoSave({ ...selectedMemo!, title: v, body: editBody })
  }

  function handleBodyChange(v: string) {
    setEditBody(v)
    autoSave({ ...selectedMemo!, title: editTitle, body: v })
  }

  function autoSave(memo: Memo) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('novel_memos').update({ title: memo.title, body: memo.body, updated_at: new Date().toISOString() }).eq('id', memo.id)
      setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, title: memo.title, body: memo.body } : m))
      setSaving(false)
    }, 800)
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_memos').delete().eq('id', id)
    setMemos(prev => prev.filter(m => m.id !== id))
    if (selectedMemo?.id === id) setSelectedMemo(null)
  }

  const W = open ? 260 : 36

  return (
    <div style={{
      width: W, minWidth: W, flexShrink: 0,
      transition: 'width 0.2s ease, min-width 0.2s ease',
      background: 'var(--color-bg)',
      borderRight: '1px solid var(--color-brand-border)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      position: 'sticky', top: 60,
      overflow: 'hidden',
    }}>

      {/* 開閉ボタン */}
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 0', border: 'none',
        borderBottom: '1px solid var(--color-brand-border)',
        background: 'var(--color-bg)', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        paddingLeft: open ? 12 : 0, paddingRight: open ? 8 : 0,
        flexShrink: 0,
      }}>
        {open && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>執筆メモ</span>}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <polyline points={open ? '10,3 4,7 10,11' : '4,3 10,7 4,11'} stroke="var(--color-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          {/* カテゴリタブ */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-brand-border)', flexShrink: 0 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => { setActiveCategory(c.id); setSelectedMemo(null) }}
                style={{
                  flex: 1, padding: '6px 2px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: activeCategory === c.id ? 'var(--color-brand-light)' : 'var(--color-bg)',
                  color: activeCategory === c.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
                  borderBottom: activeCategory === c.id ? '2px solid var(--color-brand)' : '2px solid transparent',
                }}>
                {c.label}
              </button>
            ))}
          </div>

          {!selectedMemo ? (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {!novelId ? (
                <div style={{ padding: 12, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                  作品を選択するとメモが使えます
                </div>
              ) : (
                <>
                  <button onClick={handleNew} style={{
                    margin: 10, padding: '6px', border: '1px dashed var(--color-brand-border)',
                    borderRadius: 6, background: 'none', fontSize: 12, color: 'var(--color-brand)',
                    cursor: 'pointer', flexShrink: 0,
                  }}>＋ 追加</button>
                  {filtered.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', padding: 12 }}>
                      まだありません
                    </div>
                  ) : filtered.map(m => (
                    <div key={m.id} onClick={() => selectMemo(m)}
                      style={{
                        padding: '8px 12px', borderBottom: '1px solid var(--color-brand-light)',
                        cursor: 'pointer', fontSize: 12, color: 'var(--color-text)',
                        fontWeight: 600, lineHeight: 1.4,
                      }}>
                      {m.title || '（無題）'}
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 400, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.body || '内容なし'}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setSelectedMemo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-brand)', padding: '2px 4px' }}>‹ 戻る</button>
                <span style={{ fontSize: 10, color: saving ? 'var(--color-brand)' : 'var(--color-text-faint)', marginLeft: 'auto' }}>{saving ? '保存中…' : '自動保存'}</span>
                <button onClick={() => handleDelete(selectedMemo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-danger)', padding: '2px 4px' }}>削除</button>
              </div>
              <input value={editTitle} onChange={e => handleTitleChange(e.target.value)}
                placeholder="タイトル"
                style={{ padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--color-brand-border)', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none', flexShrink: 0 }}
              />
              <textarea value={editBody} onChange={e => handleBodyChange(e.target.value)}
                placeholder="内容を入力..."
                style={{ flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.8 }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
