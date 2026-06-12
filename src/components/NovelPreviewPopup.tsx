'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const displayText = novel.catchcopy || novel.summary?.slice(0, 60) || ''
  const COLS = 10
  const ROWS = 4
  const chars = displayText.split('')
  const cells = Array.from({ length: COLS * ROWS }, (_, i) => chars[i] || '')

  function handleCardClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setShow(true)
  }

  const modal = show && mounted ? createPortal(
    <div
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={()=>setShow(false)}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:320,
          background:'#fff',
          border:'2px solid #F26A21',
          borderRadius:16,
          boxShadow:'0 16px 48px rgba(0,0,0,.25)',
          overflow:'hidden',
          animation:'modalIn .2s ease',
        }}>

        {/* ヘッダー */}
        <div style={{background:'#FFF1E6',padding:'12px 16px',borderBottom:'1px solid #F0D9C9',position:'relative'}}>
          <button onClick={()=>setShow(false)}
            style={{position:'absolute',top:8,right:10,background:'none',border:'none',fontSize:18,color:'#B8AEA8',cursor:'pointer'}}>
            ×
          </button>
          <div style={{display:'flex',gap:5,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{novel.genre}</span>
            {novel.novel_type && <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{novel.novel_type}</span>}
          </div>
          <div style={{fontSize:15,fontWeight:700,color:'#2B211B',lineHeight:1.4,fontFamily:"'Noto Serif JP',serif",paddingRight:20}}>{novel.title}</div>
          {novel.display_name && <div style={{fontSize:11,color:'#77706A',marginTop:3}}>作者：{novel.display_name}</div>}
        </div>

        {/* 原稿用紙風マス目 */}
        {displayText ? (
          <div style={{padding:'14px 16px',background:'#FFFDF8'}}>
            <div style={{fontSize:10,color:'#B8AEA8',marginBottom:6,textAlign:'center'}}>― キャッチコピー ―</div>
            <div style={{
              display:'grid',
              gridTemplateColumns:`repeat(${COLS}, 1fr)`,
              gap:1,
              border:'1px solid #d4a843',
              borderRadius:6,
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
                  fontSize:13,
                  color: char ? '#2B211B' : 'transparent',
                  background: i % 2 === 0 ? '#FFFDF8' : '#FFF9EE',
                  fontFamily:"'Noto Serif JP',serif",
                  lineHeight:1,
                }}>
                  {char || '　'}
                </div>
              ))}
            </div>
            {displayText.length > COLS * ROWS && (
              <div style={{fontSize:11,color:'#B8AEA8',textAlign:'center'}}>…続く</div>
            )}
          </div>
        ) : (
          <div style={{padding:'20px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
            あらすじがありません
          </div>
        )}

        {/* ボタン */}
        <div style={{padding:'12px 16px',borderTop:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',gap:8}}>
          <button onClick={()=>setShow(false)}
            style={{flex:1,padding:'8px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>
            閉じる
          </button>
          <a href={`/novel/${novel.id}`}
            style={{flex:2,display:'block',padding:'8px 0',background:'#F26A21',color:'#fff',
              fontWeight:700,fontSize:13,borderRadius:8,textDecoration:'none',textAlign:'center'}}>
            作品を読む →
          </a>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(.95) }
          to   { opacity:1; transform:scale(1) }
        }
      `}</style>
    </div>,
    document.body
  ) : null

  return (
    <>
      <div onClick={handleCardClick} style={{cursor:'pointer'}}>
        {children}
      </div>
      {modal}
    </>
  )
}
