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

// ジャンルごとの背表紙カラー
const GENRE_SPINE: Record<string, { base: string; dark: string; light: string; gold: string }> = {
  '異世界':   { base:'#5B4A8A', dark:'#3D3060', light:'#7B6AAA', gold:'rgba(200,170,255,0.7)' },
  'ファンタジー':{ base:'#4A7A9B', dark:'#2E5570', light:'#6A9ABB', gold:'rgba(170,220,255,0.7)' },
  'SF':       { base:'#2A6A7A', dark:'#1A4A58', light:'#4A8A9A', gold:'rgba(150,230,240,0.7)' },
  '恋愛':     { base:'#9A4060', dark:'#6A2040', light:'#BA6080', gold:'rgba(255,180,200,0.7)' },
  '学園':     { base:'#B86020', dark:'#884010', light:'#D88040', gold:'rgba(255,210,150,0.7)' },
  'ミステリー':{ base:'#3A5A3A', dark:'#254025', light:'#5A7A5A', gold:'rgba(160,220,160,0.7)' },
  'ホラー':   { base:'#5A2020', dark:'#3A1010', light:'#7A4040', gold:'rgba(220,150,150,0.7)' },
  '歴史・時代':{ base:'#7A5A10', dark:'#503A00', light:'#9A7A30', gold:'rgba(240,210,130,0.7)' },
  '日常':     { base:'#4A7A5A', dark:'#2A5A3A', light:'#6A9A7A', gold:'rgba(170,230,190,0.7)' },
  'アクション':{ base:'#7A3A10', dark:'#502000', light:'#9A5A30', gold:'rgba(240,180,130,0.7)' },
  'コメディ': { base:'#A06010', dark:'#704000', light:'#C08030', gold:'rgba(255,220,130,0.7)' },
  'その他':   { base:'#5A5A6A', dark:'#3A3A4A', light:'#7A7A8A', gold:'rgba(200,200,220,0.7)' },
}

function getSpine(genre: string) {
  return GENRE_SPINE[genre] || { base:'#6B4A28', dark:'#4A3010', light:'#8B6A48', gold:'rgba(255,215,150,0.7)' }
}

