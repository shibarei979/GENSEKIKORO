'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Voice {
  id: string
  text: string
  novelId: string
  episodeId: string | null
  novelTitle: string
}

interface Props {
  voices: Voice[]
}

interface Motion {
  left: number
  top: number
  duration: number
  driftX: number
  driftY: number
}

// 文字数に応じてフォントサイズを調整（短い文は大きく目立たせる）
function sizeFor(text: string) {
  const len = text.length
  if (len <= 8) return 26
  if (len <= 16) return 21
  if (len <= 28) return 17
  return 14
}

function randomMotion(): Motion {
  return {
    left: 10 + Math.random() * 80,
    top: 12 + Math.random() * 72,
    duration: 5.5 + Math.random() * 3.5,
    driftX: -130 + Math.random() * 260,
    driftY: -110 + Math.random() * 40,
  }
}

// 1つの文を表示するボタン。CSSアニメーションが1周し終えるたび(onAnimationEnd)に
// cycleを進めて要素を再マウントし、毎回新しい位置・軌道で浮かび上がるようにする。
// keyで再マウントすることで、ブラウザ側のレイアウト状態を引きずらず、
// 表示位置が飛んだりカーソルに引き寄せられて見えたりする不具合を避ける。
function VoiceItem({ voice, initialDelay, onClick }: { voice: Voice; initialDelay: number; onClick: () => void }) {
  const [cycle, setCycle] = useState(0)
  const motionRef = useRef<Motion>(randomMotion())

  function handleAnimationEnd() {
    motionRef.current = randomMotion()
    setCycle(c => c + 1)
  }

  const motion = motionRef.current

  return (
    <button
      key={cycle}
      onClick={onClick}
      onAnimationEnd={handleAnimationEnd}
      className="voice-float-item"
      style={{
        position:'absolute',
        left:`${motion.left}%`,
        top:`${motion.top}%`,
        fontSize:sizeFor(voice.text),
        color:'rgba(255,255,255,0.92)',
        background:'none', border:'none', cursor:'pointer',
        fontFamily:"'Noto Serif JP',serif",
        whiteSpace:'nowrap',
        maxWidth:'70vw',
        overflow:'hidden',
        textOverflow:'ellipsis',
        textShadow:'0 0 12px rgba(255,255,255,0.4), 0 0 4px rgba(242,106,33,0.3)',
        padding:'4px 8px',
        animationName:'voiceFloat',
        animationDuration:`${motion.duration}s`,
        animationDelay: cycle === 0 ? `${initialDelay}s` : '0s',
        animationIterationCount:1,
        animationFillMode:'forwards',
        animationTimingFunction:'ease-in-out',
        ['--voice-driftx' as any]: `${motion.driftX}px`,
        ['--voice-drifty' as any]: `${motion.driftY}px`,
      } as React.CSSProperties}
    >
      {voice.text.length > 34 ? voice.text.slice(0,34)+'…' : voice.text}
    </button>
  )
}

export default function VoicesFloat({ voices }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const delaysRef = useRef<number[]>([])

  useEffect(() => {
    // 初回表示時の開始タイミングだけランダムにずらす（全部同時に出現しないように）
    delaysRef.current = voices.map(() => Math.random() * 3)
    setMounted(true)
  }, [voices])

  function goToNovel(v: Voice) {
    router.push(`/novel/${v.novelId}`)
  }

  return (
    <div style={{
      position:'relative', width:'100%',
      height:'calc(100vh - 66px)', minHeight:560,
      overflow:'hidden',
      background:'radial-gradient(ellipse at 50% 30%, #3a3a3a 0%, #232323 70%)',
    }}>
      {/* 中央の案内テキスト（うっすら常時表示、文字の邪魔をしすぎない位置） */}
      <div style={{
        position:'absolute', top:24, left:0, right:0, textAlign:'center', zIndex:1,
        pointerEvents:'none',
      }}>
        <div style={{fontSize:13,color:'rgba(255,180,120,0.7)',letterSpacing:'0.08em',marginBottom:4,fontWeight:700}}>VOICES</div>
        <h1 style={{fontSize:18,fontWeight:700,color:'rgba(255,255,255,0.9)',fontFamily:"'Noto Serif JP',serif",marginBottom:4}}>読者の声</h1>
        <p style={{fontSize:11.5,color:'rgba(255,255,255,0.55)'}}>気になる言葉をクリックすると、その作品に出会えます</p>
      </div>

      {voices.length === 0 && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>まだ声が集まっていません</p>
        </div>
      )}

      {mounted && voices.map((v, i) => (
        <VoiceItem key={v.id} voice={v} initialDelay={delaysRef.current[i] ?? 0} onClick={()=>goToNovel(v)}/>
      ))}

      <style>{`
        @keyframes voiceFloat {
          0%   { opacity: 0;    transform: translate(-50%,-50%) translate(0px, 30px) scale(0.85); }
          10%  { opacity: 0.9;  transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 0.2), calc(var(--voice-drifty) * 0.25 + 14px)) scale(1); }
          25%  { opacity: 1;    transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 0.5), calc(var(--voice-drifty) * 0.55)) scale(1.04); }
          55%  { opacity: 0.85; transform: translate(-50%,-50%) translate(var(--voice-driftx), var(--voice-drifty)) scale(1); }
          80%  { opacity: 0.4;  transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.4), calc(var(--voice-drifty) * 1.6)) scale(0.96); }
          100% { opacity: 0;    transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.7), calc(var(--voice-drifty) * 2)) scale(0.85); }
        }
        .voice-float-item { transition: text-shadow .2s ease, color .2s ease; }
        .voice-float-item:hover {
          color: #ffd9b0 !important;
          text-shadow: 0 0 20px rgba(242,106,33,0.7) !important;
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
