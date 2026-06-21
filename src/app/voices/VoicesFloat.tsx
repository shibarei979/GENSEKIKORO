'use client'
import { useEffect, useState, useMemo } from 'react'
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
  delay: number      // s
  duration: number   // s（1サイクルの長さ）
  size: number        // px（文字サイズ）
  drift: number        // px（漂う横移動量）
}

// 文字数に応じてフォントサイズを調整（短い文は大きく目立たせる）
function sizeFor(text: string) {
  const len = text.length
  if (len <= 8) return 26
  if (len <= 16) return 21
  if (len <= 28) return 17
  return 14
}

export default function VoicesFloat({ voices }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // 各文の浮遊パラメータをランダムに、ただし初回のみ計算して固定する
  const items: FloatItem[] = useMemo(() => {
    return voices.map((v) => ({
      voice: v,
      left: 4 + Math.random() * 88,
      top: 6 + Math.random() * 82,
      delay: Math.random() * 14,
      duration: 10 + Math.random() * 8,
      size: sizeFor(v.text),
      drift: -24 + Math.random() * 48,
    }))
  }, [voices])

  function goToNovel(v: Voice) {
    router.push(`/novel/${v.novelId}`)
  }

  return (
    <div style={{
      position:'relative', width:'100%',
      height:'calc(100vh - 66px)', minHeight:560,
      overflow:'hidden',
      background:'radial-gradient(ellipse at 50% 30%, #f5f4f1 0%, #e6e4df 70%)',
    }}>
      {/* 中央の案内テキスト（うっすら常時表示、文字の邪魔をしすぎない位置） */}
      <div style={{
        position:'absolute', top:24, left:0, right:0, textAlign:'center', zIndex:1,
        pointerEvents:'none',
      }}>
        <div style={{fontSize:13,color:'rgba(242,106,33,0.6)',letterSpacing:'0.08em',marginBottom:4,fontWeight:700}}>VOICES</div>
        <h1 style={{fontSize:18,fontWeight:700,color:'rgba(43,33,27,0.85)',fontFamily:"'Noto Serif JP',serif",marginBottom:4}}>読者の声</h1>
        <p style={{fontSize:11.5,color:'rgba(43,33,27,0.5)'}}>気になる言葉をクリックすると、その作品に出会えます</p>
      </div>

      {voices.length === 0 && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <p style={{fontSize:13,color:'rgba(43,33,27,0.4)'}}>まだ声が集まっていません</p>
        </div>
      )}

      {mounted && items.map((item, i) => (
        <button
          key={item.voice.id}
          onClick={()=>goToNovel(item.voice)}
          title={item.voice.novelTitle}
          className="voice-float-item"
          style={{
            position:'absolute',
            left:`${item.left}%`,
            top:`${item.top}%`,
            transform:'translate(-50%,-50%)',
            fontSize:item.size,
            color:'rgba(90,58,32,0.85)',
            background:'none', border:'none', cursor:'pointer',
            fontFamily:"'Noto Serif JP',serif",
            whiteSpace:'nowrap',
            maxWidth:'70vw',
            overflow:'hidden',
            textOverflow:'ellipsis',
            textShadow:'0 1px 3px rgba(255,255,255,0.8)',
            padding:'4px 8px',
            animationName:'voiceFloat',
            animationDuration:`${item.duration}s`,
            animationDelay:`${item.delay}s`,
            animationIterationCount:'infinite',
            animationTimingFunction:'ease-in-out',
            ['--voice-drift' as any]: `${item.drift}px`,
          } as React.CSSProperties}
        >
          {item.voice.text.length > 34 ? item.voice.text.slice(0,34)+'…' : item.voice.text}
        </button>
      ))}

      <style>{`
        @keyframes voiceFloat {
          0%   { opacity: 0;    transform: translate(-50%,-50%) translateX(0) translateY(18px) scale(0.85); }
          8%   { opacity: 0.9;  transform: translate(-50%,-50%) translateX(calc(var(--voice-drift) * 0.15)) translateY(8px) scale(1); }
          20%  { opacity: 1;    transform: translate(-50%,-50%) translateX(calc(var(--voice-drift) * 0.35)) translateY(-2px) scale(1.04); }
          50%  { opacity: 0.9;  transform: translate(-50%,-50%) translateX(var(--voice-drift)) translateY(-16px) scale(1); }
          78%  { opacity: 0.5;  transform: translate(-50%,-50%) translateX(calc(var(--voice-drift) * 0.7)) translateY(-26px) scale(0.96); }
          92%  { opacity: 0.12; transform: translate(-50%,-50%) translateX(calc(var(--voice-drift) * 0.85)) translateY(-34px) scale(0.9); }
          100% { opacity: 0;    transform: translate(-50%,-50%) translateX(var(--voice-drift)) translateY(-40px) scale(0.85); }
        }
        .voice-float-item { transition: text-shadow .2s ease, color .2s ease; }
        .voice-float-item:hover {
          color: #F26A21 !important;
          text-shadow: 0 1px 6px rgba(255,255,255,0.9) !important;
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
