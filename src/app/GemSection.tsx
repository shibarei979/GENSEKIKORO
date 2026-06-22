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

// ジャンルごとのアクセントカラー（表紙デザイン用）
const GENRE_COLORS: Record<string, string> = {
  '異世界': '#7B5EA7', 'ファンタジー': '#5B8DB8', 'SF': '#3A7D8C',
  '恋愛': '#C2607A', '学園': '#E8944A', 'ミステリー': '#4A6741',
  'ホラー': '#6B3A3A', '歴史・時代': '#8B6914', '日常': '#6B8C6B',
  'アクション': '#8B4513', 'コメディ': '#D4872A', '官能': '#9B4F6B', 'その他': '#6B6B6B',
}

function getGenreColor(genre: string) {
  return GENRE_COLORS[genre] || '#6B5A4A'
}

// ジャンルアイコン（SVGパス）
function GenreIcon({ genre, color }: { genre: string; color: string }) {
  const icons: Record<string, JSX.Element> = {
    '異世界': <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={color} opacity="0.8"/>,
    'ファンタジー': <><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"/><path d="M12 6v12M6 12h12" stroke={color} strokeWidth="1.5" opacity="0.8"/></>,
    '恋愛': <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={color} opacity="0.8"/>,
    'ミステリー': <><circle cx="11" cy="11" r="8" fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"/><path d="m21 21-4.35-4.35" stroke={color} strokeWidth="1.5" opacity="0.8"/></>,
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      {icons[genre] || <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none" stroke={color} strokeWidth="1.5" opacity="0.8"/>}
    </svg>
  )
}

function BookCover({ n, isCenter, discoverComments }: {
  n: Novel
  isCenter: boolean
  discoverComments: {comment:string;display_name:string}[]
}) {
  const [hovered, setHovered] = useState(false)
  const accentColor = getGenreColor(n.genre)
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
          transform: hovered ? 'translateY(-10px) scale(1.04)' : isCenter ? 'translateY(-8px)' : 'translateY(0)',
          boxShadow: hovered
            ? `0 20px 40px rgba(0,0,0,0.35), 4px 4px 0 rgba(0,0,0,0.15)`
            : isCenter
            ? `0 16px 32px rgba(0,0,0,0.28), 3px 3px 0 rgba(0,0,0,0.12)`
            : `0 6px 16px rgba(0,0,0,0.2), 2px 2px 0 rgba(0,0,0,0.1)`,
          borderRadius: '2px 4px 4px 2px',
          position: 'relative',
          zIndex: isCenter ? 3 : hovered ? 4 : 1,
        }}
      >
        {/* 本体 */}
        <div style={{
          width: '100%', height: '100%',
          borderRadius: '2px 4px 4px 2px',
          overflow: 'hidden',
          position: 'relative',
          background: n.cover_url
            ? '#e8e0d0'
            : `linear-gradient(160deg, ${accentColor}dd 0%, ${accentColor}88 100%)`,
          border: `1px solid rgba(0,0,0,0.15)`,
        }}>
          {/* 表紙画像あり */}
          {n.cover_url ? (
            <img src={n.cover_url} alt={n.title}
              style={{width:'100%', height:'100%', objectFit:'cover', display:'block'}}/>
          ) : (
            /* 表紙画像なし → テキスト表紙 */
            <>
              {/* 背景テクスチャ */}
              <div style={{
                position:'absolute', inset:0,
                background:`radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
              }}/>

              {/* 装飾枠 */}
              <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox={`0 0 ${w} ${h}`}>
                <rect x="6" y="6" width={w-12} height={h-12} rx="2"
                  fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                <rect x="10" y="10" width={w-20} height={h-20} rx="1"
                  fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
              </svg>

              <div style={{
                position:'relative', zIndex:1,
                padding: isCenter ? '16px 12px' : '10px 8px',
                height:'100%', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'space-between',
                textAlign:'center', boxSizing:'border-box',
              }}>
                {/* 上部：ジャンルバッジ */}
                <div>
                  <span style={{
                    fontSize: isCenter ? 9 : 8,
                    color:'rgba(255,255,255,0.9)',
                    background:'rgba(255,255,255,0.2)',
                    border:'1px solid rgba(255,255,255,0.4)',
                    padding:'2px 6px', borderRadius:3,
                    letterSpacing:'0.05em', fontWeight:600,
                  }}>{n.genre}</span>
                </div>

                {/* 中央：アイコン＋タイトル */}
                <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'8px 0'}}>
                  <GenreIcon genre={n.genre} color="rgba(255,255,255,0.85)"/>
                  <div style={{
                    fontSize: isCenter ? 13 : 11,
                    fontWeight:700,
                    color:'rgba(255,255,255,0.95)',
                    lineHeight:1.5,
                    fontFamily:"'Noto Serif JP',serif",
                    textShadow:'0 1px 3px rgba(0,0,0,0.4)',
                    overflow:'hidden',
                    display:'-webkit-box',
                    WebkitLineClamp: isCenter ? 4 : 3,
                    WebkitBoxOrient:'vertical' as any,
                  }}>{n.title}</div>
                </div>

                {/* 下部：作者名 */}
                <div style={{
                  fontSize: isCenter ? 9 : 8,
                  color:'rgba(255,255,255,0.8)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  width:'100%',
                  borderTop:'1px solid rgba(255,255,255,0.2)',
                  paddingTop:6,
                }}>{n.display_name}</div>
              </div>
            </>
          )}

          {/* 本の綴じ目（左端のシャドウ） */}
          <div style={{
            position:'absolute', left:0, top:0, bottom:0, width:8,
            background:'linear-gradient(90deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
            pointerEvents:'none',
          }}/>

          {/* 中央バッジ */}
          {isCenter && (
            <div style={{
              position:'absolute', top:8, right:-2,
              background:'var(--color-brand)',
              color:'#fff', fontSize:8, fontWeight:700,
              padding:'3px 7px 3px 5px',
              borderRadius:'2px 0 0 2px',
              boxShadow:'-2px 1px 4px rgba(0,0,0,0.2)',
              letterSpacing:'0.05em',
            }}>イチオシ!</div>
          )}

          {/* ホバー時のオーバーレイ（読者の声） */}
          {hovered && discoverComments.length > 0 && (
            <div style={{
              position:'absolute', inset:0,
              background:'rgba(0,0,0,0.65)',
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:10, boxSizing:'border-box',
            }}>
              <div style={{
                background:'#FFF9A0',
                borderRadius:6, padding:'8px 10px',
                fontSize:10, color:'#5a3a20', lineHeight:1.6,
                textAlign:'center', transform:'rotate(-1deg)',
                boxShadow:'2px 2px 6px rgba(0,0,0,0.3)',
                maxWidth:'90%',
              }}>
                「{discoverComments[0].comment.slice(0,30)}」
                <div style={{fontSize:9, color:'#8a6a40', marginTop:4}}>— {discoverComments[0].display_name}</div>
              </div>
            </div>
          )}
        </div>

        {/* 本の下の情報（中央のみ） */}
        {isCenter && (
          <div style={{
            position:'absolute', bottom:-52, left:'50%', transform:'translateX(-50%)',
            width: BOOK_W_CENTER + 20,
            textAlign:'center',
          }}>
            <div style={{fontSize:11, fontWeight:700, color:'var(--color-text)', lineHeight:1.4, marginBottom:2,
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {n.title}
            </div>
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
      width: w, height: h, flexShrink:0,
      borderRadius:'2px 4px 4px 2px',
      background:'linear-gradient(160deg, #d4c4b4 0%, #c0ae9e 100%)',
      border:'1px solid rgba(0,0,0,0.1)',
      boxShadow:'0 4px 12px rgba(0,0,0,0.15), 2px 2px 0 rgba(0,0,0,0.08)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:8, position:'relative', overflow:'hidden',
      transform: isCenter ? 'translateY(-8px)' : 'translateY(0)',
    }}>
      <div style={{position:'absolute', left:0, top:0, bottom:0, width:8,
        background:'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 100%)'}}/>
      <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox={`0 0 ${w} ${h}`}>
        <rect x="6" y="6" width={w-12} height={h-12} rx="2"
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
      </svg>
      <div style={{fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.7)',
        background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
        padding:'2px 6px', borderRadius:3, letterSpacing:'0.05em', position:'relative',zIndex:1}}>準備中</div>
      <div style={{fontSize: isCenter ? 12 : 10, fontWeight:700,
        color:'rgba(255,255,255,0.6)', fontFamily:"'Noto Serif JP',serif",
        position:'relative',zIndex:1}}>···</div>
    </div>
  )
}

function IntroBlock() {
  return (
    <div style={{
      width:180, height:BOOK_H, flexShrink:0,
      background:'var(--color-bg-card)',
      border:'1.5px dashed var(--color-brand-border)',
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

  // 中央に表示するインデックス（2セット目の中央あたり）
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
      {/* デスクトップ：本棚スタイル */}
      <div className="gem-desktop" style={{flex:1, overflow:'hidden', position:'relative', paddingBottom:70}}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        {/* 本のトラック */}
        <div ref={trackRef} style={{
          display:'flex', gap:GAP, paddingTop:20, paddingBottom:16,
          alignItems:'flex-end', width:'max-content', willChange:'transform',
        }}>
          {loopList.map((item, i) => {
            const setLen = bookList.length
            const idxInSet = i % setLen
            const isCenter = idxInSet === centerIdxInSet + Math.floor(bookList.length / 2)
            const isSet1Start = i === 0
            const isSet2Start = i === setLen
            const refProp = isSet1Start ? set1StartRef : isSet2Start ? set2StartRef : undefined

            const el = item === 'INTRO'
              ? <IntroBlock key={`intro-${i}`} />
              : item
                ? <BookCover key={`${item.id}-${i}`} n={item} isCenter={isCenter} discoverComments={discoverCommentMap[item.id]||[]}/>
                : <EmptyBook key={`empty-${i}`} isCenter={isCenter}/>

            if (refProp) {
              return <div key={`ref-${i}`} ref={refProp} style={{display:'flex', alignItems:'flex-end'}}>{el}</div>
            }
            return el
          })}
        </div>

        {/* 木製の棚板 */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:56,
          height:18,
          background:'linear-gradient(180deg, #e8c88a 0%, #c8a050 40%, #a87828 100%)',
          borderRadius:3,
          boxShadow:'0 4px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
          zIndex:0,
        }}>
          {/* 木目の線 */}
          <div style={{position:'absolute', inset:0, opacity:0.3,
            background:'repeating-linear-gradient(90deg, transparent 0px, transparent 40px, rgba(0,0,0,0.1) 40px, rgba(0,0,0,0.1) 41px)'}}/>
        </div>
        {/* 棚の影 */}
        <div style={{
          position:'absolute', left:10, right:10, bottom:50,
          height:8,
          background:'rgba(0,0,0,0.15)',
          filter:'blur(4px)',
          borderRadius:4,
          zIndex:0,
        }}/>

        {/* ← → ボタン */}
        {[{dir:-1 as const, label:'前へ', side:'left'}, {dir:1 as const, label:'次へ', side:'right'}].map(({dir, label, side}) => (
          <button key={side} onClick={() => jump(dir)} aria-label={label}
            style={{
              position:'absolute', [side]:8, bottom:62,
              width:34, height:34, borderRadius:'50%',
              border:'1px solid rgba(0,0,0,0.15)',
              background:'rgba(255,255,255,0.95)',
              cursor:'pointer', zIndex:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {dir === -1 ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
            </svg>
          </button>
        ))}
      </div>

      {/* モバイル：リスト表示 */}
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
