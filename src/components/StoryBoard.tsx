'use client'
import { useState } from 'react'
import MemoMode from './MemoMode'
import CharacterMode from './CharacterMode'
import PlotMode from './PlotMode'

interface Props {
  userId: string
  onClose?: () => void
  isModal?: boolean
}

type Mode = 'memo' | 'character' | 'plot'

const TABS: { id: Mode; label: string; desc: string }[] = [
  { id: 'memo',      label: 'アイデアメモ',     desc: '自由に付箋・図形でメモ' },
  { id: 'character', label: 'キャラ相関図',     desc: '人物と関係性を整理' },
  { id: 'plot',      label: 'プロット・伏線',   desc: '話数ごとに展開・伏線を管理' },
]

export default function StoryBoard({ userId, onClose, isModal }: Props) {
  const [mode, setMode] = useState<Mode>('memo')

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#f5f0ea',borderRadius:isModal?0:12,overflow:'hidden',fontFamily:"'Noto Sans JP',sans-serif"}}>

      {/* ===== タブ切り替えヘッダー ===== */}
      <div style={{display:'flex',alignItems:'center',background:'var(--color-text)',padding:'0 8px',flexShrink:0}}>
        <div style={{display:'flex',flex:1}}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setMode(t.id)}
              style={{
                padding:'14px 22px', border:'none', cursor:'pointer',
                background: mode===t.id ? 'var(--color-brand)' : 'transparent',
                color: mode===t.id ? 'var(--color-bg-card)' : 'rgba(255,255,255,0.6)',
                fontSize:14, fontWeight: mode===t.id ? 700 : 500,
                borderRadius: mode===t.id ? '10px 10px 0 0' : 0,
                transition:'all .15s',
                position:'relative', top: mode===t.id ? 1 : 0,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose}
            style={{padding:'8px 16px',fontSize:13,border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',cursor:'pointer',marginRight:4}}>
            閉じる
          </button>
        )}
      </div>

      {/* サブタイトル */}
      <div style={{padding:'8px 18px',background:'var(--color-bg-card)',borderBottom:'1px solid var(--color-brand-border)',fontSize:12,color:'var(--color-text-muted)',flexShrink:0}}>
        {TABS.find(t=>t.id===mode)?.desc}
      </div>

      {/* ===== モード本体 ===== */}
      <div style={{flex:1,overflow:'hidden',position:'relative',background:'var(--color-bg-card)'}}>
        {mode === 'memo'      && <MemoMode userId={userId} />}
        {mode === 'character' && <CharacterMode userId={userId} />}
        {mode === 'plot'       && <PlotMode userId={userId} />}
      </div>
    </div>
  )
}
