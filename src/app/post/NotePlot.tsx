'use client'
import { useState } from 'react'
import PlanView from './PlanView'
import PlotView from './PlotView'
import PlotMakerView from './PlotMakerView'
import TimelineView from './TimelineView'

// 創作ノート：プロット（企画・プロット・プロットメーカー・時系列）
export default function NotePlot({ novelId, userId }: { novelId: string; userId: string }) {
  const [tab, setTab] = useState('plot' as 'plan' | 'plot' | 'plotmaker' | 'timeline')
  const tabs = [
    { id: 'plot' as const, label: 'プロット' },
    { id: 'plotmaker' as const, label: 'プロットメーカー' },
    { id: 'timeline' as const, label: '時系列' },
    { id: 'plan' as const, label: '企画' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, padding: '14px 20px 0', borderBottom: '1px solid var(--color-brand-border)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--color-brand)' : 'var(--color-text-muted)', background: 'none', border: 'none', borderBottom: tab === t.id ? '2.5px solid var(--color-brand)' : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'plan' && <PlanView novelId={novelId} userId={userId} />}
      {tab === 'plot' && <PlotView novelId={novelId} userId={userId} />}
      {tab === 'plotmaker' && <PlotMakerView novelId={novelId} userId={userId} />}
      {tab === 'timeline' && <TimelineView novelId={novelId} userId={userId} />}
    </div>
  )
}
