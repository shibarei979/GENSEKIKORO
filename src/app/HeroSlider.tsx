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

const ITEM_H = 156
const ITEM_W = 312
const GAP = 8

const M_ITEM_W = 156
const M_ITEM_H = 78
const M_GAP = 4

export default function HeroSlider({ items }: Props) {
  const [offset, setOffset] = useState(0)
  const [max, setMax] = useState(0)
  const [mMax, setMMax] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const mContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function calcMax() {
      // デスクトップ
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        const totalW = items.length * (ITEM_W + GAP) - GAP
        setMax(Math.max(0, Math.floor((totalW - w) / (ITEM_W + GAP))))
      }
      // モバイル
      if (mContainerRef.current) {
        const w = mContainerRef.current.offsetWidth
        const totalW = items.length * (M_ITEM_W + M_GAP) - M_GAP
        setMMax(Math.max(0, Math.floor((totalW - w) / (M_ITEM_W + M_GAP))))
      }
    }
    calcMax()
    window.addEventListener('resize', calcMax)
    return () => window.removeEventListener('resize', calcMax)
  }, [items.length])

  // 現在の環境がモバイルかどうかで使うmaxを決める
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const currentMax = isMobile ? mMax : max

  function next() { setOffset(prev => prev >= currentMax ? 0 : prev + 1) }
  function prev() { setOffset(prev => prev <= 0 ? currentMax : prev - 1) }

  function startTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (items.length <= 1) return
    timerRef.current = setTimeout(() => {
      setOffset(prev => {
        if (prev >= currentMax) {
          setTimeout(() => setOffset(0), 2000)
          return prev
        }
        return prev + 1
      })
    }, 3500)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [offset, max, mMax])

  if (items.length === 0) return null

  const SlideItem = ({ item, w, h }: { item: SlideItem, w: number, h: number }) => (
    <div style={{flexShrink:0,width:w,height:h,borderRadius:6,overflow:'hidden'}}>
      {item.link ? (
        <a href={item.link} target={item.link?.startsWith('/')?'_self':'_blank'} rel="noopener noreferrer" style={{display:'block',width:'100%',height:'100%'}}>
          <img src={item.image_url} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
        </a>
      ) : (
        <img src={item.image_url} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      )}
    </div>
  )

  return (
    <div style={{position:'relative'}}>
      {/* デスクトップ */}
      <div ref={containerRef} className="slider-desktop" style={{overflow:'hidden',borderRadius:8}}>
        <div style={{
          display:'flex', gap:GAP,
          transition:'transform 0.4s cubic-bezier(.4,0,.2,1)',
          transform:`translateX(calc(-${offset} * (${ITEM_W}px + ${GAP}px)))`,
        }}>
          {items.map(item => <SlideItem key={item.id} item={item} w={ITEM_W} h={ITEM_H}/>)}
        </div>
      </div>

      {/* モバイル */}
      <div ref={mContainerRef} className="slider-mobile" style={{display:'none',overflow:'hidden',borderRadius:6}}>
        <div style={{
          display:'flex', gap:M_GAP,
          transition:'transform 0.4s cubic-bezier(.4,0,.2,1)',
          transform:`translateX(calc(-${offset} * (${M_ITEM_W}px + ${M_GAP}px)))`,
        }}>
          {items.map(item => <SlideItem key={item.id} item={item} w={M_ITEM_W} h={M_ITEM_H}/>)}
        </div>
      </div>

      <button onClick={prev} style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:16,fontWeight:700,color:'#2B211B',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2}}>‹</button>
      <button onClick={next} style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:16,fontWeight:700,color:'#2B211B',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2}}>›</button>

      {items.length > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:5,marginTop:6}}>
          {Array.from({length: currentMax + 1}, (_, i) => (
            <button key={i} onClick={()=>setOffset(i)} style={{width:i===offset?16:6,height:6,borderRadius:3,border:'none',cursor:'pointer',background:i===offset?'#F26A21':'#F0D9C9',transition:'all .3s',padding:0}}/>
          ))}
        </div>
      )}
    </div>
  )
}