function BookItem({ n, discoverComments }: {
  n: Novel
  discoverComments: {comment:string;display_name:string}[]
}) {
  const [hover, setHover] = useState(false)
  const sp = getSpine(n.genre)

  return (
    <NovelPreviewPopup novel={{...n, like_count: n.likeCount2}}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          flex: hover ? '0 0 160px' : '0 0 44px',
          minWidth: hover ? 160 : 44,
          maxWidth: hover ? 160 : 44,
          height: 200,
          cursor: 'pointer',
          transition: 'flex .35s cubic-bezier(.4,0,.2,1), min-width .35s, max-width .35s',
          perspective: 1200,
          zIndex: hover ? 5 : 1,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: 'left center' }}>

          {/* ===== 背表紙 ===== */}
          <div style={{
            position: 'absolute', inset: 0,
            transformOrigin: 'left center',
            borderRadius: '2px 5px 5px 2px',
            background: `linear-gradient(90deg,
              ${sp.dark} 0%,
              ${sp.base} 8%,
              ${sp.light} 35%,
              ${sp.base} 65%,
              ${sp.dark} 100%)`,
            boxShadow: `inset 4px 0 8px rgba(0,0,0,0.4), inset -1px 0 3px rgba(255,255,255,0.08), 3px 0 10px rgba(0,0,0,0.3)`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0',
            opacity: hover ? 0 : 1,
            transform: hover ? 'rotateY(-95deg)' : 'rotateY(0deg)',
            transition: 'opacity .18s ease, transform .35s ease',
            backfaceVisibility: 'hidden',
            overflow: 'hidden',
          }}>
            {/* 上下の金線装飾 */}
            {[0,1].map(j => (
              <div key={j} style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'center', width:'100%' }}>
                <div style={{ width:'70%', height:1, background: sp.gold }}/>
                <div style={{ width:'45%', height:1, background: sp.gold, opacity:0.5 }}/>
              </div>
            ))}
            {/* タイトルラベル */}
            <div style={{
              border: `1px solid ${sp.gold}`,
              borderRadius: 3,
              padding: '8px 5px',
              background: 'rgba(0,0,0,0.12)',
              flex: 1, display:'flex', alignItems:'center', justifyContent:'center',
              margin: '4px 0', maxHeight: 130,
            }}>
              <div style={{
                writingMode: 'vertical-rl' as any,
                fontSize: 11, fontWeight: 700,
                color: 'rgba(255,255,255,0.93)',
                letterSpacing: '0.06em',
                lineHeight: 1.6,
                maxHeight: 120, overflow: 'hidden',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                fontFamily: "'Noto Serif JP',serif",
              }}>
                {n.title.length > 11 ? n.title.slice(0, 11) + '…' : n.title}
              </div>
            </div>
          </div>

          {/* ===== 小口（ページの断面） ===== */}
          <div style={{
            position: 'absolute', top: 4, bottom: 4, right: hover ? -8 : -2, width: 8,
            background: 'repeating-linear-gradient(180deg, #f8f0e4 0px, #f8f0e4 1.5px, #e8dcc8 1.5px, #e8dcc8 3px)',
            borderRadius: '0 3px 3px 0',
            boxShadow: '2px 0 4px rgba(0,0,0,0.18)',
            opacity: hover ? 1 : 0,
            transition: 'opacity .2s ease .1s',
            zIndex: 1,
          }}/>

          {/* ===== 表紙（ホバー時） ===== */}
          <div style={{
            position: 'absolute', inset: 0,
            transformOrigin: 'left center',
            background: n.cover_url
              ? `#e8dcc8`
              : `linear-gradient(150deg, ${sp.light} 0%, ${sp.base} 50%, ${sp.dark} 100%)`,
            border: `1.5px solid ${sp.dark}`,
            borderRadius: '2px 7px 7px 2px',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: hover ? `6px 6px 20px rgba(0,0,0,0.35), inset -4px 0 8px rgba(0,0,0,0.2)` : 'none',
            opacity: hover ? 1 : 0,
            transform: hover ? 'rotateY(0deg)' : 'rotateY(100deg)',
            transition: 'opacity .2s ease .12s, transform .35s ease',
            backfaceVisibility: 'hidden',
          }}>
            {/* 表紙画像あり */}
            {n.cover_url && (
              <img src={n.cover_url} alt={n.title}
                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
            )}

            {/* 表紙画像なし → デザイン表紙 */}
            {!n.cover_url && (<>
              {/* 光沢 */}
              <div style={{
                position:'absolute', inset:0,
                background: `radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)`,
                pointerEvents:'none',
              }}/>
              {/* 装飾二重枠 */}
              <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}} viewBox="0 0 160 200" preserveAspectRatio="none">
                <rect x="7" y="7" width="146" height="186" rx="3"
                  fill="none" stroke={sp.gold} strokeWidth="1.2"/>
                <rect x="12" y="12" width="136" height="176" rx="2"
                  fill="none" stroke={sp.gold} strokeWidth="0.7" opacity="0.5"/>
                {/* 上下のアーチ装飾 */}
                <path d={`M 18 22 Q 80 14 142 22`} fill="none" stroke={sp.gold} strokeWidth="0.8" opacity="0.7"/>
                <path d={`M 18 178 Q 80 186 142 178`} fill="none" stroke={sp.gold} strokeWidth="0.8" opacity="0.7"/>
              </svg>

              <div style={{
                position:'relative', zIndex:1,
                padding:'18px 14px 12px',
                height:'100%', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'space-between',
                textAlign:'center', boxSizing:'border-box',
              }}>
                {/* ジャンルバッジ */}
                <span style={{
                  fontSize:8, color:'rgba(255,255,255,0.9)',
                  background:'rgba(255,255,255,0.15)',
                  border:`1px solid ${sp.gold}`,
                  padding:'2px 8px', borderRadius:3,
                  letterSpacing:'0.08em', fontWeight:700,
                }}>{n.genre}</span>

                {/* タイトル */}
                <div style={{
                  flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'10px 0',
                }}>
                  <div style={{
                    fontSize:13, fontWeight:700,
                    color:'rgba(255,255,255,0.96)',
                    lineHeight:1.55,
                    fontFamily:"'Noto Serif JP',serif",
                    textShadow:`0 1px 4px rgba(0,0,0,0.5)`,
                    overflow:'hidden',
                    display:'-webkit-box',
                    WebkitLineClamp:4,
                    WebkitBoxOrient:'vertical' as any,
                  }}>{n.title}</div>
                </div>

                {/* 区切り線 */}
                <div style={{ width:32, height:1, background:sp.gold, marginBottom:8, opacity:0.8 }}/>

                {/* 作者名 */}
                <div style={{
                  fontSize:9, color:'rgba(255,255,255,0.8)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%',
                }}>{n.display_name}</div>
              </div>
            </>)}

            {/* 綴じ目の影 */}
            <div style={{
              position:'absolute', left:0, top:0, bottom:0, width:10,
              background:'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
              pointerEvents:'none',
            }}/>
          </div>

          {/* 帯（読者の声） - 表紙展開時の下部 */}
          {hover && (
            <div style={{
              position:'absolute', bottom:0, left:0, right:0,
              background:'rgba(255,255,255,0.97)',
              borderTop:`2px solid ${sp.dark}`,
              borderRadius:'0 0 7px 0',
              zIndex:6,
              opacity: hover ? 1 : 0,
              transition:'opacity .2s ease .15s',
            }}>
              <GemComment novelId={n.id} discoverCount={n.discoverCount} likeCount={n.likeCount2} discoverComments={discoverComments}/>
            </div>
          )}
        </div>
      </div>
    </NovelPreviewPopup>
  )
}

