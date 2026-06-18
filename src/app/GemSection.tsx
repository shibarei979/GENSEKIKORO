'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
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
          flex: hover ? '0 0 168px' : '0 0 48px',
          minWidth: hover ? 168 : 48,
          maxWidth: hover ? 168 : 48,
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

          {/* ===== 表紙（ホバー時・本の表紙デザイン） ===== */}
          <div style={{
            position:'absolute', inset:0,
            transformOrigin:'left center',
            background:`linear-gradient(135deg, ${SPINE_LIGHT} 0%, ${SPINE_BASE} 100%)`,
            border:`1.5px solid ${SPINE_DARK}`, borderRadius:'2px 7px 7px 2px',
            overflow:'hidden', display:'flex', flexDirection:'column',
            boxShadow: hover ? `0 10px 24px rgba(0,0,0,0.28), inset -3px 0 6px rgba(0,0,0,0.15)` : 'none',
            opacity: hover ? 1 : 0,
            transform: hover ? 'rotateY(0deg)' : 'rotateY(100deg)',
            transition:'opacity .2s ease .12s, transform .35s ease',
            backfaceVisibility:'hidden',
          }}>
            {/* 装飾の二重枠線（画像参考の本の表紙デザイン） */}
            <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox="0 0 168 195" preserveAspectRatio="none">
              <rect x="8" y="8" width="152" height="179" rx="3" fill="none" stroke="rgba(255,230,190,0.55)" strokeWidth="1.5"/>
              <path d="M 16 22 Q 16 16 22 16 L 146 16 Q 152 16 152 22"
                fill="none" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
              <path d="M 16 173 Q 16 179 22 179 L 146 179 Q 152 179 152 173"
                fill="none" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
              <line x1="16" y1="16" x2="16" y2="179" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
              <line x1="152" y1="16" x2="152" y2="179" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
            </svg>

            <div style={{position:'relative',zIndex:1,padding:'18px 16px 10px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
              <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap',justifyContent:'center'}}>
                <span style={{fontSize:8,fontWeight:700,color:'#fff',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,230,190,0.5)',padding:'1px 6px',borderRadius:3,letterSpacing:'0.05em'}}>原石</span>
                <span style={{fontSize:8,color:'rgba(255,255,255,0.85)',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,230,190,0.3)',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:'#fff',lineHeight:1.5,marginBottom:8,fontFamily:"'Noto Serif JP',serif",textShadow:'0 1px 3px rgba(0,0,0,0.3)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
              <div style={{width:24,height:1,background:'rgba(255,230,190,0.5)',marginBottom:8}}/>
              <div style={{fontSize:10,color:'rgba(255,230,190,0.9)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{n.display_name}</div>
              {n.likeCount2 > 0 && <span style={{fontSize:9,color:'rgba(255,230,190,0.7)',marginTop:4}}>♡ {n.likeCount2}</span>}
            </div>

            {/* 帯（読者の声） */}
            <div style={{position:'relative',zIndex:1,background:'#fff',borderTop:`2px solid ${SPINE_DARK}`}}>
              <GemComment novelId={n.id} discoverCount={n.discoverCount} likeCount={n.likeCount2} discoverComments={discoverComments} />
            </div>
          </div>
        </div>
      </div>
    </NovelPreviewPopup>
  )
}

// 本棚の中に埋め込む見出しブロック（本の代わりに表示）
function IntroBlock() {
  return (
    <div style={{
      flex:'0 0 220px', minWidth:220, maxWidth:220, height:195,
      background:'#FFF9F2', border:`1.5px dashed ${SPINE_BASE}50`, borderRadius:8,
      display:'flex', flexDirection:'column', justifyContent:'center',
      padding:'0 20px', boxSizing:'border-box',
    }}>
      <h2 style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:8,fontFamily:"'Noto Serif JP',serif"}}>ユーザーの推し</h2>
      <p style={{fontSize:12,color:'#77706A',marginBottom:14,lineHeight:1.7}}>推しの作品を拡散しよう！</p>
      <a href="/search" style={{display:'inline-block',fontSize:11,color:'#F26A21',border:'1.5px solid #F26A21',borderRadius:14,padding:'6px 14px',textDecoration:'none',fontWeight:600,width:'fit-content'}}>作品を検索する</a>
    </div>
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
        flex: hover ? '0 0 168px' : '0 0 48px',
        minWidth: hover ? 168 : 48,
        maxWidth: hover ? 168 : 48,
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
          background:`linear-gradient(135deg, ${SPINE_LIGHT} 0%, ${SPINE_BASE} 100%)`,
          border:`1.5px solid ${SPINE_DARK}`, borderRadius:'2px 7px 7px 2px',
          overflow:'hidden', display:'flex', flexDirection:'column',
          opacity: hover ? 1 : 0,
          transform: hover ? 'rotateY(0deg)' : 'rotateY(100deg)',
          transition:'opacity .2s ease .12s, transform .35s ease',
          backfaceVisibility:'hidden',
        }}>
          <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox="0 0 168 195" preserveAspectRatio="none">
            <rect x="8" y="8" width="152" height="179" rx="3" fill="none" stroke="rgba(255,230,190,0.45)" strokeWidth="1.5"/>
            <line x1="16" y1="16" x2="16" y2="179" stroke="rgba(255,230,190,0.55)" strokeWidth="1.2"/>
            <line x1="152" y1="16" x2="152" y2="179" stroke="rgba(255,230,190,0.55)" strokeWidth="1.2"/>
            <line x1="16" y1="16" x2="152" y2="16" stroke="rgba(255,230,190,0.55)" strokeWidth="1.2"/>
            <line x1="16" y1="179" x2="152" y2="179" stroke="rgba(255,230,190,0.55)" strokeWidth="1.2"/>
          </svg>
          <div style={{position:'relative',zIndex:1,padding:'18px 16px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
            <span style={{fontSize:8,fontWeight:700,color:'#fff',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,230,190,0.4)',padding:'1px 6px',borderRadius:3,marginBottom:10}}>原石</span>
            <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.8)',fontFamily:"'Noto Serif JP',serif"}}>作品準備中</div>
          </div>
          <div style={{position:'relative',zIndex:1,background:'#fff',borderTop:`2px solid ${SPINE_DARK}`,padding:'8px 10px'}}>
            <div style={{fontSize:9,fontWeight:700,color:'#F26A21',marginBottom:3}}>読者の声</div>
            <div style={{fontSize:10,color:'#B8AEA8',lineHeight:1.55,fontStyle:'italic',textAlign:'center'}}>君の声を届けよう</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GemSection({ novels, discoverCommentMap }: Props) {
  // 防御的に重複を除去（同じidの作品は1つだけにする）
  const uniqueNovels: Novel[] = []
  const seenIds = new Set<string>()
  for (const n of novels) {
    if (n && !seenIds.has(n.id)) { seenIds.add(n.id); uniqueNovels.push(n) }
  }
  // 表示数は「実際のユニークな作品数」を基準にし、見栄えのため最低15冊（足りない分は準備中で埋める）、最大50冊
  const bookCount = Math.min(50, Math.max(uniqueNovels.length, 15))
  const rawBookList: (Novel | null)[] = Array.from({length: bookCount}, (_,i) => uniqueNovels[i] || null)
  // 中央から少し左（全体の40%あたり）の位置に「見出しブロック」を1つ差し込む
  const introIndex = Math.max(1, Math.floor(bookCount * 0.4))
  const bookList: (Novel | null | 'INTRO')[] = [
    ...rawBookList.slice(0, introIndex),
    'INTRO',
    ...rawBookList.slice(introIndex),
  ]
  // 無限ループ用に同じ並びを3セット複製（中央セットを基準に、はみ出たら反対側へワープする）
  const loopList = [...bookList, ...bookList, ...bookList]

  const trackRef = useRef<HTMLDivElement>(null)
  const set1StartRef = useRef<HTMLDivElement>(null) // 1セット目の最初の要素
  const set2StartRef = useRef<HTMLDivElement>(null) // 2セット目の最初の要素（=1セット分の距離の終点）
  const offsetRef = useRef(0)       // 現在のtranslateX値（px、負の方向に進む）
  const oneSetWidthRef = useRef(0)  // 1セット分の実際の幅（px、要素位置から直接算出）
  const pausedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const SPEED = 0.45 // px/frame 程度の自動流れ速度

  const measure = useCallback(() => {
    if (!set1StartRef.current || !set2StartRef.current) return
    const r1 = set1StartRef.current.getBoundingClientRect()
    const r2 = set2StartRef.current.getBoundingClientRect()
    oneSetWidthRef.current = r2.left - r1.left
  }, [])

  useEffect(() => {
    measure()
    // フォントや画像読み込み後にズレる可能性があるため少し遅延しても再計測
    const t1 = setTimeout(measure, 100)
    const t2 = setTimeout(measure, 500)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); clearTimeout(t1); clearTimeout(t2) }
  }, [measure])

  useEffect(() => {
    function tick() {
      if (!pausedRef.current && trackRef.current && oneSetWidthRef.current > 0) {
        offsetRef.current += SPEED
        // 1セット分進んだら、見た目を変えずに巻き戻す（無限ループ）
        if (offsetRef.current >= oneSetWidthRef.current) {
          offsetRef.current -= oneSetWidthRef.current
        }
        trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  function jump(dir: 1 | -1) {
    if (!trackRef.current || oneSetWidthRef.current <= 0) return
    const STEP = 220 // 矢印1クリックで進む距離（だいたい1冊強）
    offsetRef.current += dir * STEP
    // ループ範囲内に収める
    while (offsetRef.current < 0) offsetRef.current += oneSetWidthRef.current
    while (offsetRef.current >= oneSetWidthRef.current) offsetRef.current -= oneSetWidthRef.current
    trackRef.current.style.transition = 'transform .35s ease'
    trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
    setTimeout(() => { if (trackRef.current) trackRef.current.style.transition = 'none' }, 360)
  }

  return (
    <>
      {/* デスクトップ：本棚スタイル（自動スライド＋矢印操作） */}
      <div className="gem-desktop" style={{flex:1,overflow:'hidden',position:'relative'}}
        onMouseEnter={()=>{pausedRef.current = true}}
        onMouseLeave={()=>{pausedRef.current = false}}>
        <div ref={trackRef} style={{display:'flex',gap:3,paddingBottom:10,paddingTop:4,alignItems:'flex-end',width:'max-content',willChange:'transform'}}>
          {loopList.map((n, i) => {
            const setLen = bookList.length
            const isSet1Start = i === 0
            const isSet2Start = i === setLen
            const refProp = isSet1Start ? set1StartRef : isSet2Start ? set2StartRef : undefined
            const item = n === 'INTRO'
              ? <IntroBlock key={`intro-${i}`} />
              : n
                ? <BookItem key={`${n.id}-${i}`} n={n} discoverComments={discoverCommentMap[n.id]||[]} />
                : <EmptyBook key={`empty-${i}`} />
            if (refProp) {
              return <div key={`ref-wrap-${i}`} ref={refProp} style={{display:'flex',alignItems:'flex-end'}}>{item}</div>
            }
            return item
          })}
        </div>
        {/* 本棚の板 */}
        <div style={{position:'absolute',left:0,right:0,bottom:-6,height:8,background:'linear-gradient(180deg,#c8a87a,#a8855a)',borderRadius:2,boxShadow:'0 3px 6px rgba(0,0,0,0.2)',zIndex:0}}/>

        {/* ← → 操作バー */}
        <button onClick={()=>jump(-1)} aria-label="前へ"
          style={{
            position:'absolute', left:6, top:'42%', transform:'translateY(-50%)',
            width:32, height:32, borderRadius:'50%', border:'1px solid rgba(242,106,33,0.3)',
            background:'rgba(255,255,255,0.92)', cursor:'pointer', zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2B211B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button onClick={()=>jump(1)} aria-label="次へ"
          style={{
            position:'absolute', right:6, top:'42%', transform:'translateY(-50%)',
            width:32, height:32, borderRadius:'50%', border:'1px solid rgba(242,106,33,0.3)',
            background:'rgba(255,255,255,0.92)', cursor:'pointer', zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2B211B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
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
