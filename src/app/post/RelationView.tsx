'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Character { id: string; name: string; image_url: string | null }
interface Relation { id: string; char_a_id: string; char_b_id: string; relation_label: string }
interface Props { novelId: string; userId: string }

export default function RelationView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [chars, setChars] = useState([] as Character[])
  const [relations, setRelations] = useState([] as Relation[])
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

  // 相関図（4人以上）
  const RelationGraph = () => {
    const W = 560, H = 440, CX = W / 2, CY = H / 2
    const R = Math.min(CX, CY) - 64
    const positions = chars.map((c, i) => {
      const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2
      return { id: c.id, x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle), name: c.name, image_url: c.image_url }
    })
    const posMap = Object.fromEntries(positions.map(p => [p.id, p]))

    // 同じペア間に複数の関係がある場合、曲率をずらす
    const pairCount: Record<string, number> = {}
    const pairIndex: Record<string, number> = {}
    relations.forEach(r => {
      const key = [r.char_a_id, r.char_b_id].sort().join('|')
      pairCount[key] = (pairCount[key] || 0) + 1
    })
    const pairCurrent: Record<string, number> = {}

    return (
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <filter id="label-bg">
              <feFlood floodColor="var(--color-bg-card)" result="bg"/>
              <feMerge><feMergeNode in="bg"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* 関係線（ベジェ曲線） */}
          {relations.map(r => {
            const a = posMap[r.char_a_id], b = posMap[r.char_b_id]
            if (!a || !b) return null
            const key = [r.char_a_id, r.char_b_id].sort().join('|')
            pairCurrent[key] = (pairCurrent[key] || 0) + 1
            const total = pairCount[key] || 1
            const idx = pairCurrent[key] - 1
            // 曲率：複数の場合は交互にずらす
            const offset = total === 1 ? 0 : (idx % 2 === 0 ? 1 : -1) * (Math.ceil((idx + 1) / 2) * 40)
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
            const dx = b.y - a.y, dy = -(b.x - a.x)
            const len = Math.sqrt(dx*dx + dy*dy) || 1
            const cx1 = mx + (dx/len) * offset, cy1 = my + (dy/len) * offset
            const path = offset === 0
              ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
              : `M ${a.x} ${a.y} Q ${cx1} ${cy1} ${b.x} ${b.y}`
            // ラベルを1/3点に配置して中心交差を避ける
            const t = 0.35
            const lx = offset === 0
              ? a.x * (1-t) + b.x * t
              : a.x*(1-t)*(1-t) + cx1*2*t*(1-t) + b.x*t*t
            const ly = offset === 0
              ? a.y * (1-t) + b.y * t
              : a.y*(1-t)*(1-t) + cy1*2*t*(1-t) + b.y*t*t
            return (
              <g key={r.id}>
                <path d={path} fill="none" stroke="var(--color-brand-border)" strokeWidth={1.5}/>
                {r.relation_label && (
                  <g>
                    <rect x={lx - r.relation_label.length * 3.5 - 4} y={ly - 9} width={r.relation_label.length * 7 + 8} height={16} rx={4} fill="var(--color-bg-card)" stroke="var(--color-brand-border)" strokeWidth={0.8}/>
                    <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle"
                      style={{ fontSize: 9, fill: 'var(--color-brand)', fontWeight: 700, pointerEvents: 'none' }}>
                      {r.relation_label}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
          {/* キャラクターノード（線の上に描画） */}
          {positions.map(p => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={26} fill="var(--color-bg-card)" stroke="var(--color-brand)" strokeWidth={2}/>
              {p.image_url
                ? <image href={p.image_url} x={p.x - 22} y={p.y - 22} width={44} height={44} clipPath={`circle(22px at 22px 22px)`} preserveAspectRatio="xMidYMid slice"/>
                : <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 14, fill: 'var(--color-brand)' }}>人</text>
              }
              <rect x={p.x - 28} y={p.y + 29} width={56} height={14} rx={3} fill="var(--color-bg-card)"/>
              <text x={p.x} y={p.y + 38} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--color-text)', fontWeight: 600 }}>
                {p.name.length > 7 ? p.name.slice(0, 7) + '…' : p.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  const Avatar = ({ c }: { c: Character }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {c.image_url
        ? <img src={c.image_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-brand-border)' }} alt=""/>
        : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>人</div>
      }
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>相関関係</h2>

      {chars.length < 2 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)', fontSize: 13, border: '2px dashed var(--color-brand-border)', borderRadius: 12 }}>
          相関関係を設定するには登場人物を2人以上追加してください
        </div>
      ) : (
        <>
          {/* 追加フォーム */}
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>関係を追加</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select value={selectedA} onChange={e => setSelectedA(e.target.value)}
                style={{ padding: '7px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12, background: 'var(--color-bg-card)', color: 'var(--color-text)', outline: 'none' }}>
                <option value="">キャラA</option>
                {chars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="関係（例：親友）"
                style={{ flex: 1, minWidth: 100, padding: '7px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12, outline: 'none', background: 'var(--color-bg-card)', color: 'var(--color-text)' }}/>
              <select value={selectedB} onChange={e => setSelectedB(e.target.value)}
                style={{ padding: '7px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12, background: 'var(--color-bg-card)', color: 'var(--color-text)', outline: 'none' }}>
                <option value="">キャラB</option>
                {chars.filter(c => c.id !== selectedA).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={handleAdd} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>追加</button>
            </div>
          </div>

          {/* 相関表示 */}
          {relations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>まだ関係が設定されていません</div>
          ) : chars.length >= 4 ? (
            /* 4人以上：相関図 */
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <RelationGraph />
            </div>
          ) : (
            /* 3人以下：縦リスト */
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
                        <input value={r.relation_label} onChange={e => updateLabel(r.id, e.target.value)} placeholder="関係"
                          style={{ padding: '4px 10px', border: '1.5px solid var(--color-brand-border)', borderRadius: 20, fontSize: 12, fontWeight: 600, color: 'var(--color-brand)', background: 'var(--color-brand-light)', outline: 'none', textAlign: 'center', minWidth: 80 }}/>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-brand-border)' }}/>
                      </div>
                    </div>
                    <Avatar c={b}/>
                    <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 4人以上の時も関係リストを下に表示 */}
          {chars.length >= 4 && relations.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>関係一覧</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {relations.map(r => {
                  const a = charMap[r.char_a_id], b = charMap[r.char_b_id]
                  if (!a || !b) return null
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{a.name}</span>
                      <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      <input value={r.relation_label} onChange={e => updateLabel(r.id, e.target.value)}
                        style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--color-brand-border)', fontSize: 12, color: 'var(--color-brand)', fontWeight: 600, background: 'none', outline: 'none', textAlign: 'center' }}/>
                      <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{b.name}</span>
                      <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 14, padding: 0, marginLeft: 4 }}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
