'use client'
import { useState } from 'react'

interface Props {
  children: React.ReactNode
}

export default function SidebarDrawer({ children }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{position:'relative',display:'flex',alignItems:'flex-start',flexShrink:0}}>
      {/* 開閉ボタン */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position:'sticky',
          top:80,
          width:20,
          height:64,
          background:'var(--color-bg-card)',
          border:'1px solid var(--color-brand-border)',
          borderRadius: open ? '6px 0 0 6px' : '6px',
          cursor:'pointer',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          flexShrink:0,
          boxShadow:'-2px 2px 8px rgba(0,0,0,0.06)',
          zIndex:10,
          marginRight: open ? 0 : 0,
          alignSelf:'flex-start',
          marginTop:0,
        }}
        title={open ? 'サイドバーを閉じる' : 'サイドバーを開く'}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <polyline
            points={open ? '2,2 8,8 2,14' : '8,2 2,8 8,14'}
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* サイドバー本体 */}
      <div style={{
        width: open ? 240 : 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        flexShrink: 0,
      }}>
        <div style={{width:240}}>
          {children}
        </div>
      </div>
    </div>
  )
}
