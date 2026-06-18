'use client'
import { useState, useEffect, useRef } from 'react'

interface SlideItem {
  id: string
  image_url: string
  link: string | null
  title: string
}

interface Props {
  items: SlideItem[]
}

// 高さは元のまま固定。横幅は16:9比例で算出（156 * 16/9 ≈ 277）
const ITEM_H = 156
const ITEM_W = Math.round(ITEM_H * 16 / 9)
const GAP = 8

const M_ITEM_H = 78
const M_ITEM_W = Math.round(M_ITEM_H * 16 / 9)
const M_GAP = 4

export default function HeroSlider({ items }: Props) {
  // ===== 無限ループ用：先頭と末尾に複製を追加（複数枚表示でも自然にループさせるため、見えている枚数分複製） =====
  const CLONE_COUNT = Math.min(items.length, 4)
  const loopItems = items.length > 1
    ? [...items.slice(-CLONE_COUNT), ...items, ...items.slice(0, CLONE_COUNT)]
    : items
  const startIndex = items.length > 1 ? CLONE_COUNT : 0

  const [index, setIndex] = useState(startIndex)
  const [withTransition, setWithTransition] = useState(true)
  const [containerW, setContainerW] = useState(0)
  const [mContainerW, setMContainerW] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mContainerRef = useRef<HTMLDivElement>(null)

  const isLooping = items.length > 1

  useEffect(() => {
    function measure() {
      if (containerRef.current) setContainerW(containerRef.current.offsetWidth)
      if (mContainerRef.current) setMContainerW(mContainerRef.current.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  function goTo(i: number, transition = true) {
    setWithTransition(transition)
    setIndex(i)
  }
  function next() { goTo(index + 1) }
  function prev() { goTo(index - 1) }

  const realIndex = isLooping
    ? ((index - startIndex) % items.length + items.length) % items.length
    : index

  function startTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    // 自動再生は停止。手動でのスライド（矢印ボタン・ドット）のみ有効。
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // ===== 無限ループのジャンプ処理 =====
  function handleTransitionEnd() {
    if (!isLooping) return
    if (index < CLONE_COUNT) {
      goTo(index + items.length, false)
    } else if (index >= CLONE_COUNT + items.length) {
      goTo(index - items.length, false)
    }
  }

  useEffect(() => {
    if (!withTransition) {
      const id = requestAnimationFrame(() => setWithTransition(true))
      return () => cancelAnimationFrame(id)
    }
  }, [withTransition])

  if (items.length === 0) return null

  const SlideImage = ({ item, w, h }: { item: SlideItem; w: number; h: number }) => {
    const content = (
      <div style={{width:w,height:h,overflow:'hidden',borderRadius:8,flexShrink:0}}>
        <img src={item.image_url} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      </div>
    )
    if (item.link) {
      return (
        <a href={item.link} target={item.link?.startsWith('/')?'_self':'_blank'} rel="noopener noreferrer" style={{display:'block',flexShrink:0}}>
          {content}
        </a>
      )
    }
    return content
  }

  return (
    <div style={{position:'relative',width:'100%'}}>
      {/* デスクトップ */}
      <div ref={containerRef} className="slider-desktop" style={{overflow:'hidden'}}>
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            display:'flex', gap:GAP,
            transition: withTransition ? 'transform 0.45s cubic-bezier(.4,0,.2,1)' : 'none',
            transform: `translateX(calc(-${index} * (${ITEM_W}px + ${GAP}px)))`,
          }}>
          {loopItems.map((item, i) => <SlideImage key={`${item.id}-${i}`} item={item} w={ITEM_W} h={ITEM_H}/>)}
        </div>
      </div>

      {/* モバイル */}
      <div ref={mContainerRef} className="slider-mobile" style={{display:'none',overflow:'hidden',borderRadius:6}}>
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            display:'flex', gap:M_GAP,
            transition: withTransition ? 'transform 0.45s cubic-bezier(.4,0,.2,1)' : 'none',
            transform: `translateX(calc(-${index} * (${M_ITEM_W}px + ${M_GAP}px)))`,
          }}>
          {loopItems.map((item, i) => <SlideImage key={`m-${item.id}-${i}`} item={item} w={M_ITEM_W} h={M_ITEM_H}/>)}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button onClick={prev} aria-label="前へ"
            style={{
              position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
              background:'rgba(255,255,255,0.95)', border:'1px solid rgba(242,106,33,0.25)',
              borderRadius:'50%', width:44, height:44, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(0,0,0,0.18)', zIndex:2,
              transition:'background .15s ease, transform .15s ease',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='#F26A21';e.currentTarget.style.transform='translateY(-50%) scale(1.08)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.transform='translateY(-50%) scale(1)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#2B211B'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'#2B211B'}} className="hero-arrow-icon">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button onClick={next} aria-label="次へ"
            style={{
              position:'absolute', right:16, top:'50%', transform:'translateY(-50%)',
              background:'rgba(255,255,255,0.95)', border:'1px solid rgba(242,106,33,0.25)',
              borderRadius:'50%', width:44, height:44, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(0,0,0,0.18)', zIndex:2,
              transition:'background .15s ease, transform .15s ease',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='#F26A21';e.currentTarget.style.transform='translateY(-50%) scale(1.08)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.transform='translateY(-50%) scale(1)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#2B211B'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'#2B211B'}} className="hero-arrow-icon">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <div style={{display:'flex',justifyContent:'center',gap:5,marginTop:6}}>
            {items.map((_, i) => (
              <button key={i} onClick={()=>goTo(startIndex + i)} style={{width:i===realIndex?16:6,height:6,borderRadius:3,border:'none',cursor:'pointer',background:i===realIndex?'#F26A21':'#F0D9C9',transition:'all .3s',padding:0}}/>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
