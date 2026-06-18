'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface SlideItem {
  id: string
  image_url: string
  link: string | null
  title: string
}

interface Props {
  items: SlideItem[]
}

export default function HeroSlider({ items }: Props) {
  // ===== 無限ループ用：先頭に最後の複製、末尾に最初の複製を追加 =====
  const loopItems = items.length > 1 ? [items[items.length - 1], ...items, items[0]] : items
  const startIndex = items.length > 1 ? 1 : 0

  const [index, setIndex] = useState(startIndex)
  const [withTransition, setWithTransition] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const isLooping = items.length > 1

  function goTo(i: number, transition = true) {
    setWithTransition(transition)
    setIndex(i)
  }

  function next() {
    goTo(index + 1)
  }
  function prev() {
    goTo(index - 1)
  }

  // 実スライドのインデックス（ドット表示用）
  const realIndex = isLooping
    ? (index - 1 + items.length) % items.length
    : index

  function startTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (items.length <= 1) return
    timerRef.current = setTimeout(() => { next() }, 3500)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [index])

  // ===== 無限ループのジャンプ処理：トランジション終了後にクローン位置から本物の位置へ瞬間移動 =====
  function handleTransitionEnd() {
    if (!isLooping) return
    if (index === 0) {
      // 先頭クローン（=最後の画像）に到達 → 本物の最後の位置へ瞬間ジャンプ
      goTo(items.length, false)
    } else if (index === loopItems.length - 1) {
      // 末尾クローン（=最初の画像）に到達 → 本物の最初の位置へ瞬間ジャンプ
      goTo(1, false)
    }
  }

  // withTransition=falseでジャンプした直後、次のフレームでtransitionを再度有効化
  useEffect(() => {
    if (!withTransition) {
      const id = requestAnimationFrame(() => setWithTransition(true))
      return () => cancelAnimationFrame(id)
    }
  }, [withTransition])

  if (items.length === 0) return null

  const SlideImage = ({ item }: { item: SlideItem }) => {
    const content = (
      <div style={{width:'100%',aspectRatio:'16/9',overflow:'hidden',borderRadius:8,flexShrink:0}}>
        <img src={item.image_url} alt={item.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      </div>
    )
    if (item.link) {
      return (
        <a href={item.link} target={item.link?.startsWith('/')?'_self':'_blank'} rel="noopener noreferrer"
          style={{display:'block',width:'100%',flexShrink:0}}>
          {content}
        </a>
      )
    }
    return <div style={{width:'100%',flexShrink:0}}>{content}</div>
  }

  return (
    <div style={{position:'relative',width:'100%'}}>
      <div style={{overflow:'hidden',borderRadius:8,width:'100%'}}>
        <div
          ref={trackRef}
          onTransitionEnd={handleTransitionEnd}
          style={{
            display:'flex', width:'100%',
            transition: withTransition ? 'transform 0.45s cubic-bezier(.4,0,.2,1)' : 'none',
            transform: `translateX(-${index * 100}%)`,
          }}>
          {loopItems.map((item, i) => (
            <div key={`${item.id}-${i}`} style={{width:'100%',flexShrink:0}}>
              <SlideImage item={item}/>
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button onClick={prev} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:18,fontWeight:700,color:'#2B211B',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2}}>‹</button>
          <button onClick={next} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.9)',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:18,fontWeight:700,color:'#2B211B',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:2}}>›</button>

          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:10}}>
            {items.map((_, i) => (
              <button key={i} onClick={()=>goTo(i+1)}
                style={{width:i===realIndex?18:7,height:7,borderRadius:4,border:'none',cursor:'pointer',background:i===realIndex?'#F26A21':'#F0D9C9',transition:'all .3s',padding:0}}/>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
