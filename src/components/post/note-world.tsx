'use client'
import { useState } from 'react'
import WorldView from '@/components/post/world-view'
import MemoView from '@/components/post/memo-view'

// 創作ノート：世界観・メモ
export default function NoteWorld({ novelId, userId }: { novelId: string; userId: string }) {
  const [tab, setTab] = useState('world' as 'world' | 'memo')
  const tabs = [
    { id: 'world' as const, label: '世界観' },
    { id: 'memo' as const, label: 'メモ' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, padding: '14px 20px 0', borderBottom: '1px solid var(--color-brand-border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--color-brand)' : 'var(--color-text-muted)', background: 'none', border: 'none', borderBottom: tab === t.id ? '2.5px solid var(--color-brand)' : '2.5px solid transparent', cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'world' && <WorldView novelId={novelId} userId={userId} />}
      {tab === 'memo' && <MemoView novelId={novelId} userId={userId} />}
    </div>
  )
}
