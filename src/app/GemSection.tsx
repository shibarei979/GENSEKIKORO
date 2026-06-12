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
    <>
      {/* デスクトップ：カード横スクロール */}
      <div className="gem-desktop" style={{flex:1,overflowX:'auto'}}>
        <div style={{display:'flex',gap:10,minWidth:'max-content',paddingBottom:6}}>
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
                      </div>
                    </div>
                  </div>
                  <GemComment novelId={n.id} discoverCount={n.discoverCount} likeCount={n.likeCount2} discoverComments={discoverCommentMap[n.id]||[]} />
                </div>
              </NovelPreviewPopup>
            ) : (
              <div key={i} style={{width:195,height:195,background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column'}}>
                <div style={{padding:9,flex:2}}>
                  <div style={{display:'flex',gap:4,marginBottom:4}}>
                    <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>作品タイトル（準備中）</div>
                </div>
                <div style={{borderTop:'1px solid #F0D9C9',background:'#FFF9F2',padding:'8px 10px',flex:3,display:'flex',flexDirection:'column',justifyContent:'center'}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#F26A21',marginBottom:3}}>読者の声</div>
                  <div style={{fontSize:10,color:'#B8AEA8',lineHeight:1.55,fontStyle:'italic',textAlign:'center'}}>君の声を届けよう</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* モバイル：おすすめ風グリッド */}
      <div className="gem-mobile" style={{display:'none',width:'100%'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
          {novels.slice(0,4).map((n, i) => n ? (
            <NovelPreviewPopup key={n.id} novel={{...n, like_count: n.likeCount2}}>
              <div style={{padding:'9px 14px',borderBottom:'1px solid #FFF1E6',borderRight:i%2===0?'1px solid #FFF1E6':'none',minHeight:68,cursor:'pointer'}}>
                <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap'}}>
                  <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                  <span style={{fontSize:9,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:2,lineHeight:1.4}}>{n.title}</div>
                <div style={{fontSize:10,color:'#77706A',marginBottom:3}}>作者：{n.display_name}</div>
                {(discoverCommentMap[n.id]||[]).length > 0 && (
                  <div style={{fontSize:10,color:'#F26A21',background:'#FFF9F2',borderRadius:4,padding:'3px 6px',borderLeft:'2px solid #F26A21',marginTop:2}}>
                    「{discoverCommentMap[n.id][0].comment.slice(0,20)}…」
                  </div>
                )}
              </div>
            </NovelPreviewPopup>
          ) : null)}
        </div>
      </div>
    </>
  )
}
