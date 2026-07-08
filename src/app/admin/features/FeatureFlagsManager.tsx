'use client'
import { useState } from 'react'

type Status = 'off' | 'preview' | 'on'
interface Feature {
  key: string
  label: string
  desc: string
  status: Status
  link?: string
}

const STATUS_OPTIONS: { value: Status; label: string; color: string; bg: string }[] = [
  { value: 'off',     label: 'オフ',       color: '#64748b', bg: '#f1f5f9' },
  { value: 'preview', label: 'プレビュー', color: '#b45309', bg: '#fef3c7' },
  { value: 'on',      label: '公開',       color: '#15803d', bg: '#dcfce7' },
]

export default function FeatureFlagsManager({ features: initial }: { features: Feature[] }) {
  const [features, setFeatures] = useState<Feature[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  async function updateStatus(key: string, label: string, status: Status) {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, label, status }),
      })
      if (res.ok) {
        setFeatures(prev => prev.map(f => f.key === key ? { ...f, status } : f))
        setToast('保存しました')
        setTimeout(() => setToast(''), 2000)
      } else {
        setToast('保存に失敗しました')
        setTimeout(() => setToast(''), 2000)
      }
    } catch {
      setToast('エラーが発生しました')
      setTimeout(() => setToast(''), 2000)
    }
    setSaving(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 100 }}>
          {toast}
        </div>
      )}
      {features.map(f => {
        const cur = STATUS_OPTIONS.find(s => s.value === f.status)!
        return (
          <div key={f.key} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{f.label}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: cur.color, background: cur.bg, padding: '3px 12px', borderRadius: 20 }}>
                {cur.label}中
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.6 }}>{f.desc}</div>
            {f.link && f.status !== 'off' && (
              <a href={f.link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none', marginBottom: 12 }}>
                ページを確認する
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => updateStatus(f.key, f.label, opt.value)} disabled={saving === f.key}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving === f.key ? 'wait' : 'pointer',
                    border: f.status === opt.value ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                    background: f.status === opt.value ? opt.bg : '#fff',
                    color: f.status === opt.value ? opt.color : '#94a3b8',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
