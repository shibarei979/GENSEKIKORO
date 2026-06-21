'use client'
import { useEffect, useState } from 'react'
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

interface FloatItem {
  voice: Voice
  left: number      // %
  top: number       // %
  delay: number      // s（負の値で開始位置をずらす）
  duration: number   // s（1サイクルの長さ）
  size: number        // px（文字サイズ）
  driftX: number       // px（横の漂い幅）
  driftY: number       // px（縦の漂い幅）
  wobble: number        // px（揺れの振幅）
}

// 文字数に応じてフォントサイズを調整（短い文は大きく目立たせる）
function sizeFor(text: string) {
  const len = text.length
  if (len <= 8) return 26
  if (len <= 16) return 21
  if (len <= 28) return 17
  return 14
}

function buildItems(voices: Voice[]): FloatItem[] {
  return voices.map((v) => {
    const duration = 4 + Math.random() * 3
    return {
      voice: v,
      left: 2 + Math.random() * 94,
      top: 4 + Math.random() * 88,
      delay: -Math.random() * duration,
      duration,
      size: sizeFor(v.text),
      driftX: -70 + Math.random() * 140,
      driftY: -60 + Math.random() * 30,
      wobble: 14 + Math.random() * 18,
    }
  })
}

export default function VoicesFloat({ voices }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<FloatItem[] | null>(null)

  // クライアント側でマウントされてから初めてランダム値を計算する。
  // サーバーでのレンダリング結果がキャッシュ・共有されても、
  // 各ユーザーのブラウザで毎回新しい配置になるようにするため。
  useEffect(() => {
    setItems(buildItems(voices))
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

      {items && items.map((item, i) => (
        <button
          key={`${item.voice.id}-${i}`}
          onClick={()=>goToNovel(item.voice)}
          title={item.voice.novelTitle}
          className="voice-float-item"
          style={{
            position:'absolute',
            left:`${item.left}%`,
            top:`${item.top}%`,
            fontSize:item.size,
            color:'rgba(255,255,255,0.92)',
            background:'none', border:'none', cursor:'pointer',
            fontFamily:"'Noto Serif JP',serif",
            whiteSpace:'nowrap',
            maxWidth:'70vw',
            overflow:'hidden',
            textOverflow:'ellipsis',
            textShadow:'0 0 12px rgba(255,255,255,0.4), 0 0 4px rgba(242,106,33,0.3)',
            padding:'4px 8px',
            animationName:'voiceFloat, voiceWobble',
            animationDuration:`${item.duration}s, ${(item.duration*0.35).toFixed(2)}s`,
            animationDelay:`${item.delay}s, ${item.delay}s`,
            animationIterationCount:'infinite, infinite',
            animationTimingFunction:'ease-in-out, ease-in-out',
            ['--voice-driftx' as any]: `${item.driftX}px`,
            ['--voice-drifty' as any]: `${item.driftY}px`,
            ['--voice-wobble' as any]: `${item.wobble}px`,
          } as React.CSSProperties}
        >
          {item.voice.text.length > 34 ? item.voice.text.slice(0,34)+'…' : item.voice.text}
        </button>
      ))}

      <style>{`
        @keyframes voiceFloat {
          0%   { opacity: 0;    transform: translate(-50%,-50%) translate(0px, 24px) scale(0.85); }
          8%   { opacity: 0.9;  transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 0.15), calc(var(--voice-drifty) * 0.15 + 10px)) scale(1); }
          20%  { opacity: 1;    transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 0.4), calc(var(--voice-drifty) * 0.4)) scale(1.04); }
          50%  { opacity: 0.9;  transform: translate(-50%,-50%) translate(var(--voice-driftx), var(--voice-drifty)) scale(1); }
          78%  { opacity: 0.5;  transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.3), calc(var(--voice-drifty) * 1.5)) scale(0.96); }
          92%  { opacity: 0.12; transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.5), calc(var(--voice-drifty) * 1.8)) scale(0.9); }
          100% { opacity: 0;    transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.6), calc(var(--voice-drifty) * 2)) scale(0.85); }
        }
        @keyframes voiceWobble {
          0%   { margin-left: 0px; }
          25%  { margin-left: calc(var(--voice-wobble) * 0.5); }
          50%  { margin-left: 0px; }
          75%  { margin-left: calc(var(--voice-wobble) * -0.5); }
          100% { margin-left: 0px; }
        }
        .voice-float-item { transition: text-shadow .2s ease, color .2s ease; }
        .voice-float-item:hover {
          color: #ffd9b0 !important;
          text-shadow: 0 0 20px rgba(242,106,33,0.7) !important;
          animation-play-state: paused, paused;
        }
      `}</style>
    </div>
  )
}
