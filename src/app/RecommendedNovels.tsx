'use client'

import { useState, useCallback, useEffect } from 'react'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

interface Novel {
  id: string
  title: string
  genre: string
  novel_type: string
  display_name: string
  likeCount: number
  like_count?: number
  summary?: string | null
  catchcopy?: string | null
  tags?: string[]
}

interface Props {
  novels: Novel[]
}

export default function RecommendedNovels({ novels }: Props) {
  const [spinning, setSpinning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const displayCount = isMobile ? 5 : 8
  const [displayed, setDisplayed] = useState<Novel[]>(() =>
    [...novels].sort(() => Math.random() - 0.5).slice(0, 8)
  )

  const shuffle = useCallback(() => {
    setSpinning(true)
    setTimeout(() => {
      setDisplayed([...novels].sort(() => Math.random() - 0.5).slice(0, 8))
      setSpinning(false)
    }, 400)
  }, [novels])

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
        <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>おすすめ作品</span>
        <button onClick={shuffle} title="シャッフル"
          style={{background:'none',border:'none',cursor:'pointer',padding:4,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .15s'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{transition:'transform .4s ease',transform:spinning?'rotate(360deg)':'rotate(0deg)'}}>
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
      <div className="mobile-1col" style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
        {Array.from({length:displayCount},(_,i) => {
          const n = displayed[i]
          return n ? (
            <div key={n.id}>
            <NovelPreviewPopup novel={{...n, like_count: n.likeCount || n.like_count || 0}}>
              <div style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none',minHeight:60,cursor:'pointer'}}>
                <div style={{display:'flex',gap:4,marginBottom:2,flexWrap:'wrap'}}>
                  <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                  {n.novel_type && <span style={{fontSize:9,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 5px',borderRadius:3}}>{n.novel_type}</span>}
                </div>
                <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:1}}>{n.title}</div>
                <div style={{display:'flex',gap:8,fontSize:10,color:'#77706A'}}>
                  <span>作者：{n.display_name}</span>
                  <span>♡ {n.likeCount||0}</span>
                </div>
              </div>
            </NovelPreviewPopup>
            </div>
          ) : (
            <div key={i} style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none',minHeight:60}}>
              <div style={{display:'flex',gap:4,marginBottom:2}}>
                <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>ジャンル</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>作品タイトル（準備中）</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
