'use client'
import Link from 'next/link'
import GemComment from './GemComment'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

interface Novel {
  id: string
  title: string
  genre: string
  novel_type?: string
  display_name: string
  likeCount2: number
  discoverCount: number
  summary?: string | null
  catchcopy?: string | null
  tags?: string[]
}

interface Props {
  novels: Novel[]
  discoverCommentMap: Record<string, {comment:string;display_name:string}[]>
}

export default function GemSection({ novels, discoverCommentMap }: Props) {
  return (
    <div style={{flex:1,overflowX:'auto'}}>
      <div style={{display:'flex',gap:12,minWidth:'max-content',paddingBottom:6}}>
        {Array.from({length:7},(_,i)=>{
          const n = novels[i]
          return n ? (
            <NovelPreviewPopup key={n.id} novel={{...n, like_count: n.likeCount2}}>
              <div style={{width:195,height:195,background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column',cursor:'pointer'}}>
                <div style={{padding:9,flex:2,overflow:'hidden'}}>
                  <div style={{display:'flex',gap:4,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                    <span style={{fontSize:9,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#2B211B',lineHeight:1.4,marginBottom:3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4}}>
                    <div style={{fontSize:10,color:'#77706A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>作者：{n.display_name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                      {n.likeCount2 > 0 && <span style={{fontSize:9,color:'#B8AEA8'}}>♡ {n.likeCount2}</span>}
                      {n.discoverCount > 0 && (
                        <span style={{fontSize:9,color:'#B8AEA8',display:'flex',alignItems:'center',gap:1}}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#B8AEA8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                          </svg>
                          {n.discoverCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <GemComment novelId={n.id} discoverCount={n.discoverCount} likeCount={n.likeCount2} discoverComments={discoverCommentMap[n.id]||[]} />
              </div>
            </NovelPreviewPopup>
          ) : (
            <div key={i} style={{width:195,height:195,background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column'}}>
              <div style={{padding:9,flex:2,overflow:'hidden'}}>
                <div style={{display:'flex',gap:4,marginBottom:4}}>
                  <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                  <span style={{fontSize:9,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',padding:'1px 5px',borderRadius:3}}>ジャンル</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:'#2B211B',lineHeight:1.4,marginBottom:3}}>作品タイトル（準備中）</div>
              </div>
              <div style={{borderTop:'1px solid #F0D9C9',background:'#FFF9F2',padding:'8px 10px',flex:3,display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#F26A21',marginBottom:3}}>読者の声</div>
                <div style={{fontSize:10,color:'#B8AEA8',lineHeight:1.55,fontStyle:'italic',textAlign:'center',width:'100%'}}>君の声を届けよう</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
