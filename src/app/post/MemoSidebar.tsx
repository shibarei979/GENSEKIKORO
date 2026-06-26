'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SidebarView =
  | 'writing'
  | 'plan' | 'plan_summary' | 'plan_chars' | 'plan_goal' | 'plan_theme' | 'plan_change' | 'plan_logline' | 'plan_target' | 'plan_wordcount'
  | 'plot' | 'plot_edit'
  | 'character' | 'character_edit'
  | 'timeline'
  | 'relation'
  | 'world'
  | 'memo'

interface Props {
  userId: string
  currentView: SidebarView
  onViewChange: (v: SidebarView) => void
}

const MENU = [
  { id: 'plan' as SidebarView, label: '企画', section: '企画' },
  { id: 'plot' as SidebarView, label: 'プロット', section: '構成' },
  { id: 'timeline' as SidebarView, label: '時系列', section: '構成' },
  { id: 'character' as SidebarView, label: '登場人物', section: '資料' },
  { id: 'relation' as SidebarView, label: '相関関係', section: '資料' },
  { id: 'world' as SidebarView, label: '世界観', section: '資料' },
  { id: 'memo' as SidebarView, label: 'メモ', section: '資料' },
  { id: 'writing' as SidebarView, label: '執筆', section: '執筆' },
]

const SECTIONS = ['企画', '構成', '資料', '執筆']

export default function MemoSidebar({ novelId, userId }: Props) {
  const [open, setOpen] = useState(true)
  const W = open ? 160 : 36

  return (
    <div style={{ width: W, minWidth: W, flexShrink: 0, transition: 'width 0.2s ease, min-width 0.2s ease', background: 'var(--color-bg)', borderRight: '1px solid var(--color-brand-border)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', position: 'sticky', top: 60, overflow: 'hidden' }}>

      {/* 開閉ボタン */}
      <button onClick={() => setOpen(!open)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '1px solid var(--color-brand-border)', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', paddingLeft: open ? 12 : 0, paddingRight: open ? 8 : 0, flexShrink: 0 }}>
        {open && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>メニュー</span>}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <polyline points={open ? '10,3 4,7 10,11' : '4,3 10,7 4,11'} stroke="var(--color-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {SECTIONS.map(sec => {
            const items = MENU.filter(m => m.section === sec)
            return (
              <div key={sec}>
                <div style={{ padding: '8px 12px 4px', fontSize: 9, fontWeight: 700, color: 'var(--color-text-faint)', background: 'var(--color-bg-subtle)', letterSpacing: '0.05em' }}>{sec}</div>
                {items.map(item => {
                  const active = currentView === item.id || currentView.startsWith(item.id + '_')
                  return (
                    <button key={item.id} onClick={() => onViewChange(item.id)}
                      style={{ width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--color-brand-border)', cursor: 'pointer', textAlign: 'left' as const, background: active ? 'var(--color-brand-light)' : 'none', borderLeft: active ? '3px solid var(--color-brand)' : '3px solid transparent' }}>
                      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--color-brand)' : 'var(--color-text)' }}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
