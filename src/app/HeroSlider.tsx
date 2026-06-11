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

const ITEM_H = 156   // px（元120px × 1.3倍）
const ITEM_W = 312   // px（高さの2倍）
const GAP = 8

export default function HeroSlider({ items }: Props) {
  const [offset, setOffset] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const max = Math.max(0, items.length - 2)

  function next() { setOffset(prev => Math.min(prev + 1, max)) }
  function prev() { setOffset(prev => Math.max(prev - 1, 0)) }

  // 自動スライド：端まで来たら止まる
  useEffect(() => {
    if (items.length <= 1) return
    timerRef.current = setInterval(() => {
      setOffset(prev => {
        if (prev >= max) {
          clearInterval(timerRef.current!)
          return prev
        }
        return prev + 1
      })
    }, 3500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [items.length, max])

  if (items.length === 0) return null

  return (
    <div style={{position:'relative'}}>
      <div style={{overflow:'hidden',borderRadius:8}}>
        <div style={{
          display:'flex',
          gap:GAP,
          transition:'transform 0.4s cubic-bezier(.4,0,.2,1)',
          transform:`translateX(calc(-${offset} * (${ITEM_W}px + ${GAP}px)))`,
        }}>
          {items.map(item => (
            <div key={item.id} style={{
              flexShrink:0,
              width:ITEM_W,
              height:ITEM_H,
              borderRadius:6,
              overflow:'hidden',
            }}>
              {item.link ? (
                <a href={item.link} target={item.link?.startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer" style={{display:'block',width:'100%',height:'100%'}}>
                  <img src={item.image_url} alt={item.title}
                    style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
                </a>
              ) : (
                <img src={item.image_url} alt={item.title}
                  style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 左矢印：先頭より後ろのときのみ表示 */}
      {offset > 0 && (
        <button onClick={prev} style={{
          position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',
          background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',
          width:28,height:28,cursor:'pointer',fontSize:16,fontWeight:700,color:'#2B211B',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2,
        }}>‹</button>
      )}

      {/* 右矢印：最後の画像より前のときのみ表示 */}
      {offset < max && (
        <button onClick={next} style={{
          position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',
          background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',
          width:28,height:28,cursor:'pointer',fontSize:16,fontWeight:700,color:'#2B211B',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2,
        }}>›</button>
      )}
    </div>
  )
}
