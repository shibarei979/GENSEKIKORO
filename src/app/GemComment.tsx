const OBI_PALETTE = [
  '#ffffff', '#000000', '#f26a21', '#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#073b4c',
  '#9b5de5', '#f4a261', '#8d5524', '#c9ada7', '#a8dadc', '#808080', '#ffc0cb', '#2a9d8f',
]

// ドット絵帯のSVG表示（旧形式:配列 / 新形式:{w,h,d} 両対応）
function ObiSvg({ dots }: { dots: any }) {
  const w = Array.isArray(dots) ? 48 : (dots?.w || 48)
  const h = Array.isArray(dots) ? 12 : (dots?.h || 12)
  const d: number[] = Array.isArray(dots) ? dots : (dots?.d || [])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', display: 'block', imageRendering: 'pixelated', borderRadius: 3 }} shapeRendering="crispEdges">
      <rect x="0" y="0" width={w} height={h} fill="#ffffff" />
      {d.map((c: number, i: number) => c > 0 ? (
        <rect key={i} x={i % w} y={Math.floor(i / w)} width="1" height="1" fill={OBI_PALETTE[c] || '#000'} />
      ) : null)}
    </svg>
  )
}

interface Props {
  novelId: string
  discoverCount: number
  likeCount: number
  discoverComments?: { comment: string; display_name: string; obi?: any }[]
}

export default function GemComment({ discoverComments=[] }: Props) {
  const first = discoverComments[0]
  return (
    <div style={{padding:'8px 10px',borderTop:'1px solid var(--color-brand-border)',background:'var(--color-bg)',flex:3,display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{fontSize:9,fontWeight:700,color:'var(--color-brand)',marginBottom:4}}>読者の声</div>
      {first ? (
        first.obi ? (
          <div style={{width:'100%'}}>
            <ObiSvg dots={first.obi} />
          </div>
        ) : (
          <div style={{width:'100%',textAlign:'center'}}>
            <span style={{
              fontSize:11,
              fontWeight:400,
              color:'var(--color-text-muted)',
              lineHeight:1.6,
            }}>
              「{first.comment}」
            </span>
          </div>
        )
      ) : (
        <div style={{width:'100%',textAlign:'center',fontSize:10,color:'var(--color-text-faint)',lineHeight:1.5,fontStyle:'italic'}}>
          君の声を届けよう
        </div>
      )}
    </div>
  )
}
