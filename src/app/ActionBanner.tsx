'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  isLoggedIn: boolean
}

// 角丸台形をSVGパスで生成する関数
// outerEdge: 'left' | 'right' -- どちら側を画面端（広い辺）にするか
// flip: 上下反転（逆さま）にするか
// 画面端側のまっすぐな辺（外側の角）は角丸にしない（半径0）。斜辺側の角だけ丸くする。
function trapezoidPath(w: number, h: number, r: number, outerEdge: 'left' | 'right', flip: boolean) {
  const inset = h * 1.1 // 傾斜の強さ（高さに対する比率）

  // 各頂点ごとの角丸半径（画面端側の2点は0、斜辺側の2点はr）
  let points: {x:number;y:number;radius:number}[]
  if (outerEdge === 'left') {
    points = [
      { x: 0, y: 0, radius: 0 },        // 左上（画面端）
      { x: w, y: 0, radius: r },        // 右上（斜辺側）
      { x: w - inset, y: h, radius: r }, // 右下（斜辺側）
      { x: 0, y: h, radius: 0 },        // 左下（画面端）
    ]
  } else {
    points = [
      { x: 0, y: 0, radius: r },        // 左上（斜辺側）
      { x: w, y: 0, radius: 0 },        // 右上（画面端）
      { x: w, y: h, radius: 0 },        // 右下（画面端）
      { x: inset, y: h, radius: r },    // 左下（斜辺側）
    ]
  }

  if (flip) {
    points = points.map(p => ({ ...p, y: h - p.y }))
  }

  function roundedPolygonPath(pts: {x:number;y:number;radius:number}[]) {
    const n = pts.length
    let d = ''
    for (let i = 0; i < n; i++) {
      const curr = pts[i]
      const prev = pts[(i - 1 + n) % n]
      const next = pts[(i + 1) % n]
      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
      const v2 = { x: next.x - curr.x, y: next.y - curr.y }
      const len1 = Math.hypot(v1.x, v1.y) || 1
      const len2 = Math.hypot(v2.x, v2.y) || 1
      const radius = curr.radius
      const r1 = Math.min(radius, len1 / 2)
      const r2 = Math.min(radius, len2 / 2)
      const p1 = { x: curr.x - (v1.x / len1) * r1, y: curr.y - (v1.y / len1) * r1 }
      const p2 = { x: curr.x + (v2.x / len2) * r2, y: curr.y + (v2.y / len2) * r2 }
      if (i === 0) d += `M ${p1.x} ${p1.y} `
      else d += `L ${p1.x} ${p1.y} `
      if (radius > 0) d += `Q ${curr.x} ${curr.y} ${p2.x} ${p2.y} `
      else d += `L ${p2.x} ${p2.y} `
    }
    d += 'Z'
    return d
  }

  return roundedPolygonPath(points)
}

export default function ActionBanner({ isLoggedIn }: Props) {
  const [hoverLeft, setHoverLeft] = useState(false)
  const [hoverRight, setHoverRight] = useState(false)

  const W = 800
  const H = 390
  const R = 26

  // 探す：左端基準、先細りが右へ（中央方向）。通常向き。
  const leftPath  = trapezoidPath(W, H, R, 'left', false)
  // 投稿：右端基準、先細りが左へ（中央方向）。上下反転。
  const rightPath = trapezoidPath(W, H, R, 'right', true)

  return (
    <div style={{position:'relative', width:'100vw', marginLeft:'calc(50% - 50vw)', marginRight:'calc(50% - 50vw)', height:660}}>

      {/* 左：探す（画面左端まで・上にストレッチ） */}
      <Link href="/search"
        onMouseEnter={()=>setHoverLeft(true)} onMouseLeave={()=>setHoverLeft(false)}
        style={{
          position:'absolute', left:0, top:0, width:'64%', height:H,
          textDecoration:'none', display:'block',
          transform: hoverLeft ? 'translateY(-6px)' : 'translateY(0)',
          transition:'transform .25s ease',
          zIndex: 1,
        }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:'100%',display:'block',overflow:'visible'}}>
          <defs>
            <linearGradient id="leftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2B211B"/>
              <stop offset="100%" stopColor="#4a3a2e"/>
            </linearGradient>
            <filter id="leftShadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.18"/>
            </filter>
          </defs>
          <path d={leftPath} fill="url(#leftGrad)" filter="url(#leftShadow)"/>
        </svg>
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', padding:'0 22% 0 7%'}}>
          <div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600,letterSpacing:'0.1em',marginBottom:8}}>READ</div>
            <div style={{fontSize:30,fontWeight:700,color:'#fff',fontFamily:"'Noto Serif JP',serif",marginBottom:14,lineHeight:1.45}}>
              次に読みたい一冊が、<br/>ここにある
            </div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:15,color:'#FFD9B8',fontWeight:600}}>
              作品を探す
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD9B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>
      </Link>

      {/* 右：投稿（画面右端まで・下にずれて配置・上下逆さま） */}
      <Link href={isLoggedIn ? '/post' : '/auth/register'}
        onMouseEnter={()=>setHoverRight(true)} onMouseLeave={()=>setHoverRight(false)}
        style={{
          position:'absolute', right:0, top:222, width:'64%', height:H,
          textDecoration:'none', display:'block',
          transform: hoverRight ? 'translateY(6px)' : 'translateY(0)',
          transition:'transform .25s ease',
          zIndex: 1,
        }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:'100%',display:'block',overflow:'visible'}}>
          <defs>
            <linearGradient id="rightGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F26A21"/>
              <stop offset="100%" stopColor="#f08a4f"/>
            </linearGradient>
            <filter id="rightShadow" x="-20%" y="-40%" width="140%" height="160%">
              <feDropShadow dx="0" dy="-6" stdDeviation="10" floodColor="#000" floodOpacity="0.18"/>
            </filter>
          </defs>
          <path d={rightPath} fill="url(#rightGrad)" filter="url(#rightShadow)"/>
        </svg>
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'flex-end', padding:'0 7% 0 22%'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',fontWeight:600,letterSpacing:'0.1em',marginBottom:8}}>WRITE</div>
            <div style={{fontSize:30,fontWeight:700,color:'#fff',fontFamily:"'Noto Serif JP',serif",marginBottom:14,lineHeight:1.45}}>
              あなたの物語を、<br/>世界に届けよう
            </div>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:15,color:'#fff',fontWeight:600}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}}><polyline points="9 18 15 12 9 6"/></svg>
              作品を投稿する
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
