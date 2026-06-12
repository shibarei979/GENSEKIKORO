'use client'

import { useState } from 'react'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

const GENRE_TABS = ['すべて','異世界','ファンタジー','SF','恋愛','ミステリー','ホラー','歴史・時代']

export default function NovelList({ novels }: { novels: any[] }) {
  const [genre, setGenre] = useState('すべて')
  const filtered = genre === 'すべて' ? novels : novels.filter(n => n.genre === genre)
  const slots = Array.from({ length: 8 }, (_, i) => filtered[i] || null)
  // モバイルでは4件まで表示

  return (
    <>
      <div style={{display:'flex',gap:5,padding:'7px 14px',flexWrap:'wrap',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
        {GENRE_TABS.map(g=>(
          <button key={g} onClick={()=>setGenre(g)}
            style={{padding:'3px 9px',borderRadius:10,fontSize:12,border:'1px solid #F0D9C9',
              background:genre===g?'#F26A21':'#fff',
              color:genre===g?'#fff':'#77706A',cursor:'pointer'}}>
            {g}
          </button>
        ))}
      </div>
      <div className="mobile-1col" style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
        {slots.map((n, i) => n ? (
          <div key={n.id} className={i>=5?'mobile-hide':''}>
          <NovelPreviewPopup novel={n}>
            <div style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none',minHeight:68,cursor:'pointer'}}>
              <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                <span style={{background:'#F26A21',color:'#fff',fontSize:9,padding:'0 4px',borderRadius:3,fontWeight:700}}>NEW</span>
                {n.novel_type && <span style={{fontSize:9,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 5px',borderRadius:3}}>{n.novel_type}</span>}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:2}}>{n.title}</div>
              <div style={{fontSize:11,color:'#77706A'}}>作者：{n.display_name}</div>
            </div>
          </NovelPreviewPopup>
          </div>
        ) : (
          <div key={i} style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none',minHeight:68}}>
            <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>ジャンル</span>
              <span style={{background:'#F26A21',color:'#fff',fontSize:9,padding:'0 4px',borderRadius:3,fontWeight:700}}>NEW</span>
              <span style={{fontSize:9,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 5px',borderRadius:3}}>長編</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>作品タイトル（準備中）</div>
          </div>
        ))}
      </div>
    </>
  )
}
