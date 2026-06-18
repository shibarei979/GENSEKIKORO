'use client'
import { useState } from 'react'
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

// 統一した本のテーマカラー（原石航路のブランドカラー系）
const SPINE_BASE = '#6b3a22'
const SPINE_DARK = '#4a2715'
const SPINE_LIGHT = '#8a4f2e'

function BookItem({ n, discoverComments }: { n: Novel; discoverComments: {comment:string;display_name:string}[] }) {
  const [hover, setHover] = useState(false)

  return (
    <NovelPreviewPopup novel={{...n, like_count: n.likeCount2}}>
      <div
        onMouseEnter={()=>setHover(true)}
        onMouseLeave={()=>setHover(false)}
        style={{
          position:'relative',
          flex: hover ? '0 0 168px' : '1 1 0',
          minWidth: hover ? 168 : 32,
          maxWidth: hover ? 168 : 60,
          height:195,
          cursor:'pointer',
          transition:'flex .35s cubic-bezier(.4,0,.2,1), min-width .35s cubic-bezier(.4,0,.2,1), max-width .35s cubic-bezier(.4,0,.2,1)',
          perspective: 1000,
          zIndex: hover ? 5 : 1,
        }}>
        <div style={{
          position:'absolute', inset:0,
          transformStyle:'preserve-3d',
          transformOrigin:'left center',
        }}>
          {/* ===== 背表紙（通常時・左端を軸に回転して開く） ===== */}
          <div style={{
            position:'absolute', inset:0,
            transformOrigin:'left center',
            borderRadius:'2px 5px 5px 2px',
            background:`linear-gradient(90deg, ${SPINE_DARK} 0%, ${SPINE_BASE} 10%, ${SPINE_LIGHT} 50%, ${SPINE_BASE} 90%, ${SPINE_DARK} 100%)`,
            boxShadow:'inset 3px 0 5px rgba(0,0,0,0.35), inset -2px 0 4px rgba(255,255,255,0.1), 2px 2px 8px rgba(0,0,0,0.25)',
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'space-between', padding:'14px 0',
            opacity: hover ? 0 : 1,
            transform: hover ? 'rotateY(-100deg)' : 'rotateY(0deg)',
            transition:'opacity .15s ease, transform .35s ease',
            backfaceVisibility:'hidden',
          }}>
            <div style={{width:'70%',height:1.5,background:'rgba(255,215,150,0.4)'}}/>
            <div style={{
              writingMode:'vertical-rl' as any, fontSize:11, fontWeight:700, color:'#fff',
              letterSpacing:'0.05em', lineHeight:1.6, maxHeight:130, overflow:'hidden',
              textShadow:'0 1px 2px rgba(0,0,0,0.4)', fontFamily:"'Noto Serif JP',serif",
            }}>
              {n.title.length > 11 ? n.title.slice(0,11)+'…' : n.title}
            </div>
            <div style={{width:'70%',height:1.5,background:'rgba(255,215,150,0.4)'}}/>
          </div>

          {/* ===== 本の小口（ページの厚み・表紙の右側に見える紙の重なり） ===== */}
          <div style={{
            position:'absolute', top:3, bottom:3, right: hover ? -7 : -2, width:7,
            background:'repeating-linear-gradient(180deg, #f5ede0 0px, #f5ede0 2px, #e8dcc8 2px, #e8dcc8 3px)',
            borderRadius:'0 3px 3px 0',
            opacity: hover ? 1 : 0,
            transform: hover ? 'rotateY(0deg)' : 'rotateY(-100deg)',
            transformOrigin:'left center',
            transition:'opacity .2s ease .1s, transform .35s ease',
            boxShadow:'1px 0 3px rgba(0,0,0,0.15)',
            backfaceVisibility:'hidden',
            zIndex: 1,
          }}/>

          {/* ===== 表紙（ホバー時・本らしい厚み付き） ===== */}
          <div style={{
            position:'absolute', inset:0,
            transformOrigin:'left center',
            background:'#fff', border:`1px solid ${SPINE_BASE}40`, borderRadius:'2px 7px 7px 2px',
            overflow:'hidden', display:'flex', flexDirection:'column',
            boxShadow: hover ? `0 10px 24px rgba(0,0,0,0.22), inset -3px 0 6px rgba(0,0,0,0.06)` : 'none',
            opacity: hover ? 1 : 0,
            transform: hover ? 'rotateY(0deg)' : 'rotateY(100deg)',
            transition:'opacity .2s ease .12s, transform .35s ease',
            backfaceVisibility:'hidden',
          }}>
            {/* 表紙上部の色帯（本のテーマカラーで統一感を出す） */}
            <div style={{height:5,background:`linear-gradient(90deg, ${SPINE_DARK}, ${SPINE_LIGHT})`,flexShrink:0}}/>
            <div style={{padding:9,flex:2,overflow:'hidden'}}>
              <div style={{display:'flex',gap:4,marginBottom:4,flexWrap:'wrap'}}>
                <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                <span style={{fontSize:9,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'#2B211B',lineHeight:1.4,marginBottom:3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4}}>
                <div style={{fontSize:10,color:'#77706A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>作者：{n.display_name}</div>
                {n.likeCount2 > 0 && <span style={{fontSize:9,color:'#B8AEA8',flexShrink:0}}>♡ {n.likeCount2}</span>}
              </div>
            </div>
            <GemComment novelId={n.id} discoverCount={n.discoverCount} likeCount={n.likeCount2} discoverComments={discoverComments} />
          </div>
        </div>
      </div>
    </NovelPreviewPopup>
  )
}

function EmptyBook() {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        position:'relative',
        flex: hover ? '0 0 168px' : '1 1 0',
        minWidth: hover ? 168 : 32,
        maxWidth: hover ? 168 : 60,
        height:195,
        transition:'flex .35s cubic-bezier(.4,0,.2,1), min-width .35s cubic-bezier(.4,0,.2,1), max-width .35s cubic-bezier(.4,0,.2,1)',
        perspective:1000, zIndex: hover?5:1,
      }}>
      <div style={{position:'absolute', inset:0, transformStyle:'preserve-3d', transformOrigin:'left center'}}>
        <div style={{
          position:'absolute', inset:0,
          transformOrigin:'left center',
          borderRadius:'2px 5px 5px 2px',
          background:`linear-gradient(90deg, ${SPINE_DARK} 0%, ${SPINE_BASE} 10%, ${SPINE_LIGHT} 50%, ${SPINE_BASE} 90%, ${SPINE_DARK} 100%)`,
          boxShadow:'inset 3px 0 5px rgba(0,0,0,0.35), 2px 2px 8px rgba(0,0,0,0.2)',
          opacity: hover ? 0 : 0.45,
          transform: hover ? 'rotateY(-100deg)' : 'rotateY(0deg)',
          transition:'opacity .15s ease, transform .35s ease',
          backfaceVisibility:'hidden',
        }}/>
        <div style={{
          position:'absolute', inset:0,
          transformOrigin:'left center',
          background:'#fff', border:`1px solid ${SPINE_BASE}40`, borderRadius:'2px 7px 7px 2px',
          overflow:'hidden', display:'flex', flexDirection:'column',
          opacity: hover ? 1 : 0,
          transform: hover ? 'rotateY(0deg)' : 'rotateY(100deg)',
          transition:'opacity .2s ease .12s, transform .35s ease',
          backfaceVisibility:'hidden',
        }}>
          <div style={{height:5,background:`linear-gradient(90deg, ${SPINE_DARK}, ${SPINE_LIGHT})`,flexShrink:0}}/>
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
      </div>
    </div>
  )
}

