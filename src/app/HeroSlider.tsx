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

export default function HeroSlider({ items }: Props) {
  const [offset, setOffset] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const itemH = isMobile ? Math.round(ITEM_H / 5) : ITEM_H
  const itemW = isMobile ? Math.round(ITEM_W / 5) : ITEM_W
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const max = Math.max(0, items.length - 2)

  function next() { setOffset(prev => prev >= max ? 0 : prev + 1) }
  function prev() { setOffset(prev => prev <= 0 ? max : prev - 1) }

  function startTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (items.length <= 1) return
    timerRef.current = setTimeout(() => {
      setOffset(prev => {
        if (prev >= max) {
          // 最後まで来たら2秒後に先頭へ
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
  }, [offset, items.length, max])

  if (items.length === 0) return null

  return (
    <div style={{position:'relative'}}>
      <div style={{overflow:'hidden',borderRadius:8}}>
        <div style={{
          display:'flex',
          gap:GAP,
          transition:'transform 0.4s cubic-bezier(.4,0,.2,1)',
          transform:`translateX(calc(-${offset} * (${itemW}px + ${GAP}px)))`,
        }}>
          {items.map(item => (
            <div key={item.id} style={{flexShrink:0,width:ITEM_W,height:itemH,borderRadius:6,overflow:'hidden'}}>
              {item.link ? (
                <a href={item.link} target={item.link?.startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer" style={{display:'block',width:'100%',height:'100%'}}>
                  <img src={item.image_url} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                </a>
              ) : (
                <img src={item.image_url} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
              )}
            </div>
          ))}
        </div>
      </div>

      <button onClick={prev} style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:16,fontWeight:700,color:'#2B211B',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2}}>‹</button>
      <button onClick={next} style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:16,fontWeight:700,color:'#2B211B',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2}}>›</button>

      {items.length > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:5,marginTop:6}}>
          {Array.from({length: max + 1}, (_, i) => (
            <button key={i} onClick={()=>setOffset(i)} style={{width:i===offset?16:6,height:6,borderRadius:3,border:'none',cursor:'pointer',background:i===offset?'#F26A21':'#F0D9C9',transition:'all .3s',padding:0}}/>
          ))}
        </div>
      )}
    </div>
  )
}
