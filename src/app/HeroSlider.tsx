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

// 高さは固定。横幅は16:9比例で算出
const ITEM_H = 156
const ITEM_RATIO_W = ITEM_H * 16 / 9
const GAP = 8

const M_ITEM_H = 78
const M_ITEM_RATIO_W = M_ITEM_H * 16 / 9
const M_GAP = 4

// 中央に完全に見える枚数。左右にそれぞれ半枚分が見切れる（合計 VISIBLE_COUNT+1 枚分の幅）
const VISIBLE_COUNT = 5

export default function HeroSlider({ items }: Props) {
  const CLONE_COUNT = Math.min(items.length, 4)
  const loopItems = items.length > 1
    ? [...items.slice(-CLONE_COUNT), ...items, ...items.slice(0, CLONE_COUNT)]
    : items
  const startIndex = items.length > 1 ? CLONE_COUNT : 0

  const [index, setIndex] = useState(startIndex)
  const [withTransition, setWithTransition] = useState(true)
  const [containerW, setContainerW] = useState(0)
  const [mContainerW, setMContainerW] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const mContainerRef = useRef<HTMLDivElement>(null)
  const isAnimatingRef = useRef(false)

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

  // コンテナ幅から「中央5枚+左右半枚分」が収まる1枚あたりの幅を算出
  // 表示幅 = itemW*(VISIBLE_COUNT+1) + gap*VISIBLE_COUNT  を containerW に合わせる
  function computeItemWidth(cw: number, gap: number) {
    if (cw <= 0) return ITEM_RATIO_W
    const w = (cw - gap * VISIBLE_COUNT) / (VISIBLE_COUNT + 1)
    return Math.max(60, w)
  }
  const itemW  = computeItemWidth(containerW, GAP)
  const itemH  = itemW * 9 / 16
  const mItemW = computeItemWidth(mContainerW, M_GAP)
  const mItemH = mItemW * 9 / 16

  // 左右半枚分が見切れるよう、初期スクロール位置を「半枚分」左にずらす
  const halfItem  = itemW / 2 + GAP / 2
  const mHalfItem = mItemW / 2 + M_GAP / 2

  function goTo(i: number, transition = true) {
    if (transition && isAnimatingRef.current) return
    if (transition) {
      isAnimatingRef.current = true
      setTimeout(() => { isAnimatingRef.current = false }, 600) // 保険：transitionend取り損ねた場合の解除
    }
    setWithTransition(transition)
    setIndex(i)
  }
  function next() { goTo(index + 1) }
  function prev() { goTo(index - 1) }

  const realIndex = isLooping
    ? ((index - startIndex) % items.length + items.length) % items.length
    : index

  // ===== 無限ループのジャンプ処理 =====
  function handleTransitionEnd() {
    isAnimatingRef.current = false
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
      {/* デスクトップ：中央VISIBLE_COUNT枚＋左右半枚分が見切れる */}
      <div ref={containerRef} className="slider-desktop" style={{overflow:'hidden'}}>
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            display:'flex', gap:GAP,
            transition: withTransition ? 'transform 0.45s cubic-bezier(.4,0,.2,1)' : 'none',
            transform: `translateX(calc(${-index} * (${itemW}px + ${GAP}px) + ${halfItem}px))`,
          }}>
          {loopItems.map((item, i) => <SlideImage key={`${item.id}-${i}`} item={item} w={itemW} h={itemH}/>)}
        </div>
      </div>

      {/* モバイル */}
      <div ref={mContainerRef} className="slider-mobile" style={{display:'none',overflow:'hidden'}}>
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            display:'flex', gap:M_GAP,
            transition: withTransition ? 'transform 0.45s cubic-bezier(.4,0,.2,1)' : 'none',
            transform: `translateX(calc(${-index} * (${mItemW}px + ${M_GAP}px) + ${mHalfItem}px))`,
          }}>
          {loopItems.map((item, i) => <SlideImage key={`m-${item.id}-${i}`} item={item} w={mItemW} h={mItemH}/>)}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button onClick={prev} aria-label="前へ"
            style={{
              position:'absolute', left:'8%', top:'50%', transform:'translateY(-50%)',
              background:'rgba(255,255,255,0.95)', border:'1px solid rgba(242,106,33,0.25)',
              borderRadius:'50%', width:44, height:44, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(0,0,0,0.18)', zIndex:2,
              transition:'background .15s ease, transform .15s ease',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='#F26A21';e.currentTarget.style.transform='translateY(-50%) scale(1.08)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.transform='translateY(-50%) scale(1)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#2B211B'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'#2B211B'}}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button onClick={next} aria-label="次へ"
            style={{
              position:'absolute', right:'8%', top:'50%', transform:'translateY(-50%)',
              background:'rgba(255,255,255,0.95)', border:'1px solid rgba(242,106,33,0.25)',
              borderRadius:'50%', width:44, height:44, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(0,0,0,0.18)', zIndex:2,
              transition:'background .15s ease, transform .15s ease',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='#F26A21';e.currentTarget.style.transform='translateY(-50%) scale(1.08)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.transform='translateY(-50%) scale(1)';const svg=e.currentTarget.querySelector('svg') as SVGElement;if(svg)svg.style.color='#2B211B'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color:'#2B211B'}}>
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
