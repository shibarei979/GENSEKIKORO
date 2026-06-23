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

// 本のサイズ定数
const BOOK_W = 130
const BOOK_H = 195
const GAP = 6

// カラーパレット
const C = {
  base:    '#7A4A2A',
  dark:    '#4A2A18',
  light:   '#A56B3A',
  bright:  '#C08A55',
  brightest:'#D2A06A',
  gold:    '#D6A85A',
  goldFaint:'rgba(214,168,90,0.5)',
  text:    '#FFF7ED',
  textSub: '#F5E6D0',
  accent:  '#F97316',
  darkLine:'#3A2416',
  shelf1:  '#D6A15F',
  shelf2:  '#B9824A',
  shelf3:  '#8B5A35',
}

// 本の共通シェル（背表紙帯・小口・影など）
function BookShell({ w, h, bg, hovered, children }: {
  w: number; h: number; bg: string; hovered: boolean; children: React.ReactNode
}) {
  return (
    <div style={{
      width: w, height: h, flexShrink: 0,
      position: 'relative',
      transition: 'transform .2s ease, box-shadow .2s ease',
      transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
      boxShadow: hovered
        ? `0 18px 30px rgba(64,36,18,0.32), 3px 3px 0 rgba(0,0,0,0.12)`
        : `0 6px 14px rgba(64,36,18,0.22), 2px 2px 0 rgba(0,0,0,0.08)`,
      borderRadius: '2px 5px 5px 2px',
    }}>
      {/* 本体 */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: '2px 5px 5px 2px',
        background: bg,
        border: `1.5px solid ${C.darkLine}`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* 左側の背表紙帯 */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
          background: `linear-gradient(90deg, ${C.darkLine} 0%, ${C.dark} 60%, transparent 100%)`,
          pointerEvents: 'none', zIndex: 2,
        }}/>
        {/* 光沢 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.13) 0%, transparent 55%)`,
          pointerEvents: 'none', zIndex: 1,
        }}/>
        {children}
      </div>
      {/* 右端のページの重なり（小口） */}
      <div style={{
        position: 'absolute', top: 4, bottom: 4, right: -5, width: 5,
        background: 'repeating-linear-gradient(180deg, #f5ede0 0px, #f5ede0 1.5px, #e0d0b8 1.5px, #e0d0b8 3px)',
        borderRadius: '0 3px 3px 0',
        boxShadow: '2px 0 4px rgba(0,0,0,0.15)',
        zIndex: 0,
      }}/>
    </div>
  )
}

// 装飾枠SVG
function DecoFrame({ w, h }: { w: number; h: number }) {
  return (
    <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1}}
      viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <rect x="8" y="8" width={w-16} height={h-16} rx="3"
        fill="none" stroke={C.goldFaint} strokeWidth="1.2"/>
      <rect x="13" y="13" width={w-26} height={h-26} rx="2"
        fill="none" stroke={C.goldFaint} strokeWidth="0.6" opacity="0.5"/>
      <path d={`M ${w*0.15} ${h*0.115} Q ${w*0.5} ${h*0.055} ${w*0.85} ${h*0.115}`}
        fill="none" stroke={C.goldFaint} strokeWidth="0.9" opacity="0.8"/>
      <path d={`M ${w*0.15} ${h*0.885} Q ${w*0.5} ${h*0.945} ${w*0.85} ${h*0.885}`}
        fill="none" stroke={C.goldFaint} strokeWidth="0.9" opacity="0.8"/>
    </svg>
  )
}

