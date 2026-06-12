'use client'
import { useState, useRef } from 'react'

interface Props {
  novel: {
    id: string
    title: string
    genre: string
    novel_type?: string
    summary?: string | null
    catchcopy?: string | null
    display_name?: string
  }
  children: React.ReactNode
}

export default function NovelPreviewPopup({ novel, children }: Props) {
  const [show, setShow] = useState(false)
  const enterTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  const displayText = novel.catchcopy || novel.summary?.slice(0, 60) || ''
  const COLS = 10
  const ROWS = 4
  const chars = displayText.split('')
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => chars[i] || '')

  function onEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    enterTimer.current = setTimeout(() => setShow(true), 300)
  }

  function onLeave() {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    leaveTimer.current = setTimeout(() => setShow(false), 150)
  }

  return (
    <div style={{position:'relative'}} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}

      {show && (
        <div
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{
            position:'absolute',
            left:'50%',
            bottom:'calc(100% + 6px)',
            transform:'translateX(-50%)',
            zIndex:1000,
            width:300,
            background:'#fff',
            border:'2px solid #F26A21',
            borderRadius:12,
            boxShadow:'0 8px 32px rgba(242,106,33,.25)',
            pointerEvents:'auto',
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
                marginBottom:8,
              }}>
                {cells.map((char, i) => (
                  <div key={i} style={{
                    aspectRatio:'1',
                    border:'0.5px solid #e8d5a0',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontSize:12,
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
                <div style={{fontSize:11,color:'#B8AEA8',textAlign:'center'}}>…続く</div>
              )}
            </div>
          ) : (
            <div style={{padding:'16px 14px',textAlign:'center',color:'#B8AEA8',fontSize:12}}>
              あらすじがありません
            </div>
          )}

          {/* CTAボタン */}
          <a href={`/novel/${novel.id}`}
            style={{display:'block',padding:'8px 14px',borderTop:'1px solid #F0D9C9',textAlign:'center',background:'#FFF9F2',textDecoration:'none'}}>
            <span style={{display:'inline-block',padding:'6px 20px',background:'#F26A21',color:'#fff',
              fontWeight:700,fontSize:12,borderRadius:20}}>
              作品を読む →
            </span>
          </a>
        </div>
      )}

      <style>{`
        @keyframes popupIn {
          from { opacity:0; transform:translateX(-50%) translateY(6px) }
          to   { opacity:1; transform:translateX(-50%) translateY(0) }
        }
      `}</style>
    </div>
  )
}
