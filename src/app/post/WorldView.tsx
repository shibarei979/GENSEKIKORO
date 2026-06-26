'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WorldItem { id: string; title: string; body: string; order_num: number }
interface Props { novelId: string; userId: string }

const TEMPLATES = ['地理・場所', '歴史・年表', '魔法・システム', '文化・風習', '組織・勢力', '用語集', 'その他']

export default function WorldView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState<WorldItem[]>([])
  const [selected, setSelected] = useState<WorldItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    supabase.from('novel_memos').select('*').eq('novel_id', novelId).eq('user_id', userId).eq('category', 'world').order('order_num')
      .then(({ data }) => setItems(data || []))
  }, [novelId])

  async function handleNew(title = '新しい設定') {
    const { data } = await supabase.from('novel_memos').insert({ novel_id: novelId, user_id: userId, category: 'world', title, body: '', order_num: items.length }).select().single()
    if (data) { setItems(prev => [...prev, data]); select(data) }
  }

  function select(item: WorldItem) { setSelected(item); setEditTitle(item.title); setEditBody(item.body) }

  function autoSave(title: string, body: string) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (!selected) return
      setSaving(true)
      await supabase.from('novel_memos').update({ title, body, updated_at: new Date().toISOString() }).eq('id', selected.id)
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, title, body } : i))
      setSaving(false)
    }, 800)
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_memos').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* リスト */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--color-brand-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--color-brand-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>世界観</span>
            <button onClick={() => handleNew()} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>＋</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginBottom: 6 }}>テンプレートから追加：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {TEMPLATES.map(t => (
              <button key={t} onClick={() => handleNew(t)}
                style={{ fontSize: 9, padding: '2px 6px', border: '1px solid var(--color-brand-border)', borderRadius: 10, background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.map(item => (
            <div key={item.id} onClick={() => select(item)}
              style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-brand-light)', cursor: 'pointer', background: selected?.id === item.id ? 'var(--color-brand-light)' : 'none' }}>
              <div style={{ fontSize: 12, fontWeight: selected?.id === item.id ? 700 : 500, color: selected?.id === item.id ? 'var(--color-brand)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.body?.slice(0, 25) || '内容なし'}</div>
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
            placeholder="世界観の設定を自由に記述..."
            style={{ flex: 1, padding: '16px', border: 'none', fontSize: 13, lineHeight: 1.9, resize: 'none', outline: 'none', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-card)' }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
          設定を選択または追加してください
        </div>
      )}
    </div>
  )
}
