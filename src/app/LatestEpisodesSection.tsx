'use client'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

interface Episode {
  id: string
  title: string
  novel_id: string
  novel_title: string
  genre: string
  author_name: string
  summary?: string | null
  catchcopy?: string | null
  like_count?: number
  tags?: string[]
}

interface Props {
  episodes: Episode[]
}

export default function LatestEpisodesSection({ episodes }: Props) {
  return (
    <div className="mobile-1col" style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
      {Array.from({length:10},(_,i)=>{ const mobileHide = i >= 5;
        const ep = episodes[i]
        return ep ? (
          <NovelPreviewPopup key={ep.id} novel={{
            id: ep.novel_id,
            title: ep.novel_title,
            genre: ep.genre,
            display_name: ep.author_name,
            summary: ep.summary,
            catchcopy: ep.catchcopy,
            like_count: ep.like_count,
            tags: ep.tags,
          }}>
            <div className={mobileHide?'mobile-hide':''} style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none',cursor:'pointer'}}>
              <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:2}}>
                <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>{ep.genre}</span>
                <span style={{background:'#F26A21',color:'#fff',fontSize:9,padding:'0 4px',borderRadius:3,fontWeight:700}}>NEW</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:1}}>{ep.novel_title}</div>
              <div style={{fontSize:10,color:'#77706A'}}>{ep.title}</div>
              <div style={{fontSize:10,color:'#77706A'}}>作者：{ep.author_name}</div>
            </div>
          </NovelPreviewPopup>
        ) : (
          <div key={i} style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none'}}>
            <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:2}}>
              <span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>ジャンル</span>
              <span style={{background:'#F26A21',color:'#fff',fontSize:9,padding:'0 4px',borderRadius:3,fontWeight:700}}>NEW</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>作品タイトル（準備中）</div>
          </div>
        )
      })}
    </div>
  )
}
