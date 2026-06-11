'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBanner() {
  const [hovered, setHovered] = useState(false)
  const router = useRouter()

  return (
    <div
      onClick={() => router.push('/search')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'#F26A21',
        border:'1.5px solid #F26A21',
        borderRadius:14,
        padding:'20px 28px',
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        cursor:'pointer',
        transition:'transform 0.18s ease, box-shadow 0.18s ease',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered ? '0 10px 28px rgba(242,106,33,0.4)' : '0 2px 8px rgba(242,106,33,0.1)',
      }}>
      <div>
        <div style={{fontSize:18,fontWeight:700,color:'#fff',marginBottom:4,display:'flex',alignItems:'center',gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          作品を探す
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,.85)',lineHeight:1.6}}>
          ジャンル・タグ・キーワードで作品を検索できます
        </div>
      </div>
      <div style={{
        display:'flex',
        alignItems:'center',
        gap:6,
        color:'#fff',
        fontWeight:700,
        flexShrink:0,
        transition:'font-size 0.18s ease',
        fontSize: hovered ? 18 : 14,
      }}>
        検索する
        <svg
          style={{transition:'all 0.18s ease', flexShrink:0}}
          width={hovered ? 22 : 18} height={hovered ? 22 : 18}
          viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  )
}
