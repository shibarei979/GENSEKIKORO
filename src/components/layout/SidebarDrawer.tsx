'use client'
import { useState } from 'react'

interface Props {
  children: React.ReactNode
}

export default function SidebarDrawer({ children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* オーバーレイ */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:200}}
        />
      )}

      {/* 左端ドロワー */}
      <div style={{
        position:'fixed',
        top:0,
        left: open ? 0 : -260,
        width:260,
        height:'100vh',
        background:'var(--color-bg)',
        boxShadow: open ? '4px 0 20px rgba(0,0,0,0.12)' : 'none',
        transition:'left 0.25s ease',
        zIndex:201,
        overflowY:'auto',
        paddingTop:60,
        paddingBottom:40,
      }}>
        {children}
      </div>

      {/* 開閉タブ（左端に固定） */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position:'fixed',
          left: open ? 260 : 0,
          top:'50%',
          transform:'translateY(-50%)',
          width:20,
          height:64,
          background:'var(--color-bg-card)',
          border:'1px solid var(--color-brand-border)',
          borderLeft: open ? '1px solid var(--color-brand-border)' : 'none',
          borderRadius: open ? '0 6px 6px 0' : '0 6px 6px 0',
          cursor:'pointer',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:202,
          boxShadow:'2px 2px 8px rgba(0,0,0,0.08)',
          transition:'left 0.25s ease',
          padding:0,
        }}
        title={open ? 'サイドバーを閉じる' : 'サイドバーを開く'}
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
    </>
  )
}