function EmptyBook() {
  return (
    <div style={{
      flex: '0 0 44px', minWidth:44, maxWidth:44, height:200,
      borderRadius:'2px 5px 5px 2px',
      background:`linear-gradient(90deg, #a09080 0%, #b8a898 10%, #ccc0b0 50%, #b8a898 90%, #a09080 100%)`,
      boxShadow:`inset 4px 0 8px rgba(0,0,0,0.25), inset -1px 0 3px rgba(255,255,255,0.1), 3px 0 8px rgba(0,0,0,0.2)`,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'space-between', padding:'12px 0',
      flexShrink:0,
    }}>
      {[0,1].map(j => (
        <div key={j} style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'center', width:'100%' }}>
          <div style={{ width:'65%', height:1, background:'rgba(255,255,255,0.5)' }}/>
          <div style={{ width:'40%', height:1, background:'rgba(255,255,255,0.3)' }}/>
        </div>
      ))}
      <div style={{
        border:'1px solid rgba(255,255,255,0.35)', borderRadius:3,
        padding:'8px 5px', background:'rgba(0,0,0,0.08)',
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        margin:'4px 0', maxHeight:130,
      }}>
        <div style={{
          writingMode:'vertical-rl' as any, fontSize:10, fontWeight:600,
          color:'rgba(255,255,255,0.6)', letterSpacing:'0.1em',
          fontFamily:"'Noto Serif JP',serif",
        }}>準　備　中</div>
      </div>
    </div>
  )
}

function IntroBlock() {
  return (
    <div style={{
      flex:'0 0 210px', minWidth:210, maxWidth:210, height:200,
      background:'var(--color-bg-card)',
      border:`1.5px dashed var(--color-brand-border)`,
      borderRadius:8,
      display:'flex', flexDirection:'column', justifyContent:'center',
      padding:'0 22px', boxSizing:'border-box',
      flexShrink:0,
    }}>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--color-text)',marginBottom:8,fontFamily:"'Noto Serif JP',serif"}}>
        ユーザーの推し
      </h2>
      <p style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:14,lineHeight:1.7}}>
        推しの作品を拡散しよう！
      </p>
      <a href="/search" style={{
        display:'inline-block', fontSize:11, color:'var(--color-brand)',
        border:'1.5px solid var(--color-brand)', borderRadius:14,
        padding:'6px 14px', textDecoration:'none', fontWeight:600, width:'fit-content',
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
    const STEP = 200
    offsetRef.current += dir * STEP
    while (offsetRef.current < 0) offsetRef.current += oneSetWidthRef.current
    while (offsetRef.current >= oneSetWidthRef.current) offsetRef.current -= oneSetWidthRef.current
    trackRef.current.style.transition = 'transform .35s ease'
    trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`
    setTimeout(() => { if (trackRef.current) trackRef.current.style.transition = 'none' }, 360)
  }

  return (
    <>
      {/* デスクトップ */}
      <div className="gem-desktop" style={{flex:1, overflow:'hidden', position:'relative'}}
        onMouseEnter={() => { pausedRef.current = true }}
        onMouseLeave={() => { pausedRef.current = false }}
      >
        {/* 本のトラック */}
        <div ref={trackRef} style={{
          display:'flex', gap:3, paddingBottom:28, paddingTop:16,
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

        {/* 木製棚板（厚みあり・立体的） */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:0,
          height:26,
          background:'linear-gradient(180deg, #f0d080 0%, #d4a040 20%, #b07820 60%, #8a5810 100%)',
          borderRadius:'0 0 4px 4px',
          boxShadow:'0 6px 16px rgba(0,0,0,0.35), inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.2)',
          zIndex:2,
          overflow:'hidden',
        }}>
          {/* 木目 */}
          <div style={{
            position:'absolute', inset:0,
            background:`
              repeating-linear-gradient(90deg,
                transparent 0px, transparent 60px,
                rgba(0,0,0,0.06) 60px, rgba(0,0,0,0.06) 61px,
                transparent 61px, transparent 80px,
                rgba(0,0,0,0.04) 80px, rgba(0,0,0,0.04) 80.5px
              )`,
          }}/>
          {/* 棚の上面ハイライト */}
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:5,
            background:'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
          }}/>
        </div>

        {/* 棚の影（本が棚に落とす影） */}
        <div style={{
          position:'absolute', left:0, right:0, bottom:24,
          height:6,
          background:'rgba(0,0,0,0.18)',
          filter:'blur(3px)',
          zIndex:1,
        }}/>

        {/* ← → ボタン */}
        {([{dir:-1 as const, label:'前へ', style:{left:8}}, {dir:1 as const, label:'次へ', style:{right:8}}]).map(({dir,label,style}) => (
          <button key={dir} onClick={() => jump(dir)} aria-label={label}
            style={{
              position:'absolute', ...style, top:'38%', transform:'translateY(-50%)',
              width:34, height:34, borderRadius:'50%',
              border:'1px solid rgba(0,0,0,0.12)',
              background:'rgba(255,255,255,0.94)',
              cursor:'pointer', zIndex:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 3px 10px rgba(0,0,0,0.18)',
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
