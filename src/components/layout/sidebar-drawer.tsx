'use client'
import { useState } from 'react'

interface Props {
  children: React.ReactNode
}

export default function SidebarDrawer({ children }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <>
      {/* 左端ドロワー */}
      <div style={{
        position:'fixed',
        top:0,
        left: open ? 0 : -300,
        width:300,
        height:'100vh',
        background:'var(--color-bg)',
        boxShadow: open ? '4px 0 20px rgba(0,0,0,0.08)' : 'none',
        transition:'left 0.25s ease',
        zIndex:201,
        overflowY:'auto',
        paddingTop:70,
        paddingBottom:40,
        borderRight:'1px solid var(--color-brand-border)',
      }}>
        {children}
      </div>

      {/* 開閉タブ（ドロワーの右端に固定） */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position:'fixed',
          left: open ? 300 : 0,
          top:'50%',
          transform:'translateY(-50%)',
          width:20,
          height:64,
          background:'var(--color-bg-card)',
          border:'1px solid var(--color-brand-border)',
          borderLeft: open ? 'none' : '1px solid var(--color-brand-border)',
          borderRadius:'0 6px 6px 0',
          cursor:'pointer',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:202,
          boxShadow:'2px 2px 8px rgba(0,0,0,0.08)',
          transition:'left 0.25s ease',
          padding:0,
        }}
        title={open ? 'サイドバーを隠す' : 'サイドバーを表示'}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <polyline
            points={open ? '7,2 2,8 7,14' : '3,2 8,8 3,14'}
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* サイドバー分のスペース確保 */}
      <div style={{
        width: open ? 320 : 20,
        flexShrink:0,
        transition:'width 0.25s ease',
      }}/>
    </>
  )
}
