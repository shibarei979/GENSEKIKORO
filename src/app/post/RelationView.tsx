'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Character { id: string; name: string; image_url: string | null }
interface Relation { id: string; char_a_id: string; char_b_id: string; relation_label: string }
interface Props { novelId: string; userId: string }

export default function RelationView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [chars, setChars] = useState<Character[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [label, setLabel] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('novel_characters').select('id, name, image_url').eq('novel_id', novelId).eq('user_id', userId).order('order_num'),
      supabase.from('novel_relations').select('*').eq('novel_id', novelId).eq('user_id', userId),
    ]).then(([c, r]) => {
      setChars(c.data || [])
      setRelations(r.data || [])
    })
  }, [novelId])

  async function handleAdd() {
    if (!selectedA || !selectedB || selectedA === selectedB) return
    const { data } = await supabase.from('novel_relations').insert({ novel_id: novelId, user_id: userId, char_a_id: selectedA, char_b_id: selectedB, relation_label: label }).select().single()
    if (data) { setRelations(prev => [...prev, data]); setLabel(''); setSelectedA(''); setSelectedB('') }
  }

  async function handleDelete(id: string) {
    await supabase.from('novel_relations').delete().eq('id', id)
    setRelations(prev => prev.filter(r => r.id !== id))
  }

  async function updateLabel(id: string, v: string) {
    setRelations(prev => prev.map(r => r.id === id ? { ...r, relation_label: v } : r))
    await supabase.from('novel_relations').update({ relation_label: v }).eq('id', id)
  }

  const charMap = Object.fromEntries(chars.map(c => [c.id, c]))

  const Avatar = ({ c }: { c: Character }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {c.image_url
        ? <img src={c.image_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-brand-border)' }} alt=""/>
        : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}></div>
      }
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}> 相関関係</h2>

      {chars.length < 2 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)', fontSize: 13, border: '2px dashed var(--color-brand-border)', borderRadius: 12 }}>
          相関関係を設定するには登場人物を2人以上追加してください
        </div>
      ) : (
        <>
          {/* 追加フォーム */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>関係を追加</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select value={selectedA} onChange={e => setSelectedA(e.target.value)}
                style={{ padding: '6px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12, background: 'var(--color-bg-card)', color: 'var(--color-text)', outline: 'none' }}>
                <option value="">キャラA</option>
                {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="関係（例：親友・ライバル）"
                style={{ flex: 1, minWidth: 120, padding: '6px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12, outline: 'none', background: 'var(--color-bg-card)', color: 'var(--color-text)' }}/>
              <select value={selectedB} onChange={e => setSelectedB(e.target.value)}
                style={{ padding: '6px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12, background: 'var(--color-bg-card)', color: 'var(--color-text)', outline: 'none' }}>
                <option value="">キャラB</option>
                {chars.filter(c => c.id !== selectedA).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={handleAdd} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer' }}>追加</button>
            </div>
          </div>

          {/* 関係一覧 */}
          {relations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>まだ関係が設定されていません</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {relations.map(r => {
                const a = charMap[r.char_a_id], b = charMap[r.char_b_id]
                if (!a || !b) return null
                return (
                  <div key={r.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Avatar c={a}/>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-brand-border)' }}/>
                        <input value={r.relation_label} onChange={e => updateLabel(r.id, e.target.value)}
                          placeholder="関係"
                          style={{ padding: '4px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 20, fontSize: 12, fontWeight: 600, color: 'var(--color-brand)', background: 'var(--color-brand-light)', outline: 'none', textAlign: 'center', minWidth: 80 }}/>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-brand-border)' }}/>
                      </div>
                    </div>
                    <Avatar c={b}/>
                    <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