export default function GemSection({ novels, discoverCommentMap }: Props) {
  return (
    <>
      {/* デスクトップ：本棚スタイル（端から端まで均等配置） */}
      <div className="gem-desktop" style={{flex:1,overflow:'hidden'}}>
        <div style={{display:'flex',gap:3,paddingBottom:10,paddingTop:4,alignItems:'flex-end',position:'relative',width:'100%'}}>
          {Array.from({length:7},(_,i) => {
            const n = novels[i]
            return n
              ? <BookItem key={n.id} n={n} discoverComments={discoverCommentMap[n.id]||[]} />
              : <EmptyBook key={i} />
          })}
          {/* 本棚の板 */}
          <div style={{position:'absolute',left:0,right:0,bottom:-6,height:8,background:'linear-gradient(180deg,#c8a87a,#a8855a)',borderRadius:2,boxShadow:'0 3px 6px rgba(0,0,0,0.2)',zIndex:0}}/>
        </div>
      </div>

      {/* モバイル：お知らせ風デザイン（変更なし） */}
      <div className="gem-mobile" style={{display:'none',width:'100%'}}>
        <div>
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>ユーザーの推し</span>
              <a href="/search" style={{fontSize:12,color:'#F26A21',textDecoration:'none'}}>作品を探す ›</a>
            </div>
            {novels.slice(0,4).map((n, i) => !n ? null : (
              <NovelPreviewPopup key={n.id} novel={{...n, like_count: n.likeCount2}}>
                <div style={{padding:'10px 16px',borderBottom:'1px solid #FFF1E6',cursor:'pointer'}}>
                  <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>原石</span>
                    <span style={{fontSize:9,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:2}}>{n.title}</div>
                  <div style={{fontSize:11,color:'#77706A',marginBottom:(discoverCommentMap[n.id]||[]).length>0?4:0}}>作者：{n.display_name}</div>
                  {(discoverCommentMap[n.id]||[]).length > 0 && (
                    <div style={{
                      fontSize:11,color:'#5a3a20',
                      background:'#FFF9A0',
                      borderRadius:'2px 8px 8px 2px',
                      padding:'5px 8px',
                      boxShadow:'2px 2px 4px rgba(0,0,0,0.1)',
                      transform:'rotate(-0.5deg)',
                      marginTop:4,
                      lineHeight:1.5,
                    }}>
                      「{discoverCommentMap[n.id][0].comment.slice(0,28)}」
                      <div style={{fontSize:9,color:'#8a6a40',marginTop:2,textAlign:'right'}}>— {discoverCommentMap[n.id][0].display_name}</div>
                    </div>
                  )}
                </div>
              </NovelPreviewPopup>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
