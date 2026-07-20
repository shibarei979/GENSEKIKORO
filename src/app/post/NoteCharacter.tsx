'use client'
import { useState } from 'react'
import CharacterView from './CharacterView'
import RelationView from './RelationView'

// 創作ノート：キャラクター（登場人物＋相関図）
export default function NoteCharacter({ novelId, userId }: { novelId: string; userId: string }) {
  const [tab, setTab] = useState('list' as 'list' | 'relation')
  const tabs = [
    { id: 'list' as const, label: '登場人物' },
    { id: 'relation' as const, label: '相関図' },
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
      {tab === 'list' && <CharacterView novelId={novelId} userId={userId} />}
      {tab === 'relation' && <RelationView novelId={novelId} userId={userId} />}
    </div>
  )
}
