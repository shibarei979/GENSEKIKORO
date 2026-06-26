'use client'
import { useState } from 'react'

export type View = 'writing' | 'plan' | 'plot' | 'timeline' | 'character' | 'relation' | 'world' | 'memo' | 'plotmaker'

interface Props {
  currentView: View
  onViewChange: (v: View) => void
  novelTitle?: string
}

const MENU: { id: View; label: string; section: string; icon: string }[] = [
  { id: 'plan',       label: '企画',         section: '企画',   icon: '' },
  { id: 'plot',       label: 'プロット',     section: '構成',   icon: '' },
  { id: 'plotmaker',  label: 'プロットメーカー', section: '構成', icon: '' },
  { id: 'timeline',   label: '時系列',       section: '構成',   icon: '' },
  { id: 'character',  label: '登場人物',     section: '資料',   icon: '' },
  { id: 'relation',   label: '相関関係',     section: '資料',   icon: '' },
  { id: 'world',      label: '世界観',       section: '資料',   icon: '' },
  { id: 'memo',       label: 'メモ',         section: '資料',   icon: '' },
  { id: 'writing',    label: '執筆',         section: '執筆',   icon: '' },
]

const SECTIONS = ['企画', '構成', '資料', '執筆']

export default function MemoSidebar({ currentView, onViewChange, novelTitle }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{
      width: open ? 180 : 40, minWidth: open ? 180 : 40,
      flexShrink: 0, transition: 'width 0.2s ease, min-width 0.2s ease',
      background: 'var(--color-bg)', borderRight: '1px solid var(--color-brand-border)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)', position: 'sticky', top: 60, overflow: 'hidden',
    }}>

      {/* ヘッダー */}
      <div style={{ padding: open ? '10px 12px 8px' : '10px 0 8px', borderBottom: '1px solid var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', flexShrink: 0 }}>
        {open && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{novelTitle || '原石航路'}</span>}
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-brand)', display: 'flex', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polyline points={open ? '10,3 4,7 10,11' : '4,3 10,7 4,11'} stroke="var(--color-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* メニュー */}
      <div style={{ flex: 1, overflowY: 'auto', padding: open ? '8px 0' : '8px 0' }}>
        {SECTIONS.map(section => {
          const items = MENU.filter(m => m.section === section)
          return (
            <div key={section}>
              {open && (
                <div style={{ padding: '6px 12px 2px', fontSize: 9, fontWeight: 700, color: 'var(--color-text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                  {section}
                </div>
              )}
              {items.map(item => {
                const active = currentView === item.id
                return (
                  <button key={item.id} onClick={() => onViewChange(item.id)}
                    title={!open ? item.label : undefined}
                    style={{
                      width: '100%', padding: open ? '7px 12px' : '8px 0',
                      display: 'flex', alignItems: 'center', gap: 8,
                      justifyContent: open ? 'flex-start' : 'center',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
                      background: active ? 'var(--color-brand-light)' : 'none',
                      color: active ? 'var(--color-brand)' : 'var(--color-text-muted)',
                      borderLeft: active && open ? '3px solid var(--color-brand)' : '3px solid transparent',
                      transition: 'all .1s',
                    }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                    {open && <span>{item.label}</span>}
                  </button>
                )
              })}
              {open && <div style={{ height: 4 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