// 画像なし作品カード
function BookCoverText({ n, w, h }: { n: Novel; w: number; h: number }) {
  return (
    <div style={{
      position: 'relative', zIndex: 2,
      padding: '16px 14px 12px',
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      textAlign: 'center', boxSizing: 'border-box',
    }}>
      {/* 上部：小さな装飾アイコン */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L13.8 8.2H20.2L14.9 12L16.8 18.2L12 14.4L7.2 18.2L9.1 12L3.8 8.2H10.2L12 2Z"
            fill={C.gold} opacity="0.75"/>
        </svg>
        <div style={{ width:24, height:1, background:C.goldFaint }}/>
      </div>

      {/* 中央：タイトル */}
      <div style={{
        flex: 1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'8px 0',
      }}>
        <div style={{
          fontSize: w >= 140 ? 13 : 12,
          fontWeight: 700,
          color: C.text,
          lineHeight: 1.6,
          fontFamily: "'Noto Serif JP',serif",
          textShadow: `0 1px 4px rgba(0,0,0,0.5)`,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical' as any,
        }}>{n.title || '作品タイトル'}</div>
      </div>

      {/* 作者名 */}
      <div style={{
        fontSize: 10, color: C.textSub, opacity: 0.88,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%',
        marginBottom: 6,
      }}>{n.display_name}</div>

      {/* ジャンルタグ */}
      <span style={{
        fontSize: 8, color: C.textSub,
        background: 'rgba(255,255,255,0.1)',
        border: `1px solid ${C.goldFaint}`,
        padding: '2px 7px', borderRadius: 10,
        letterSpacing: '0.06em', fontWeight: 600,
      }}>{n.genre}</span>
    </div>
  )
}

// メインの本カード
function BookItem({ n, discoverComments }: {
  n: Novel
  discoverComments: {comment:string;display_name:string}[]
}) {
  const [hovered, setHovered] = useState(false)
  const w = BOOK_W
  const h = BOOK_H
  const bg = `linear-gradient(150deg, ${C.light} 0%, ${C.base} 55%, ${C.dark} 100%)`

  return (
    <NovelPreviewPopup novel={{...n, like_count: n.likeCount2}}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor:'pointer', position:'relative' }}
      >
        <BookShell w={w} h={h} bg={bg} hovered={hovered}>
          <DecoFrame w={w} h={h}/>
          {n.cover_url ? (
            /* 画像あり */
            <img src={n.cover_url} alt={n.title}
              style={{width:'100%', height:'100%', objectFit:'cover', display:'block', position:'relative', zIndex:2}}/>
          ) : (
            /* 画像なし */
            <BookCoverText n={n} w={w} h={h}/>
          )}

          {/* ホバー：読者の声 */}
          {hovered && discoverComments.length > 0 && (
            <div style={{
              position:'absolute', inset:0, zIndex:10,
              background:'rgba(42,20,10,0.72)',
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:10, boxSizing:'border-box',
            }}>
              <div style={{
                background:'#FFF9A0',
                borderRadius:5, padding:'8px 10px',
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
        </BookShell>
      </div>
    </NovelPreviewPopup>
  )
}

// 準備中カード（EmptyBook）
function EmptyBook() {
  const [hovered, setHovered] = useState(false)
  const w = BOOK_W
  const h = BOOK_H
  const bg = `linear-gradient(150deg, #9A6A42 0%, #7A4A2A 55%, #4A2A18 100%)`

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor:'default', position:'relative' }}
    >
      <BookShell w={w} h={h} bg={bg} hovered={hovered}>
        <DecoFrame w={w} h={h}/>
        <div style={{
          position:'relative', zIndex:2,
          padding:'16px 14px 12px',
          height:'100%', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'space-between',
          textAlign:'center', boxSizing:'border-box',
        }}>
          {/* 上部装飾 */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:20, height:1, background:C.goldFaint }}/>
            <div style={{ width:12, height:1, background:C.goldFaint, opacity:0.5 }}/>
          </div>

          {/* 中央：羽アイコン */}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"
                fill="none" stroke={C.goldFaint} strokeWidth="1.2"/>
              <line x1="16" y1="8" x2="2" y2="22" stroke={C.goldFaint} strokeWidth="1"/>
              <line x1="17.5" y1="15" x2="9" y2="15" stroke={C.goldFaint} strokeWidth="0.8"/>
            </svg>
          </div>

          {/* 下部：準備中ラベル（極小・目立たせない） */}
          <span style={{
            fontSize: 9, opacity: 0.4,
            color: C.textSub,
            background: 'rgba(255,247,237,0.08)',
            border: '1px solid rgba(255,247,237,0.15)',
            padding: '1px 6px', borderRadius: 8,
            letterSpacing: '0.06em',
          }}>coming soon</span>
        </div>
      </BookShell>
    </div>
  )
}

