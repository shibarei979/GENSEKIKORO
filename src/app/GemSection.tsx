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
  hideStats?: boolean
}

interface Props {
  novels: Novel[]
  discoverCommentMap: Record<string, {comment:string;display_name:string}[]>
}

const SPINE_BASE = 'var(--color-spine-base)'
const SPINE_DARK = 'var(--color-spine-dark)'
const SPINE_LIGHT = 'var(--color-spine-light)'

function BookItem({ n, discoverComments }: { n: Novel; discoverComments: {comment:string;display_name:string}[] }) {
  const [hover, setHover] = useState(false)

  return (
    <NovelPreviewPopup novel={{...n, like_count: n.hideStats ? 0 : n.likeCount2}}>
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
        <div style={{ position:'absolute', inset:0, transformStyle:'preserve-3d', transformOrigin:'left center' }}>
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
            <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center',width:'100%'}}>
              <div style={{width:'62%',height:1,background:'rgba(255,215,150,0.55)'}}/>
              <div style={{width:'40%',height:1,background:'rgba(255,215,150,0.3)'}}/>
            </div>
            <div style={{
              border:'1px solid rgba(255,215,150,0.5)', borderRadius:3,
              padding:'10px 6px', background:'rgba(0,0,0,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div style={{
                writingMode:'vertical-rl' as any, fontSize:11, fontWeight:700, color:'var(--color-bg-card)',
                letterSpacing:'0.05em', lineHeight:1.65, maxHeight:120, overflow:'hidden',
                textShadow:'0 1px 2px rgba(0,0,0,0.4)', fontFamily:"'Noto Serif JP',serif",
              }}>
                {n.title.length > 11 ? n.title.slice(0,11)+'…' : n.title}
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center',width:'100%'}}>
              <div style={{width:'40%',height:1,background:'rgba(255,215,150,0.3)'}}/>
              <div style={{width:'62%',height:1,background:'rgba(255,215,150,0.55)'}}/>
            </div>
          </div>

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
            <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox="0 0 168 195" preserveAspectRatio="none">
              <rect x="8" y="8" width="152" height="179" rx="3" fill="none" stroke="rgba(255,230,190,0.55)" strokeWidth="1.5"/>
              <path d="M 16 22 Q 16 16 22 16 L 146 16 Q 152 16 152 22" fill="none" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
              <path d="M 16 173 Q 16 179 22 179 L 146 179 Q 152 179 152 173" fill="none" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
              <line x1="16" y1="16" x2="16" y2="179" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
              <line x1="152" y1="16" x2="152" y2="179" stroke="rgba(255,230,190,0.7)" strokeWidth="1.2"/>
            </svg>
            <div style={{position:'relative',zIndex:1,padding:'18px 16px 10px',flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
              <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap',justifyContent:'center'}}>
                <span style={{fontSize:8,fontWeight:700,color:'var(--color-bg-card)',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,230,190,0.5)',padding:'1px 6px',borderRadius:3,letterSpacing:'0.05em'}}>原石</span>
                <span style={{fontSize:8,color:'rgba(255,255,255,0.85)',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,230,190,0.3)',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:'var(--color-bg-card)',lineHeight:1.5,marginBottom:8,fontFamily:"'Noto Serif JP',serif",textShadow:'0 1px 3px rgba(0,0,0,0.3)',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any}}>{n.title}</div>
              <div style={{width:24,height:1,background:'rgba(255,230,190,0.5)',marginBottom:8}}/>
              <div style={{fontSize:10,color:'rgba(255,230,190,0.9)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{n.display_name}</div>
              {!n.hideStats && n.likeCount2 > 0 && <span style={{fontSize:9,color:'rgba(255,230,190,0.7)',marginTop:4}}>♡ {n.likeCount2}</span>}
            </div>
            <div style={{position:'relative',zIndex:1,background:'var(--color-bg-card)',borderTop:`2px solid ${SPINE_DARK}`}}>
              <GemComment novelId={n.id} discoverCount={n.discoverCount} likeCount={n.hideStats ? 0 : n.likeCount2} discoverComments={discoverComments} />
            </div>
          </div>
        </div>
      </div>
    </NovelPreviewPopup>
  )
}

function IntroBlock() {
  return (
    <div style={{
      flex:'0 0 220px', minWidth:220, maxWidth:220, height:195,
      background:'var(--color-bg)', border:`1.5px dashed ${SPINE_BASE}`, borderRadius:8,
      display:'flex', flexDirection:'column', justifyContent:'center',
      padding:'0 20px', boxSizing:'border-box', opacity:0.97,
    }}>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--color-text)',marginBottom:8,fontFamily:"'Noto Serif JP',serif"}}>ユーザーの推し</h2>
      <p style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:14,lineHeight:1.7}}>推しの作品を拡散しよう！</p>
      <a href="/search" style={{display:'inline-block',fontSize:11,color:'var(--color-brand)',border:'1.5px solid var(--color-brand)',borderRadius:14,padding:'6px 14px',textDecoration:'none',fontWeight:600,width:'fit-content'}}>作品を検索する</a>
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
          background:`linear-gradient(90deg, #a89488 0%, #beac9e 10%, #d4c2b4 50%, #beac9e 90%, #a89488 100%)`,
          boxShadow:'inset 3px 0 5px rgba(0,0,0,0.25), inset -2px 0 4px rgba(255,255,255,0.15), 2px 2px 8px rgba(0,0,0,0.18)',
          opacity: hover ? 0 : 1,
          transform: hover ? 'rotateY(-100deg)' : 'rotateY(0deg)',
          transition:'opacity .15s ease, transform .35s ease',
          backfaceVisibility:'hidden',
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'space-between', padding:'14px 0',
        }}>
          <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center',width:'100%'}}>
            <div style={{width:'62%',height:1,background:'rgba(255,255,255,0.6)'}}/>
            <div style={{width:'40%',height:1,background:'rgba(255,255,255,0.35)'}}/>
          </div>
          <div style={{
            border:'1px solid rgba(255,255,255,0.4)', borderRadius:3,
            padding:'10px 6px', background:'rgba(0,0,0,0.05)',
          }}>
            <div style={{
              writingMode:'vertical-rl' as any, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.85)',
              letterSpacing:'0.08em', lineHeight:1.6,
              textShadow:'0 1px 2px rgba(0,0,0,0.2)', fontFamily:"'Noto Serif JP',serif",
            }}>
              準備中
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:3,alignItems:'center',width:'100%'}}>
            <div style={{width:'40%',height:1,background:'rgba(255,255,255,0.35)'}}/>
            <div style={{width:'62%',height:1,background:'rgba(255,255,255,0.6)'}}/>
          </div>
        </div>
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
            <span style={{fontSize:8,fontWeight:700,color:'var(--color-bg-card)',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,230,190,0.4)',padding:'1px 6px',borderRadius:3,marginBottom:10}}>原石</span>
            <div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.8)',fontFamily:"'Noto Serif JP',serif"}}>作品準備中</div>
          </div>
          <div style={{position:'relative',zIndex:1,background:'var(--color-bg-card)',borderTop:`2px solid ${SPINE_DARK}`,padding:'8px 10px'}}>
            <div style={{fontSize:9,fontWeight:700,color:'var(--color-brand)',marginBottom:3}}>読者の声</div>
            <div style={{fontSize:10,color:'var(--color-text-faint)',lineHeight:1.55,fontStyle:'italic',textAlign:'center'}}>君の声を届けよう</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GemSection({ novels, discoverCommentMap }: Props) {
  const uniqueNovels: Novel[] = []
  const seenIds = new Set<string>()
  for (const n of novels) {
    if (n && !seenIds.has(n.id)) { seenIds.add(n.id); uniqueNovels.push(n) }
  }
  const bookCount = Math.min(50, Math.max(uniqueNovels.length, 15))
  const rawBookList: (Novel | null)[] = Array.from({length: bookCount}, (_,i) => uniqueNovels[i] || null)
  const introIndex = Math.max(1, Math.floor(bookCount * 0.4))
  const bookList: (Novel | null | 'INTRO')[] = [
    ...rawBookList.slice(0, introIndex),
    'INTRO',
    ...rawBookList.slice(introIndex),
  ]
  const loopList = [...bookList, ...bookList, ...bookList]

  const trackRef = useRef<HTMLDivElement>(null)
  const set1StartRef = useRef<HTMLDivElement>(null)
  const set2StartRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const oneSetWidthRef = useRef(0)
  const pausedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const SPEED = 0.45

  const measure = useCallback(() => {
    if (!set1StartRef.current || !set2StartRef.current) return
    const r1 = set1StartRef.current.getBoundingClientRect()
    const r2 = set2StartRef.current.getBoundingClientRect()
    oneSetWidthRef.current = r2.left - r1.left
  }, [])

  useEffect(() => {
    measure()
    const t1 = setTimeout(measure, 100)
    const t2 = setTimeout(measure, 500)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); clearTimeout(t1); clearTimeout(t2) }
  }, [measure])

  useEffect(() => {
    function tick() {
      if (!pausedRef.current && trackRef.current && oneSetWidthRef.current > 0) {
        offsetRef.current += SPEED
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
    const STEP = 220
    offsetRef.current += dir * STEP
    while (offsetRef.current < 0) offsetRef.current += oneSetWidthRef.current
    while (offsetRef.current >= oneSetWidthRef.current) offsetRef.current -= oneSetWidthRef.current
    trackRef.current.style.transition = 'transform .35s ease'
    trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
    setTimeout(() => { if (trackRef.current) trackRef.current.style.transition = 'none' }, 360)
  }

  return (
    <>
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
        <div style={{position:'absolute',left:0,right:0,bottom:-6,height:8,background:'linear-gradient(180deg,#c8a87a,#a8855a)',borderRadius:2,boxShadow:'0 3px 6px rgba(0,0,0,0.2)',zIndex:0}}/>

        <button onClick={()=>jump(-1)} aria-label="前へ"
          style={{
            position:'absolute', left:6, top:'42%', transform:'translateY(-50%)',
            width:32, height:32, borderRadius:'50%', border:'1px solid rgba(242,106,33,0.3)',
            background:'rgba(255,255,255,0.92)', cursor:'pointer', zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button onClick={()=>jump(1)} aria-label="次へ"
          style={{
            position:'absolute', right:6, top:'42%', transform:'translateY(-50%)',
            width:32, height:32, borderRadius:'50%', border:'1px solid rgba(242,106,33,0.3)',
            background:'rgba(255,255,255,0.92)', cursor:'pointer', zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
          }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div className="gem-mobile" style={{display:'none',width:'100%'}}>
        <div>
          <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
              <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>ユーザーの推し</span>
              <a href="/search" style={{fontSize:12,color:'var(--color-brand)',textDecoration:'none'}}>作品を探す ›</a>
            </div>
            {novels.slice(0,4).map((n, i) => !n ? null : (
              <NovelPreviewPopup key={n.id} novel={{...n, like_count: n.hideStats ? 0 : n.likeCount2}}>
                <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-light)',cursor:'pointer'}}>
                  <div style={{display:'flex',gap:4,marginBottom:3,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,color:'var(--color-brand)',background:'var(--color-brand-light)',border:'1px solid var(--color-tag-border)',padding:'1px 5px',borderRadius:3}}>原石</span>
                    <span style={{fontSize:9,color:'var(--color-text-muted)',background:'var(--color-bg)',border:'1px solid var(--color-brand-border)',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:2}}>{n.title}</div>
                  <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:(discoverCommentMap[n.id]||[]).length>0?4:0}}>作者：{n.display_name}</div>
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
