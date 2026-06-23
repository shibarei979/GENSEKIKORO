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
  cover_url?: string | null
}

interface Props {
  novels: Novel[]
  discoverCommentMap: Record<string, {comment:string;display_name:string}[]>
}

const BOOK_W = 110
const BOOK_H = 160
const BOOK_W_CENTER = 150
const BOOK_H_CENTER = 210
const GAP = 10

// 元の茶色系（globals.css の --color-spine-* と同じ）
const SPINE_BASE  = 'var(--color-spine-base)'
const SPINE_DARK  = 'var(--color-spine-dark)'
const SPINE_LIGHT = 'var(--color-spine-light)'
const SPINE_GOLD  = 'rgba(255,215,150,0.7)'

function BookCover({ n, isCenter, discoverComments }: {
  n: Novel
  isCenter: boolean
  discoverComments: {comment:string;display_name:string}[]
}) {
  const [hovered, setHovered] = useState(false)
  const w = isCenter ? BOOK_W_CENTER : BOOK_W
  const h = isCenter ? BOOK_H_CENTER : BOOK_H

  return (
    <NovelPreviewPopup novel={{...n, like_count: n.likeCount2}}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: w, height: h, flexShrink: 0,
          cursor: 'pointer',
          transition: 'transform .25s ease, box-shadow .25s ease',
          transform: hovered
            ? 'translateY(-12px) scale(1.04)'
            : isCenter ? 'translateY(-10px)' : 'translateY(0)',
          boxShadow: hovered
            ? `0 24px 40px rgba(0,0,0,0.35), 4px 4px 0 rgba(0,0,0,0.15)`
            : isCenter
            ? `0 18px 32px rgba(0,0,0,0.28), 3px 3px 0 rgba(0,0,0,0.12)`
            : `0 6px 16px rgba(0,0,0,0.18), 2px 2px 0 rgba(0,0,0,0.08)`,
          borderRadius: '2px 5px 5px 2px',
          position: 'relative',
          zIndex: isCenter ? 3 : hovered ? 4 : 1,
        }}
      >
        <div style={{
          width: '100%', height: '100%',
          borderRadius: '2px 5px 5px 2px',
          overflow: 'hidden',
          position: 'relative',
          background: n.cover_url
            ? '#e8dcc8'
            : `linear-gradient(150deg, ${SPINE_LIGHT} 0%, ${SPINE_BASE} 55%, ${SPINE_DARK} 100%)`,
          border: `1.5px solid ${SPINE_DARK}`,
        }}>
          {/* 表紙画像あり */}
          {n.cover_url ? (
            <img src={n.cover_url} alt={n.title}
              style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}/>
          ) : (
            <>
              {/* 光沢グラデーション */}
              <div style={{
                position:'absolute', inset:0,
                background:`radial-gradient(ellipse at 28% 18%, rgba(255,255,255,0.18) 0%, transparent 55%)`,
                pointerEvents:'none',
              }}/>

              {/* 装飾二重枠 */}
              <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                <rect x="7" y="7" width={w-14} height={h-14} rx="3"
                  fill="none" stroke={SPINE_GOLD} strokeWidth="1.2"/>
                <rect x="11" y="11" width={w-22} height={h-22} rx="2"
                  fill="none" stroke={SPINE_GOLD} strokeWidth="0.6" opacity="0.5"/>
                {/* 上下のアーチ装飾 */}
                <path d={`M ${w*0.14} ${h*0.11} Q ${w*0.5} ${h*0.05} ${w*0.86} ${h*0.11}`}
                  fill="none" stroke={SPINE_GOLD} strokeWidth="0.8" opacity="0.7"/>
                <path d={`M ${w*0.14} ${h*0.89} Q ${w*0.5} ${h*0.95} ${w*0.86} ${h*0.89}`}
                  fill="none" stroke={SPINE_GOLD} strokeWidth="0.8" opacity="0.7"/>
              </svg>

              {/* テキスト表紙（参考画像スタイル） */}
              <div style={{
                position:'relative', zIndex:1,
                padding: isCenter ? '20px 14px 14px' : '14px 10px 10px',
                height:'100%', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'space-between',
                textAlign:'center', boxSizing:'border-box',
              }}>
                {/* ジャンルバッジ */}
                <span style={{
                  fontSize: isCenter ? 9 : 8,
                  color:'rgba(255,255,255,0.88)',
                  background:'rgba(255,255,255,0.12)',
                  border:`1px solid ${SPINE_GOLD}`,
                  padding:'2px 8px', borderRadius:10,
                  letterSpacing:'0.06em', fontWeight:600,
                }}>{n.genre}</span>

                {/* タイトル */}
                <div style={{
                  flex:1, display:'flex', alignItems:'center',
                  justifyContent:'center', padding:'8px 0',
                }}>
                  <div style={{
                    fontSize: isCenter ? 14 : 12,
                    fontWeight:700,
                    color:'rgba(255,255,255,0.97)',
                    lineHeight:1.6,
                    fontFamily:"'Noto Serif JP',serif",
                    textShadow:`0 1px 4px rgba(0,0,0,0.45)`,
                    overflow:'hidden',
                    display:'-webkit-box',
                    WebkitLineClamp: isCenter ? 4 : 3,
                    WebkitBoxOrient:'vertical' as any,
                  }}>{n.title}</div>
                </div>

                {/* 区切り線 */}
                <div style={{
                  width:28, height:1,
                  background:SPINE_GOLD,
                  marginBottom: isCenter ? 8 : 6,
                  opacity:0.85,
                }}/>

                {/* 作者名 */}
                <div style={{
                  fontSize: isCenter ? 10 : 9,
                  color:'rgba(255,255,255,0.82)',
                  overflow:'hidden', textOverflow:'ellipsis',
                  whiteSpace:'nowrap', width:'100%',
                }}>{n.display_name}</div>
              </div>
            </>
          )}

          {/* 綴じ目の影 */}
          <div style={{
            position:'absolute', left:0, top:0, bottom:0, width:10,
            background:'linear-gradient(90deg, rgba(0,0,0,0.28) 0%, transparent 100%)',
            pointerEvents:'none',
          }}/>

          {/* イチオシバッジ（中央のみ） */}
          {isCenter && (
            <div style={{
              position:'absolute', top:10, right:-2,
              background:'var(--color-brand)',
              color:'#fff', fontSize:8, fontWeight:700,
              padding:'4px 8px 4px 6px',
              borderRadius:'3px 0 0 3px',
              boxShadow:'-2px 1px 6px rgba(0,0,0,0.25)',
              letterSpacing:'0.04em',
            }}>イチオシ!</div>
          )}

          {/* ホバー時：読者の声オーバーレイ */}
          {hovered && discoverComments.length > 0 && (
            <div style={{
              position:'absolute', inset:0,
              background:'rgba(0,0,0,0.6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:10, boxSizing:'border-box',
            }}>
              <div style={{
                background:'#FFF9A0',
                borderRadius:6, padding:'8px 10px',
                fontSize:10, color:'#5a3a20', lineHeight:1.65,
                textAlign:'center', transform:'rotate(-1deg)',
                boxShadow:'2px 2px 8px rgba(0,0,0,0.3)',
                maxWidth:'90%',
              }}>
                「{discoverComments[0].comment.slice(0,30)}」
                <div style={{fontSize:9, color:'#8a6a40', marginTop:4}}>
                  — {discoverComments[0].display_name}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 中央本のみ：下にタイトル・作者 */}
        {isCenter && (
          <div style={{
            position:'absolute', bottom: -46, left:'50%',
            transform:'translateX(-50%)',
            width: BOOK_W_CENTER + 20,
            textAlign:'center',
            pointerEvents:'none',
          }}>
            <div style={{
              fontSize:11, fontWeight:700, color:'var(--color-text)',
              lineHeight:1.4, marginBottom:2,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{n.title}</div>
            <div style={{fontSize:10, color:'var(--color-text-muted)'}}>{n.display_name}</div>
          </div>
        )}
      </div>
    </NovelPreviewPopup>
  )
}

function EmptyBook({ isCenter }: { isCenter?: boolean }) {
  const w = isCenter ? BOOK_W_CENTER : BOOK_W
  const h = isCenter ? BOOK_H_CENTER : BOOK_H
  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      borderRadius: '2px 5px 5px 2px',
      background:`linear-gradient(150deg, #c8b8a8 0%, #b0a090 55%, #988070 100%)`,
      border:`1.5px solid #806050`,
      boxShadow:`0 4px 12px rgba(0,0,0,0.15), 2px 2px 0 rgba(0,0,0,0.08)`,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'space-between',
      padding: isCenter ? '18px 14px' : '12px 10px',
      boxSizing:'border-box',
      transform: isCenter ? 'translateY(-10px)' : 'translateY(0)',
      position:'relative', overflow:'hidden',
    }}>
      <div style={{position:'absolute', left:0, top:0, bottom:0, width:10,
        background:'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 100%)'}}/>
      <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <rect x="7" y="7" width={w-14} height={h-14} rx="3"
          fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
      </svg>
      <span style={{
        fontSize:8, color:'rgba(255,255,255,0.7)',
        background:'rgba(255,255,255,0.12)',
        border:'1px solid rgba(255,255,255,0.3)',
        padding:'2px 8px', borderRadius:10,
        letterSpacing:'0.06em', fontWeight:600,
        position:'relative', zIndex:1,
      }}>準備中</span>
      <div style={{
        fontSize: isCenter ? 13 : 11, fontWeight:700,
        color:'rgba(255,255,255,0.5)',
        fontFamily:"'Noto Serif JP',serif",
        position:'relative', zIndex:1,
      }}>···</div>
      <div style={{width:24, height:1, background:'rgba(255,255,255,0.3)', position:'relative', zIndex:1}}/>
    </div>
  )
}

