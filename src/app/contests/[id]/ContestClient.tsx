'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Novel {
  id: string; title: string; genre: string; summary: string | null
  novel_type: string; is_serial: boolean; display_name: string; like_count: number
}

interface Props {
  novels: Novel[]
  myEntryNovelIds: string[]
  contestId: string
}

const GENRES = ['すべて','異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','その他']

export default function ContestClient({ novels, myEntryNovelIds, contestId }: Props) {
  const [sort, setSort] = useState<'new'|'like'|'name'>('new')
  const [genre, setGenre] = useState('すべて')

  const filtered = useMemo(() => {
    let list = [...novels]
    if (genre !== 'すべて') list = list.filter(n => n.genre === genre)
    if (sort === 'like') list.sort((a,b) => b.like_count - a.like_count)
    else if (sort === 'name') list.sort((a,b) => a.title.localeCompare(b.title, 'ja'))
    return list
  }, [novels, sort, genre])

  const pill = (active: boolean) => ({
    padding:'4px 12px', borderRadius:16, fontSize:12, fontWeight:600,
    cursor:'pointer', border:`1px solid ${active?'#F26A21':'#F0D9C9'}`,
    background: active?'#F26A21':'#fff', color: active?'#fff':'#77706A',
  })

  const availableGenres = GENRES.filter(g => g === 'すべて' || novels.some(n => n.genre === g))

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden'}}>
      {/* フィルターバー */}
      <div style={{padding:'12px 20px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>
            応募作品一覧
            <span style={{fontSize:12,fontWeight:400,color:'#77706A',marginLeft:8}}>（{filtered.length}作品）</span>
          </span>
          {/* 並び順 */}
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setSort('new')}  style={pill(sort==='new')}>新着順</button>
            <button onClick={()=>setSort('like')} style={pill(sort==='like')}>人気順</button>
            <button onClick={()=>setSort('name')} style={pill(sort==='name')}>名前順</button>
          </div>
        </div>
        {/* ジャンル絞り込み */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {availableGenres.map(g => (
            <button key={g} onClick={()=>setGenre(g)} style={{
              padding:'3px 10px', borderRadius:12, fontSize:11, cursor:'pointer',
              border:`1px solid ${genre===g?'#F26A21':'#F0D9C9'}`,
              background:genre===g?'#FFF1E6':'#fff',
              color:genre===g?'#F26A21':'#77706A',
              fontWeight:genre===g?700:400,
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* 作品一覧 */}
      {filtered.length === 0 ? (
        <div style={{padding:'48px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
          該当する作品がありません
        </div>
      ) : filtered.map((n, i) => (
        <Link key={n.id} href={`/novel/${n.id}`} style={{textDecoration:'none',display:'block'}}>
          <div style={{padding:'14px 20px',borderBottom:i<filtered.length-1?'1px solid #FFF1E6':'none',
            background:myEntryNovelIds.includes(n.id)?'#FFF9F2':'#fff',cursor:'pointer'}}>
            <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
              <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{n.novel_type}</span>
              {n.is_serial
                ? <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>
                : <span style={{fontSize:10,background:'#f5f5f5',color:'#757575',border:'1px solid #e0e0e0',padding:'1px 6px',borderRadius:3}}>完結</span>
              }
              {myEntryNovelIds.includes(n.id) && (
                <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>自分の応募作品</span>
              )}
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:3}}>{n.title}</div>
            <div style={{fontSize:12,color:'#77706A',marginBottom:n.summary?6:0}}>
              作者：{n.display_name} · ♡ {n.like_count}
            </div>
            {n.summary && (
              <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.8,overflow:'hidden',display:'-webkit-box',
                WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                {n.summary}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
