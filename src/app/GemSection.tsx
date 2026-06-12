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

      {/* モバイル：ランキング風リスト */}
      <div className="gem-mobile" style={{display:'none',width:'100%'}}>
        {novels.slice(0,7).map((n, i) => n ? (
          <NovelPreviewPopup key={n.id} novel={{...n, like_count: n.likeCount2}}>
            <div style={{borderBottom:'1px solid #FFF1E6',cursor:'pointer'}}>
              <div style={{display:'flex',gap:8,padding:'10px 0',alignItems:'flex-start'}}>
                <span style={{fontSize:14,fontWeight:700,minWidth:20,color:i===0?'#F26A21':i===1?'#9ca3af':i===2?'#cd7f32':'#2B211B',flexShrink:0,textAlign:'center'}}>{i+1}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                    <span style={{fontSize:9,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:2}}>{n.title}</div>
                  <div style={{fontSize:11,color:'#77706A',marginBottom:4}}>作者：{n.display_name} {n.likeCount2>0?`· ♡ ${n.likeCount2}`:''}</div>
                  {/* 読者の声 */}
                  {(discoverCommentMap[n.id]||[]).length > 0 && (
                    <div style={{fontSize:11,color:'#F26A21',background:'#FFF9F2',borderRadius:6,padding:'4px 8px',borderLeft:'2px solid #F26A21'}}>
                      「{discoverCommentMap[n.id][0].comment}」
                      <span style={{fontSize:10,color:'#B8AEA8',marginLeft:4}}>{discoverCommentMap[n.id][0].display_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </NovelPreviewPopup>
        ) : null)}
      </div>
    </>
  )
}