function IntroBlock() {
  return (
    <div style={{
      width:180, height:BOOK_H, flexShrink:0,
      background:'var(--color-bg-card)',
      border:`1.5px dashed var(--color-brand-border)`,
      borderRadius:8,
      display:'flex', flexDirection:'column', justifyContent:'center',
      padding:'0 18px', boxSizing:'border-box',
    }}>
      <h2 style={{fontSize:15,fontWeight:700,color:'var(--color-text)',marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>
        ユーザーの推し
      </h2>
      <p style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:12,lineHeight:1.7}}>
        推しの作品を拡散しよう！
      </p>
      <a href="/search" style={{
        display:'inline-block', fontSize:11, color:'var(--color-brand)',
        border:'1.5px solid var(--color-brand)', borderRadius:14,
        padding:'5px 12px', textDecoration:'none', fontWeight:600, width:'fit-content',
      }}>作品を検索する</a>
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
  const rawBookList: (Novel | null)[] = Array.from({length: bookCount}, (_, i) => uniqueNovels[i] || null)
  const introIndex = Math.max(1, Math.floor(bookCount * 0.4))
  const bookList: (Novel | null | 'INTRO')[] = [
    ...rawBookList.slice(0, introIndex),
    'INTRO',
    ...rawBookList.slice(introIndex),
  ]
  const loopList = [...bookList, ...bookList, ...bookList]
  const centerIdxInSet = Math.floor(bookList.length / 2)

  const trackRef = useRef<HTMLDivElement>(null)
  const set1StartRef = useRef<HTMLDivElement>(null)
  const set2StartRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const oneSetWidthRef = useRef(0)
  const pausedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const SPEED = 0.4

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
        if (offsetRef.current >= oneSetWidthRef.current) offsetRef.current -= oneSetWidthRef.current
        trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  function jump(dir: 1 | -1) {
    if (!trackRef.current || oneSetWidthRef.current <= 0) return
    const STEP = BOOK_W + GAP
    offsetRef.current += dir * STEP
    while (offsetRef.current < 0) offsetRef.current += oneSetWidthRef.current
    while (offsetRef.current >= oneSetWidthRef.current) offsetRef.current -= oneSetWidthRef.current
    trackRef.current.style.transition = 'transform .3s ease'
    trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
    setTimeout(() => { if (trackRef.current) trackRef.current.style.transition = 'none' }, 310)
  }

  return (
    <>
      {/* デスクトップ */}
      <div className="gem-desktop" style={{flex:1, overflow:'hidden', position:'relative', paddingBottom:74}}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        <div ref={trackRef} style={{
          display:'flex', gap:GAP, paddingTop:24, paddingBottom:20,
          alignItems:'flex-end', width:'max-content', willChange:'transform',
        }}>
          {loopList.map((item, i) => {
            const setLen = bookList.length
            const idxInSet = i % setLen
            const isCenter = idxInSet === centerIdxInSet
            const isSet1Start = i === 0
            const isSet2Start = i === setLen
            const refProp = isSet1Start ? set1StartRef : isSet2Start ? set2StartRef : undefined

            const el = item === 'INTRO'
              ? <IntroBlock key={`intro-${i}`}/>
              : item
                ? <BookCover key={`${item.id}-${i}`} n={item} isCenter={isCenter} discoverComments={discoverCommentMap[item.id]||[]}/>
                : <EmptyBook key={`empty-${i}`} isCenter={isCenter}/>

            if (refProp) {
              return <div key={`ref-${i}`} ref={refProp} style={{display:'flex', alignItems:'flex-end'}}>{el}</div>
            }
            return el
          })}
        </div>

        {/* 木製棚板（厚みあり・立体的） */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:46,
          height:26,
          background:'linear-gradient(180deg, #f0d080 0%, #d4a040 20%, #b07820 60%, #8a5810 100%)',
          borderRadius:'0 0 3px 3px',
          boxShadow:'0 6px 18px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,255,255,0.22), inset 0 -2px 4px rgba(0,0,0,0.18)',
          zIndex:2, overflow:'hidden',
        }}>
          {/* 木目 */}
          <div style={{
            position:'absolute', inset:0,
            background:`repeating-linear-gradient(90deg,
              transparent 0px, transparent 55px,
              rgba(0,0,0,0.05) 55px, rgba(0,0,0,0.05) 56px,
              transparent 56px, transparent 78px,
              rgba(0,0,0,0.035) 78px, rgba(0,0,0,0.035) 78.5px
            )`,
          }}/>
          {/* 上面ハイライト */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:5,
            background:'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, transparent 100%)',
          }}/>
        </div>

        {/* 本が棚に落とす影 */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:70,
          height:8,
          background:'rgba(0,0,0,0.14)',
          filter:'blur(3px)',
          zIndex:1,
        }}/>

        {/* ← → ボタン */}
        {([{dir:-1 as const, label:'前へ', pos:{left:8}}, {dir:1 as const, label:'次へ', pos:{right:8}}]).map(({dir,label,pos}) => (
          <button key={dir} onClick={() => jump(dir)} aria-label={label}
            style={{
              position:'absolute', ...pos, top:'40%', transform:'translateY(-50%)',
              width:34, height:34, borderRadius:'50%',
              border:'1px solid rgba(242,106,33,0.25)',
              background:'rgba(255,255,255,0.94)',
              cursor:'pointer', zIndex:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 3px 10px rgba(0,0,0,0.16)',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {dir === -1 ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
        ))}
      </div>

      {/* モバイル */}
      <div className="gem-mobile" style={{display:'none', width:'100%'}}>
        <div style={{background:'var(--color-bg-card)', border:'1px solid var(--color-brand-border)', borderRadius:10, overflow:'hidden'}}>
          <div style={{padding:'10px 16px', borderBottom:'1px solid var(--color-brand-border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--color-bg)'}}>
            <span style={{fontSize:14, fontWeight:700, color:'var(--color-text)'}}>ユーザーの推し</span>
            <a href="/search" style={{fontSize:12, color:'var(--color-brand)', textDecoration:'none'}}>作品を探す ›</a>
          </div>
          {novels.slice(0,4).map(n => !n ? null : (
            <NovelPreviewPopup key={n.id} novel={{...n, like_count: n.likeCount2}}>
              <div style={{padding:'10px 16px', borderBottom:'1px solid var(--color-brand-light)', cursor:'pointer'}}>
                <div style={{display:'flex', gap:4, marginBottom:3, flexWrap:'wrap'}}>
                  <span style={{fontSize:9, fontWeight:700, color:'var(--color-brand)', background:'var(--color-brand-light)', border:'1px solid var(--color-tag-border)', padding:'1px 5px', borderRadius:3}}>原石</span>
                  <span style={{fontSize:9, color:'var(--color-text-muted)', background:'var(--color-bg)', border:'1px solid var(--color-brand-border)', padding:'1px 5px', borderRadius:3}}>{n.genre}</span>
                </div>
                <div style={{fontSize:13, fontWeight:700, color:'var(--color-text)', marginBottom:2}}>{n.title}</div>
                <div style={{fontSize:11, color:'var(--color-text-muted)'}}>{n.display_name}</div>
                {(discoverCommentMap[n.id]||[]).length > 0 && (
                  <div style={{fontSize:11, color:'#5a3a20', background:'#FFF9A0', borderRadius:'2px 8px 8px 2px', padding:'5px 8px', boxShadow:'2px 2px 4px rgba(0,0,0,0.1)', transform:'rotate(-0.5deg)', marginTop:4, lineHeight:1.5}}>
                    「{discoverCommentMap[n.id][0].comment.slice(0,28)}」
                    <div style={{fontSize:9, color:'#8a6a40', marginTop:2, textAlign:'right'}}>— {discoverCommentMap[n.id][0].display_name}</div>
                  </div>
                )}
              </div>
            </NovelPreviewPopup>
          ))}
        </div>
      </div>
    </>
  )
}
