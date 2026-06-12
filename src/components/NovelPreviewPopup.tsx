'use client'
import { useState, useEffect } from 'react'

interface Props {
  novel: {
    id: string
    title: string
    genre: string
    novel_type?: string
    is_serial?: boolean
    summary?: string | null
    catchcopy?: string | null
    display_name?: string
    tags?: string[]
  }
  children: React.ReactNode
}

export default function NovelPreviewPopup({ novel, children }: Props) {
  const [show, setShow] = useState(false)
  const [pos,  setPos]  = useState({ x: 0, y: 0 })

  // マス目風に表示するテキスト
  const displayText = novel.catchcopy || novel.summary?.slice(0, 60) || ''

  // マス目に1文字ずつ配置
  const COLS = 10
  const ROWS = 4
  const chars = displayText.split('')
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => chars[i] || '')

  function handleMouseEnter(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top
    setPos({ x, y })
    setShow(true)
  }

  function handleMouseLeave() {
    setShow(false)
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    window.location.href = `/novel/${novel.id}`
  }

  return (
    <div style={{position:'relative',display:'contents'}}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {children}

      {show && (
        <div
          onClick={handleClick}
          style={{
            position:'fixed',
            left: Math.min(pos.x - 160, window.innerWidth - 340),
            top: Math.max(pos.y - 280, 60),
            zIndex:1000,
            width:320,
            background:'#fff',
            border:'2px solid #F26A21',
            borderRadius:12,
            boxShadow:'0 8px 32px rgba(242,106,33,.2)',
            cursor:'pointer',
            overflow:'hidden',
            animation:'popupIn .15s ease',
          }}>
          {/* ヘッダー */}
          <div style={{background:'#FFF1E6',padding:'10px 14px',borderBottom:'1px solid #F0D9C9'}}>
            <div style={{display:'flex',gap:5,marginBottom:4,flexWrap:'wrap'}}>
              <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{novel.genre}</span>
              {novel.novel_type && <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{novel.novel_type}</span>}
            </div>
            <div style={{fontSize:14,fontWeight:700,color:'#2B211B',lineHeight:1.4,fontFamily:"'Noto Serif JP',serif"}}>{novel.title}</div>
            {novel.display_name && <div style={{fontSize:11,color:'#77706A',marginTop:2}}>作者：{novel.display_name}</div>}
          </div>

          {/* 原稿用紙風マス目 */}
          {displayText ? (
            <div style={{padding:'12px 14px',background:'#FFFDF8'}}>
              <div style={{
                display:'grid',
                gridTemplateColumns:`repeat(${COLS}, 1fr)`,
                gap:1,
                border:'1px solid #d4a843',
                borderRadius:4,
                overflow:'hidden',
                marginBottom:10,
              }}>
                {cells.map((char, i) => (
                  <div key={i} style={{
                    width:'100%',
                    aspectRatio:'1',
                    border:'0.5px solid #e8d5a0',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontSize:13,
                    color:'#2B211B',
                    background: i % 2 === 0 ? '#FFFDF8' : '#FFF9EE',
                    fontFamily:"'Noto Serif JP',serif",
                    lineHeight:1,
                  }}>
                    {char}
                  </div>
                ))}
              </div>
              {displayText.length > COLS * ROWS && (
                <div style={{fontSize:11,color:'#B8AEA8',textAlign:'center',marginBottom:6}}>…続きを読む</div>
              )}
            </div>
          ) : (
            <div style={{padding:'16px 14px',textAlign:'center',color:'#B8AEA8',fontSize:12}}>
              あらすじがありません
            </div>
          )}

          {/* CTAボタン */}
          <div style={{padding:'10px 14px',borderTop:'1px solid #F0D9C9',textAlign:'center',background:'#FFF9F2'}}>
            <span style={{display:'inline-block',padding:'7px 24px',background:'#F26A21',color:'#fff',
              fontWeight:700,fontSize:13,borderRadius:20}}>
              作品を読む →
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popupIn {
          from { opacity:0; transform:translateY(6px) scale(.97) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
      `}</style>
    </div>
  )
}
