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

// 1つの表示枠（スロット）の現在の状態
interface SlotState {
  voiceIdx: number
  left: number
  top: number
  driftX: number
  driftY: number
  duration: number
  runId: number   // この回の表示を一意に識別するID（key用）
}

const SLOT_COUNT = 14          // 画面に同時に存在する文の数
const DURATION_MIN = 3.6       // 表示時間（短め）
const DURATION_MAX = 5.0       // 表示時間（長め）

function sizeFor(text: string) {
  const len = text.length
  if (len <= 8) return 22
  if (len <= 16) return 18
  if (len <= 28) return 15
  return 12.5
}

function randomState(voicesLen: number, runId: number): SlotState {
  const angle = Math.random() * Math.PI * 2
  const dist = 90 + Math.random() * 140
  return {
    voiceIdx: Math.floor(Math.random() * voicesLen),
    left: 8 + Math.random() * 84,
    top: 10 + Math.random() * 76,
    driftX: Math.cos(angle) * dist,
    driftY: -Math.abs(Math.sin(angle) * dist) - 40, // 必ず上方向寄りに漂う
    duration: DURATION_MIN + Math.random() * (DURATION_MAX - DURATION_MIN),
    runId,
  }
}

function SlotItem({ voices, slotIndex, onClick }: { voices: Voice[]; slotIndex: number; onClick: (v: Voice) => void }) {
  const runIdRef = useRef(0)
  const [state, setState] = useState<SlotState>(() => randomState(voices.length, 0))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 各スロットの開始タイミングをずらすための初回ディレイ
    const initialDelay = (slotIndex / SLOT_COUNT) * DURATION_MIN * 1000 * 0.6 + Math.random() * 600

    function schedule(state: SlotState) {
      timerRef.current = setTimeout(() => {
        runIdRef.current += 1
        const next = randomState(voices.length, runIdRef.current)
        setState(next)
        schedule(next)
      }, state.duration * 1000)
    }

    const t0 = setTimeout(() => {
      schedule(state)
    }, initialDelay)

    return () => {
      clearTimeout(t0)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices.length])

  if (voices.length === 0) return null
  const voice = voices[state.voiceIdx % voices.length]
  if (!voice) return null

  return (
    <button
      key={state.runId}
      onClick={()=>onClick(voice)}
      className="voice-float-item"
      style={{
        position:'absolute',
        left:`${state.left}%`,
        top:`${state.top}%`,
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
        animationDuration:`${state.duration}s`,
        animationTimingFunction:'ease-in-out',
        animationFillMode:'forwards',
        ['--voice-driftx' as any]: `${state.driftX}px`,
        ['--voice-drifty' as any]: `${state.driftY}px`,
      } as React.CSSProperties}
    >
      {voice.text.length > 34 ? voice.text.slice(0,34)+'…' : voice.text}
    </button>
  )
}

export default function VoicesFloat({ voices }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
        <div style={{fontSize:13,color:'rgba(255,180,120,0.7)',letterSpacing:'0.08em',marginBottom:4,fontWeight:700}}>1-LINE SEARCH</div>
        <h1 style={{fontSize:18,fontWeight:700,color:'rgba(255,255,255,0.9)',fontFamily:"'Noto Serif JP',serif",marginBottom:4}}>1文検索</h1>
        <p style={{fontSize:11.5,color:'rgba(255,255,255,0.55)'}}>気になる言葉をクリックすると、その作品に出会えます</p>
      </div>

      {voices.length === 0 && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>まだ声が集まっていません</p>
        </div>
      )}

      {mounted && voices.length > 0 && Array.from({length: Math.min(SLOT_COUNT, Math.max(voices.length, 4))}).map((_, i) => (
        <SlotItem key={i} voices={voices} slotIndex={i} onClick={goToNovel}/>
      ))}

      <style>{`
        @keyframes voiceFloat {
          0%   { opacity: 0;    transform: translate(-50%,-50%) translate(0px, 24px) scale(0.85); }
          12%  { opacity: 0.95; transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 0.25), calc(var(--voice-drifty) * 0.3 + 10px)) scale(1.02); }
          50%  { opacity: 0.9;  transform: translate(-50%,-50%) translate(var(--voice-driftx), var(--voice-drifty)) scale(1); }
          82%  { opacity: 0.35; transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.3), calc(var(--voice-drifty) * 1.4)) scale(0.95); }
          100% { opacity: 0;    transform: translate(-50%,-50%) translate(calc(var(--voice-driftx) * 1.5), calc(var(--voice-drifty) * 1.6)) scale(0.88); }
        }
        .voice-float-item:hover {
          color: #ffd9b0 !important;
          text-shadow: 0 0 20px rgba(242,106,33,0.7) !important;
          animation-play-state: paused !important;
        }
      `}</style>
    </div>
  )
}