// ユーザーの推しカード（特別な推薦本）
function IntroBlock() {
  const [hovered, setHovered] = useState(false)
  const w = 160
  const h = BOOK_H
  const bg = `linear-gradient(150deg, #B9824A 0%, #8B5A35 45%, #5A3420 100%)`

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor:'pointer', position:'relative' }}
    >
      <BookShell w={w} h={h} bg={bg} hovered={hovered}>
        <DecoFrame w={w} h={h}/>
        <div style={{
          position:'relative', zIndex:2,
          padding:'18px 16px 14px',
          height:'100%', display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'space-between',
          textAlign:'center', boxSizing:'border-box',
        }}>
          {/* 上部：PICK */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
            <span style={{
              fontSize:8, fontWeight:700, letterSpacing:'0.12em',
              color:C.gold, opacity:0.9,
            }}>✦ PICK ✦</span>
            <div style={{ width:28, height:1, background:C.goldFaint }}/>
          </div>

          {/* 中央：タイトル + 説明 */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 0' }}>
            <div style={{
              fontSize:15, fontWeight:700,
              color:C.text,
              fontFamily:"'Noto Serif JP',serif",
              textShadow:`0 1px 4px rgba(0,0,0,0.5)`,
              lineHeight:1.5,
            }}>ユーザーの推し</div>
            <div style={{ width:20, height:1, background:C.goldFaint, opacity:0.7 }}/>
            <div style={{
              fontSize:9.5, color:C.textSub, opacity:0.82,
              lineHeight:1.65,
            }}>読者が見つけた、{'\n'}まだ知られていない物語</div>
          </div>

          {/* 下部：ボタン */}
          <a href="/search" style={{
            display:'inline-block',
            fontSize:9, fontWeight:700,
            color:C.gold,
            border:`1px solid ${C.goldFaint}`,
            borderRadius:12,
            padding:'5px 12px',
            textDecoration:'none',
            letterSpacing:'0.04em',
            background:'rgba(214,168,90,0.12)',
            transition:'background .15s',
          }}>作品を検索する</a>
        </div>
      </BookShell>
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
      <div className="gem-desktop" style={{flex:1, overflow:'hidden', position:'relative', paddingBottom:52}}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        <div ref={trackRef} style={{
          display:'flex', gap:GAP, paddingTop:20, paddingBottom:16,
          alignItems:'flex-end', width:'max-content', willChange:'transform',
        }}>
          {loopList.map((item, i) => {
            const setLen = bookList.length
            const isSet1Start = i === 0
            const isSet2Start = i === setLen
            const refProp = isSet1Start ? set1StartRef : isSet2Start ? set2StartRef : undefined

            const el = item === 'INTRO'
              ? <IntroBlock key={`intro-${i}`}/>
              : item
                ? <BookItem key={`${item.id}-${i}`} n={item} discoverComments={discoverCommentMap[item.id]||[]}/>
                : <EmptyBook key={`empty-${i}`}/>

            if (refProp) {
              return <div key={`ref-${i}`} ref={refProp} style={{display:'flex', alignItems:'flex-end'}}>{el}</div>
            }
            return el
          })}
        </div>

        {/* 木製棚板 */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:0,
          height:24,
          background:`linear-gradient(180deg, ${C.shelf1} 0%, ${C.shelf2} 30%, ${C.shelf3} 100%)`,
          borderRadius:'0 0 4px 4px',
          boxShadow:`0 5px 16px rgba(80,45,20,0.28), inset 0 2px 5px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.18)`,
          zIndex:2, overflow:'hidden',
        }}>
          {/* 木目 */}
          <div style={{
            position:'absolute', inset:0,
            background:`repeating-linear-gradient(90deg,
              transparent 0px, transparent 52px,
              rgba(80,45,20,0.06) 52px, rgba(80,45,20,0.06) 53px,
              transparent 53px, transparent 75px,
              rgba(80,45,20,0.04) 75px, rgba(80,45,20,0.04) 75.5px
            )`,
          }}/>
          {/* 上面ハイライト */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:5,
            background:'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 100%)',
          }}/>
        </div>

        {/* 本が棚に落とす影 */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:22,
          height:7,
          background:'rgba(80,45,20,0.18)',
          filter:'blur(3px)',
          zIndex:1,
        }}/>

        {/* ← → ボタン */}
        {([{dir:-1 as const, label:'前へ', pos:{left:8}}, {dir:1 as const, label:'次へ', pos:{right:8}}]).map(({dir,label,pos}) => (
          <button key={dir} onClick={() => jump(dir)} aria-label={label}
            style={{
              position:'absolute', ...pos, top:'40%', transform:'translateY(-50%)',
              width:34, height:34, borderRadius:'50%',
              border:`1px solid rgba(242,106,33,0.25)`,
              background:'rgba(255,255,255,0.94)',
              cursor:'pointer', zIndex:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 3px 10px rgba(64,36,18,0.2)',
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
