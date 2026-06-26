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
  const [view, setView] = useState<'menu' | 'list' | 'edit'>('menu')
  const [activeCategory, setActiveCategory] = useState('')
  const [memos, setMemos] = useState<Memo[]>([])
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!novelId) return
    supabase.from('novel_memos').select('*')
      .eq('novel_id', novelId).eq('user_id', userId).order('order_num')
      .then(({ data }) => setMemos(data || []))
  }, [novelId])

  const filtered = memos.filter(m => m.category === activeCategory)

  function openCategory(catId: string) {
    setActiveCategory(catId)
    setSelectedMemo(null)
    setView('list')
  }

  async function handleNew() {
    if (!novelId) return
    const { data } = await supabase.from('novel_memos').insert({
      novel_id: novelId, user_id: userId, category: activeCategory,
      title: '新規', body: '', order_num: filtered.length,
    }).select().single()
    if (data) {
      setMemos(prev => [...prev, data])
      openEdit(data)
    }
  }

  function openEdit(m: Memo) {
    setSelectedMemo(m)
    setEditTitle(m.title)
    setEditBody(m.body)
    setView('edit')
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
      await supabase.from('novel_memos').update({
        title: memo.title, body: memo.body, updated_at: new Date().toISOString()
      }).eq('id', memo.id)
      setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, title: memo.title, body: memo.body } : m))
      setSaving(false)
    }, 800)
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_memos').delete().eq('id', id)
    setMemos(prev => prev.filter(m => m.id !== id))
    setView('list')
    setSelectedMemo(null)
  }

  const W = open ? 220 : 36

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

      {/* ヘッダー */}
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
          <polyline
            points={open ? '10,3 4,7 10,11' : '4,3 10,7 4,11'}
            stroke="var(--color-brand)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* メニュー画面 */}
          {view === 'menu' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!novelId ? (
                <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                  作品を選択すると<br/>メモが使えます
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {CATEGORIES.map(c => {
                    const count = memos.filter(m => m.category === c.id).length
                    return (
                      <button key={c.id} onClick={() => openCategory(c.id)}
                        style={{
                          padding: '13px 16px',
                          border: 'none',
                          borderBottom: '1px solid var(--color-brand-border)',
                          background: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'left' as const,
                        }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{c.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {count > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{count}</span>
                          )}
                          <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                            <polyline points="2,1 6,6 2,11" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* リスト画面 */}
          {view === 'list' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0, background: 'var(--color-bg)' }}>
                <button onClick={() => setView('menu')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-brand)', padding: '2px 4px' }}>
                  ‹
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>
                  {CATEGORIES.find(c => c.id === activeCategory)?.label}
                </span>
                <button onClick={handleNew}
                  style={{ fontSize: 18, color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
                  ＋
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                    まだありません<br/>
                    <button onClick={handleNew}
                      style={{ marginTop: 10, padding: '6px 14px', border: '1px dashed var(--color-brand)', borderRadius: 6, background: 'none', fontSize: 11, color: 'var(--color-brand)', cursor: 'pointer' }}>
                      追加する
                    </button>
                  </div>
                ) : filtered.map(m => (
                  <button key={m.id} onClick={() => openEdit(m)}
                    style={{
                      width: '100%', padding: '10px 14px',
                      border: 'none', borderBottom: '1px solid var(--color-brand-light)',
                      background: 'none', cursor: 'pointer', textAlign: 'left' as const,
                      display: 'block',
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                      {m.title || '（無題）'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.body || '内容なし'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 編集画面 */}
          {view === 'edit' && selectedMemo && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0, background: 'var(--color-bg)' }}>
                <button onClick={() => setView('list')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-brand)', padding: '2px 4px' }}>
                  ‹
                </button>
                <span style={{ fontSize: 10, color: saving ? 'var(--color-brand)' : 'var(--color-text-faint)', marginLeft: 'auto' }}>
                  {saving ? '保存中…' : '自動保存'}
                </span>
                <button onClick={() => handleDelete(selectedMemo.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-danger)', padding: '2px 4px' }}>
                  削除
                </button>
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
        </div>
      )}
    </div>
  )
}
