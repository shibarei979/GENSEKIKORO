'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Plot { id: string; title: string; body: string; order_num: number }
interface Props { novelId: string; userId: string }

export default function PlotView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [plots, setPlots] = useState<Plot[]>([])
  const [selected, setSelected] = useState<Plot | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    supabase.from('novel_plots').select('*').eq('novel_id', novelId).eq('user_id', userId).order('order_num')
      .then(({ data }) => setPlots(data || []))
  }, [novelId])

  async function handleNew() {
    const { data } = await supabase.from('novel_plots').insert({ novel_id: novelId, user_id: userId, title: '新しい章', body: '', order_num: plots.length }).select().single()
    if (data) { setPlots(prev => [...prev, data]); select(data) }
  }

  function select(p: Plot) { setSelected(p); setEditTitle(p.title); setEditBody(p.body) }

  function autoSave(title: string, body: string) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (!selected) return
      setSaving(true)
      await supabase.from('novel_plots').update({ title, body, updated_at: new Date().toISOString() }).eq('id', selected.id)
      setPlots(prev => prev.map(p => p.id === selected.id ? { ...p, title, body } : p))
      setSaving(false)
    }, 800)
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_plots').delete().eq('id', id)
    setPlots(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function moveUp(idx: number) {
    if (idx === 0) return
    const newPlots = [...plots]
    const [moved] = newPlots.splice(idx, 1)
    newPlots.splice(idx - 1, 0, moved)
    const updated = newPlots.map((p, i) => ({ ...p, order_num: i }))
    setPlots(updated)
    await Promise.all(updated.map(p => supabase.from('novel_plots').update({ order_num: p.order_num }).eq('id', p.id)))
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* リスト */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--color-brand-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>プロット</span>
          <button onClick={handleNew} style={{ background: 'var(--color-brand)', color: 'var(--color-text-inverse)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>＋</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {plots.length === 0 ? (
            <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center' }}>章・シーンを追加してください</div>
          ) : plots.map((p, i) => (
            <div key={p.id} onClick={() => select(p)}
              style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-brand-light)', cursor: 'pointer', background: selected?.id === p.id ? 'var(--color-brand-light)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); moveUp(i) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-text-faint)', padding: 0, lineHeight: 1 }}>▲</button>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: selected?.id === p.id ? 700 : 500, color: selected?.id === p.id ? 'var(--color-brand)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--color-text-faint)', marginRight: 4, fontSize: 10 }}>#{i + 1}</span>
                  {p.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.body?.slice(0, 30) || '内容なし'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 編集 */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-brand-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <input value={editTitle} onChange={e => { setEditTitle(e.target.value); autoSave(e.target.value, editBody) }}
              style={{ flex: 1, border: 'none', fontSize: 15, fontWeight: 700, color: 'var(--color-text)', background: 'none', outline: 'none' }}/>
            <span style={{ fontSize: 10, color: saving ? 'var(--color-brand)' : 'var(--color-text-faint)' }}>{saving ? '保存中…' : '自動保存'}</span>
            <button onClick={() => handleDelete(selected.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: 11, cursor: 'pointer' }}>削除</button>
          </div>
          <textarea value={editBody} onChange={e => { setEditBody(e.target.value); autoSave(editTitle, e.target.value) }}
            placeholder="このシーン・章の内容を書く..."
            style={{ flex: 1, padding: '16px', border: 'none', fontSize: 13, lineHeight: 1.9, resize: 'none', outline: 'none', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-card)' }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
          章・シーンを選択または追加してください
        </div>
      )}
    </div>
  )
}
