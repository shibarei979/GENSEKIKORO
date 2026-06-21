'use client'
import { useEffect, useMemo, useState } from 'react'
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

interface Route {
  left: number       // 開始位置 %
  top: number         // 開始位置 %
  driftX: number       // 終点までの横移動 px
  driftY: number        // 終点までの縦移動 px
  duration: number       // 1サイクルの秒数
}

// ===== あらかじめ100パターンの「発生位置×移動ルート」を生成 =====
// 動的に毎回計算するのではなく、固定の候補リストから選ぶことで、
// 軌道計算そのものに起因する表示の乱れ（飛び・吸い寄せ等）を避ける。
function buildRoutePool(n: number): Route[] {
  const pool: Route[] = []
  for (let i = 0; i < n; i++) {
    // 疑似乱数だが、ページロード単位では固定。Math.randomで十分（事前生成なので一貫性は保たれる）
    pool.push({
      left: 8 + Math.random() * 84,
      top: 10 + Math.random() * 76,
      driftX: -120 + Math.random() * 240,
      driftY: -100 + Math.random() * 35,
      duration: 6 + Math.random() * 4,
    })
  }
  return pool
}

const ROUTE_POOL = buildRoutePool(100)

function shuffledIndices(count: number, poolSize: number): number[] {
  const all = Array.from({ length: poolSize }, (_, i) => i)
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  // 文の数がプールより多い場合は循環させる
  const result: number[] = []
  for (let i = 0; i < count; i++) result.push(all[i % all.length])
  return result
}

// 文字数に応じてフォントサイズを調整（短い文は大きく目立たせる）
function sizeFor(text: string) {
  const len = text.length
  if (len <= 8) return 26
  if (len <= 16) return 21
  if (len <= 28) return 17
  return 14
}

interface AssignedItem {
  voice: Voice
  route: Route
  delay: number
}

export default function VoicesFloat({ voices }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // 各文に、100パターンの中からシャッフルで1つずつルートを割り当てる
  const items: AssignedItem[] = useMemo(() => {
    const routeIdxs = shuffledIndices(voices.length, ROUTE_POOL.length)
    return voices.map((v, i) => ({
      voice: v,
      route: ROUTE_POOL[routeIdxs[i]],
      delay: Math.random() * 3,
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
      background:'radial-gradient(ellipse at 50% 30%, #3a3a3a 0%, #232323 70%)',
    }}>
      {/* 中央の案内テキスト */}
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

      {mounted && items.map((item, i) => (
        <button
          key={`${item.voice.id}-${i}`}
          onClick={()=>goToNovel(item.voice)}
          className="voice-float-item"
          style={{
            position:'absolute',
            left:`${item.route.left}%`,
            top:`${item.route.top}%`,
            fontSize:sizeFor(item.voice.text),
            color:'rgba(255,255,255,0.92)',
            background:'none', border:'none', cursor:'pointer',
            fontFamily:"'Noto Serif JP',serif",
            whiteSpace:'nowrap',
            maxWidth:'70vw',
            overflow:'hidden',
            textOverflow:'ellipsis',
            textShadow:'0 0 12px rgba(255,255,255,0.4), 0 0 4px rgba(242,106,33,0.3)',
            padding:'4px 8px',
            pointerEvents:'auto',
            isolation:'isolate',
            willChange:'transform, opacity',
            animationName:'voiceFloat',
            animationDuration:`${item.route.duration}s`,
            animationDelay:`${item.delay}s`,
            animationIterationCount:'infinite',
            animationTimingFunction:'ease-in-out',
            ['--voice-driftx' as any]: `${item.route.driftX}px`,
            ['--voice-drifty' as any]: `${item.route.driftY}px`,
          } as React.CSSProperties}
        >
          {item.voice.text.length > 34 ? item.voice.text.slice(0,34)+'…' : item.voice.text}
        </button>
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
        /* ホバー演出は :hover のみで発火する。JSによる状態管理を介さないため、
           カーソルが乗っていない要素が反応することはない。 */
        .voice-float-item:hover {
          color: #ffd9b0 !important;
          text-shadow: 0 0 20px rgba(242,106,33,0.7) !important;
          animation-play-state: paused !important;
          z-index: 5;
        }
      `}</style>
    </div>
  )
}
