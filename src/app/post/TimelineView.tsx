'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TimelineItem { id: string; date_label: string; event: string; order_num: number }
interface Props { novelId: string; userId: string }

export default function TimelineView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<TimelineItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('novel_timeline').select('*').eq('novel_id', novelId).eq('user_id', userId).order('order_num')
      .then(({ data }) => setItems(data || []))
  }, [novelId])

  async function handleAdd() {
    const { data } = await supabase.from('novel_timeline').insert({ novel_id: novelId, user_id: userId, date_label: '', event: '', order_num: items.length }).select().single()
    if (data) { setItems(prev => [...prev, data]); setEditingId(data.id) }
  }

  async function handleUpdate(id: string, field: 'date_label' | 'event', value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    await supabase.from('novel_timeline').update({ [field]: value }).eq('id', id)
  }

  async function handleDelete(id: string) {
    await supabase.from('novel_timeline').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>📅 時系列</h2>
        <button onClick={handleAdd} style={{ marginLeft: 'auto', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>＋ 追加</button>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)', fontSize: 13, border: '2px dashed var(--color-brand-border)', borderRadius: 12 }}>
          時系列イベントを追加してください
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* 縦線 */}
          <div style={{ position: 'absolute', left: 79, top: 0, bottom: 0, width: 2, background: 'var(--color-brand-border)' }}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* 日付 */}
                <div style={{ width: 72, flexShrink: 0, textAlign: 'right' }}>
                  <input value={item.date_label} onChange={e => handleUpdate(item.id, 'date_label', e.target.value)}
                    placeholder="第1章"
                    style={{ width: '100%', border: 'none', borderBottom: '1.5px solid var(--color-brand-border)', padding: '4px 2px', fontSize: 12, fontWeight: 700, color: 'var(--color-brand)', background: 'none', outline: 'none', textAlign: 'right' }}/>
                </div>
                {/* ドット */}
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-brand)', flexShrink: 0, marginTop: 4, zIndex: 1, border: '3px solid var(--color-bg-card)', boxShadow: '0 0 0 2px var(--color-brand)' }}/>
                {/* イベント */}
                <div style={{ flex: 1, background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 10, padding: '10px 14px' }}>
                  <textarea value={item.event} onChange={e => handleUpdate(item.id, 'event', e.target.value)}
                    placeholder="この時点で起きることを書く..."
                    rows={2}
                    style={{ width: '100%', border: 'none', fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none', fontFamily: 'inherit', color: 'var(--color-text)', background: 'none', boxSizing: 'border-box' as const }}/>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', fontSize: 11, cursor: 'pointer' }}>削除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
