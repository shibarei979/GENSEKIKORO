'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Boost { id: string; novel_id: string; title: string; label: string; multiplier: number; expires_at: string }
interface NovelOpt { id: string; title: string; genre: string }

const PRESETS = [
  { label: '入賞',     multiplier: 1.30, days: 14 },
  { label: '優秀賞',   multiplier: 1.60, days: 21 },
  { label: '最優秀賞', multiplier: 2.00, days: 30 },
]

export default function AwardBoostManager({ boosts, novels }: { boosts: Boost[]; novels: NovelOpt[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedNovel, setSelectedNovel] = useState<NovelOpt | null>(null)
  const [preset, setPreset] = useState(0)
  const [customMult, setCustomMult] = useState('')
  const [customDays, setCustomDays] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const filtered = search.trim()
    ? novels.filter(n => n.title.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : []

  async function handleGrant() {
    if (!selectedNovel) return
    const p = PRESETS[preset]
    const multiplier = customMult ? Number(customMult) : p.multiplier
    const days = customDays ? Number(customDays) : p.days
    if (!multiplier || !days || multiplier < 1 || days < 1) { setMsg('倍率・日数が不正です'); return }
    setSaving(true)
    const res = await fetch('/api/admin/award-boosts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novel_id: selectedNovel.id, label: p.label, multiplier, days }),
    })
    setSaving(false)
    if (res.ok) { setMsg('付与しました'); setSelectedNovel(null); setSearch(''); setCustomMult(''); setCustomDays(''); router.refresh() }
    else setMsg('付与に失敗しました')
    setTimeout(() => setMsg(''), 2500)
  }

  async function handleDelete(id: string) {
    if (!confirm('このブーストを削除しますか？')) return
    const res = await fetch('/api/admin/award-boosts', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) router.refresh()
  }

  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }
  const now = Date.now()

  return (
    <div>
      {msg && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 100 }}>{msg}</div>}

      {/* 付与フォーム */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>ブーストを付与</div>

        {!selectedNovel ? (
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="作品タイトルで検索..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            {filtered.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {filtered.map(n => (
                  <button key={n.id} onClick={() => { setSelectedNovel(n); setSearch('') }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    {n.title} <span style={{ fontSize: 11, color: '#94a3b8' }}>（{n.genre}）</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>✓ {selectedNovel.title}</span>
            <button onClick={() => setSelectedNovel(null)} style={{ fontSize: 11, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>変更</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setPreset(i); setCustomMult(''); setCustomDays('') }}
              style={{ flex: 1, minWidth: 120, padding: '10px', borderRadius: 8, cursor: 'pointer', border: preset === i ? '2px solid #2563eb' : '1px solid #e2e8f0', background: preset === i ? '#eff6ff' : '#fff' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: preset === i ? '#2563eb' : '#1e293b' }}>{p.label}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>×{p.multiplier.toFixed(2)}／{p.days}日</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>カスタム倍率（任意）</div>
            <input value={customMult} onChange={e => setCustomMult(e.target.value)} placeholder={`${PRESETS[preset].multiplier}`} type="number" step="0.05" min="1" max="5"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>カスタム日数（任意）</div>
            <input value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder={`${PRESETS[preset].days}`} type="number" min="1" max="365"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <button onClick={handleGrant} disabled={!selectedNovel || saving}
          style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: selectedNovel ? '#2563eb' : '#94a3b8', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: selectedNovel ? 'pointer' : 'not-allowed' }}>
          {saving ? '付与中...' : 'ブーストを付与する'}
        </button>
      </div>

      {/* 一覧 */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>付与済みブースト</div>
        {boosts.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>まだブーストはありません</div>
        ) : (
          boosts.map(b => {
            const expired = new Date(b.expires_at).getTime() < now
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: expired ? '#94a3b8' : '#b45309', background: expired ? '#f1f5f9' : '#fef3c7', padding: '2px 10px', borderRadius: 10, flexShrink: 0 }}>
                  {expired ? '期限切れ' : b.label}
                </span>
                <span style={{ flex: 1, minWidth: 160, fontSize: 13, fontWeight: 600, color: expired ? '#94a3b8' : '#1e293b' }}>{b.title}</span>
                <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>×{Number(b.multiplier).toFixed(2)}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{new Date(b.expires_at).toLocaleDateString('ja-JP')}まで</span>
                <button onClick={() => handleDelete(b.id)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>削除</button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
