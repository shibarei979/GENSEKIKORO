'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Node {
  id: string
  type: 'note' | 'circle' | 'rect' | 'triangle' | 'arrow'
  x: number
  y: number
  w: number
  h: number
  color: string
  text: string
  fontSize: number
}

interface Edge {
  id: string
  from: string
  to: string
  type: 'arrow' | 'line'
  color: string
}

interface BoardData {
  nodes: Node[]
  edges: Edge[]
}

interface Props {
  userId: string
  onClose?: () => void
  isModal?: boolean
}

const NOTE_COLORS = ['#FFE066','#FF9999','#80C8FF','#80E0A0','#D4A0FF','#FFB380','#FFFFFF','#2B211B']
const SHAPE_COLORS = ['#2B211B','#F26A21','#3b82f6','#e11d48','#22c55e','#8b5cf6']
const EDGE_COLORS  = ['#2B211B','#F26A21','#3b82f6','#e11d48','#22c55e','#8b5cf6']

const DEFAULT_SIZE: Record<Node['type'], {w:number;h:number}> = {
  note:     { w:160, h:120 },
  circle:   { w:100, h:100 },
  rect:     { w:120, h:80  },
  triangle: { w:100, h:90  },
  arrow:    { w:100, h:40  },
}
const MIN_SIZE = 40

// ===== ボードの実サイズ（固定。これが「端」になる） =====
const BOARD_W = 1400
const BOARD_H = 900

// ===== viewBoxで表示できる最大幅・高さ（=ボードサイズと同じ＝これ以上ズームアウトしない） =====
// viewBoxの幅が小さいほど「拡大」、大きいほど「縮小」
const MIN_VIEW_W = BOARD_W * 0.4   // これ以上は拡大しすぎない（zoom最大相当）
const MAX_VIEW_W = BOARD_W          // ボード全体が映る最大幅（これ以上は縮小しない）

function genId() { return Math.random().toString(36).slice(2,10) }

function NodeShape({ node, selected, onMouseDown, onDoubleClick, onResizeStart }: {
  node: Node
  selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
  onResizeStart: (e: React.MouseEvent) => void
}) {
  const isDark = node.color === '#2B211B'
  const textColor = isDark ? '#fff' : '#2B211B'
  const sel = '#F26A21'
  const sw = selected ? 2.5 : 1.8
  const handleSize = 11

  const ResizeHandle = () => selected ? (
    <rect
      x={node.x+node.w-handleSize/2} y={node.y+node.h-handleSize/2}
      width={handleSize} height={handleSize} rx={2}
      fill="#F26A21" stroke="#fff" strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
      style={{cursor:'nwse-resize'}}
      onMouseDown={onResizeStart}
    />
  ) : null

  if (node.type === 'note') {
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4}
          fill={node.color}
          stroke={selected ? sel : 'rgba(0,0,0,0.25)'}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
          style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.15))'}}/>
        <polygon points={`${node.x+node.w-14},${node.y} ${node.x+node.w},${node.y} ${node.x+node.w},${node.y+14}`}
          fill="rgba(0,0,0,0.1)"/>
        <foreignObject x={node.x+10} y={node.y+10} width={Math.max(10,node.w-20)} height={Math.max(10,node.h-20)}>
          <div style={{
            width:'100%',height:'100%',fontSize:node.fontSize,color:textColor,
            lineHeight:1.5,wordBreak:'break-all',overflow:'hidden',userSelect:'none',
            fontFamily:"'Noto Sans JP',sans-serif",pointerEvents:'none',
          }}>
            {node.text || <span style={{opacity:0.3}}>ダブルクリックで編集</span>}
          </div>
        </foreignObject>
        <ResizeHandle/>
      </g>
    )
  }

  if (node.type === 'circle') {
    const cx = node.x + node.w/2, cy = node.y + node.h/2
    return (
      <g onMouseDown={onMouseDown} style={{cursor:'move'}}>
        <ellipse cx={cx} cy={cy} rx={node.w/2} ry={node.h/2}
          fill="none" stroke={selected ? sel : node.color} strokeWidth={selected ? 2.5 : 2}
          vectorEffect="non-scaling-stroke"/>
        <ResizeHandle/>
      </g>
    )
  }

  if (node.type === 'rect') {
    return (
      <g onMouseDown={onMouseDown} style={{cursor:'move'}}>
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4}
          fill="none" stroke={selected ? sel : node.color} strokeWidth={selected ? 2.5 : 2}
          vectorEffect="non-scaling-stroke"/>
        <ResizeHandle/>
      </g>
    )
  }

  if (node.type === 'triangle') {
    const pts = `${node.x+node.w/2},${node.y} ${node.x+node.w},${node.y+node.h} ${node.x},${node.y+node.h}`
    return (
      <g onMouseDown={onMouseDown} style={{cursor:'move'}}>
        <polygon points={pts} fill="none" stroke={selected ? sel : node.color} strokeWidth={selected ? 2.5 : 2}
          vectorEffect="non-scaling-stroke"/>
        <ResizeHandle/>
      </g>
    )
  }

  if (node.type === 'arrow') {
    return (
      <g onMouseDown={onMouseDown} style={{cursor:'move'}}>
        <line x1={node.x} y1={node.y+node.h/2} x2={node.x+node.w} y2={node.y+node.h/2}
          stroke={selected ? sel : node.color} strokeWidth={selected ? 3 : 2.5}
          vectorEffect="non-scaling-stroke"
          markerEnd={`url(#ah-${node.color.replace('#','')})`}/>
        <line x1={node.x} y1={node.y+node.h/2} x2={node.x+node.w} y2={node.y+node.h/2}
          stroke="transparent" strokeWidth={16} onMouseDown={onMouseDown}/>
        <ResizeHandle/>
      </g>
    )
  }

  return null
}

export default function StoryBoard({ userId, onClose, isModal }: Props) {
  const supabase = createClient()
  const svgRef   = useRef<SVGSVGElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  const [nodes,    setNodes]    = useState<Node[]>([])
  const [edges,    setEdges]    = useState<Edge[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tool,     setTool]     = useState<'select'|'note'|'circle'|'rect'|'triangle'|'arrow'|'edge'>('select')
  const [noteColor,setNoteColor]= useState('#FFE066')
  const [shapeColor,setShapeColor]=useState('#2B211B')
  const [edgeColor,setEdgeColor]= useState('#2B211B')
  const [edgeType, setEdgeType] = useState<'arrow'|'line'>('arrow')

  // ===== viewBox管理（vx, vy, vw, vh） vw/vhがズーム、vx/vyがパン =====
  const [viewBox, setViewBox] = useState({ vx: 0, vy: 0, vw: BOARD_W, vh: BOARD_H })

  const [editing,  setEditing]  = useState<{id:string;text:string}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [saveErr,  setSaveErr]  = useState('')
  const [mounted,  setMounted]  = useState(false)

  const dragRef      = useRef<{id:string;ox:number;oy:number;mx:number;my:number}|null>(null)
  const resizeRef     = useRef<{id:string;ow:number;oh:number;mx:number;my:number}|null>(null)
  const panRef        = useRef<{sx:number;sy:number;ovx:number;ovy:number}|null>(null)
  const edgeFromRef   = useRef<string|null>(null)
  const saveTimerRef  = useRef<ReturnType<typeof setTimeout>|null>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])

  useEffect(() => { setMounted(true) }, [])

  // ===== viewBoxをボード範囲内にクランプする =====
  // vw/vhのアスペクト比は親要素に合わせて固定。vwがBOARD_Wを超えないようにし、
  // vx, vyはボードの端が見える範囲でのみ動かせるようにする。
  const clampViewBox = useCallback((vx: number, vy: number, vw: number, vh: number) => {
    const cw = Math.min(Math.max(vw, MIN_VIEW_W), MAX_VIEW_W)
    const ch = cw * (vh / vw) // アスペクト比維持
    // ボードより表示領域が大きい（縮小しすぎ）場合は中央固定
    const cx = cw >= BOARD_W
      ? (BOARD_W - cw) / 2
      : Math.min(Math.max(vx, 0), BOARD_W - cw)
    const cy = ch >= BOARD_H
      ? (BOARD_H - ch) / 2
      : Math.min(Math.max(vy, 0), BOARD_H - ch)
    return { vx: cx, vy: cy, vw: cw, vh: ch }
  }, [])

  // ===== 初期表示：ボード全体を画面にぴったり収める =====
  useEffect(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const aspect = rect.height / rect.width
    // ボードのアスペクト比に対して、画面のアスペクト比で初期viewBoxを決める
    let vw = BOARD_W, vh = BOARD_W * aspect
    if (vh < BOARD_H) { vh = BOARD_H; vw = BOARD_H / aspect }
    setViewBox(clampViewBox((BOARD_W - vw)/2, (BOARD_H - vh)/2, vw, vh))
  }, [mounted, clampViewBox])

  useEffect(() => {
    if (!mounted) return
    supabase.from('story_boards').select('data').eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('board load error:', error); return }
        if (data?.data) {
          const d = data.data as BoardData
          const n = (d.nodes || []).map(node => ({
            ...node,
            x: Math.min(Math.max(node.x, 0), Math.max(0, BOARD_W - node.w)),
            y: Math.min(Math.max(node.y, 0), Math.max(0, BOARD_H - node.h)),
          }))
          const e = d.edges || []
          setNodes(n); nodesRef.current = n
          setEdges(e); edgesRef.current = e
        }
      })
  }, [userId, mounted])

  const doSave = useCallback(async (n: Node[], e: Edge[]) => {
    setSaving(true); setSaveErr('')
    const safeNodes = n.map(node => ({
      ...node,
      x: Math.min(Math.max(node.x, 0), Math.max(0, BOARD_W - node.w)),
      y: Math.min(Math.max(node.y, 0), Math.max(0, BOARD_H - node.h)),
    }))
    const { error } = await supabase.from('story_boards').upsert(
      { user_id: userId, data: { nodes: safeNodes, edges: e }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    if (error) {
      console.error('board save error:', error)
      setSaveErr('保存失敗: ' + error.message)
      setTimeout(() => setSaveErr(''), 4000)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [userId])

  const scheduleSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { doSave(n, e) }, 900)
  }, [doSave])

  function updateNodes(fn: (prev: Node[]) => Node[]) {
    setNodes(prev => {
      const next = fn(prev)
      nodesRef.current = next
      scheduleSave(next, edgesRef.current)
      return next
    })
  }
  function updateEdges(fn: (prev: Edge[]) => Edge[]) {
    setEdges(prev => {
      const next = fn(prev)
      edgesRef.current = next
      scheduleSave(nodesRef.current, next)
      return next
    })
  }

  function clampToBoard(x: number, y: number, w: number, h: number) {
    return {
      x: Math.min(Math.max(x, 0), Math.max(0, BOARD_W - w)),
      y: Math.min(Math.max(y, 0), Math.max(0, BOARD_H - h)),
    }
  }

  // ===== スクリーン座標 → ボード座標（viewBox考慮） =====
  function screenToBoard(clientX: number, clientY: number) {
    if (!svgRef.current) return { x:0, y:0 }
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = viewBox.vw / rect.width
    const scaleY = viewBox.vh / rect.height
    const x = viewBox.vx + (clientX - rect.left) * scaleX
    const y = viewBox.vy + (clientY - rect.top) * scaleY
    return { x, y }
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (tool === 'select' || tool === 'edge') return
    const { x, y } = screenToBoard(e.clientX, e.clientY)
    const sz = DEFAULT_SIZE[tool as Node['type']]
    const color = tool === 'note' ? noteColor : shapeColor
    const clamped = clampToBoard(x - sz.w/2, y - sz.h/2, sz.w, sz.h)
    const node: Node = {
      id: genId(), type: tool as Node['type'],
      x: clamped.x, y: clamped.y,
      w: sz.w, h: sz.h,
      color, text: '', fontSize: 12,
    }
    updateNodes(prev => [...prev, node])
    setSelected(node.id)
    setTool('select')
  }

  function handleNodeMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (tool === 'edge') {
      if (!edgeFromRef.current) {
        edgeFromRef.current = id
      } else if (edgeFromRef.current !== id) {
        const edge: Edge = { id: genId(), from: edgeFromRef.current, to: id, type: edgeType, color: edgeColor }
        updateEdges(prev => [...prev, edge])
        edgeFromRef.current = null
      }
      return
    }
    setSelected(id)
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    dragRef.current = { id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY }
  }

  function handleResizeStart(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    resizeRef.current = { id, ow: node.w, oh: node.h, mx: e.clientX, my: e.clientY }
  }

  // ピクセル差分をボード座標差分に変換するための係数
  function pixelToBoardScale() {
    if (!svgRef.current) return { sx:1, sy:1 }
    const rect = svgRef.current.getBoundingClientRect()
    return { sx: viewBox.vw / rect.width, sy: viewBox.vh / rect.height }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const { sx, sy } = pixelToBoardScale()

    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.mx) * sx
      const dy = (e.clientY - dragRef.current.my) * sy
      setNodes(prev => prev.map(n => {
        if (n.id !== dragRef.current!.id) return n
        const c = clampToBoard(dragRef.current!.ox + dx, dragRef.current!.oy + dy, n.w, n.h)
        return { ...n, x: c.x, y: c.y }
      }))
    }
    if (resizeRef.current) {
      const dx = (e.clientX - resizeRef.current.mx) * sx
      const dy = (e.clientY - resizeRef.current.my) * sy
      setNodes(prev => prev.map(n => {
        if (n.id !== resizeRef.current!.id) return n
        const newW = Math.max(MIN_SIZE, resizeRef.current!.ow + dx)
        const newH = Math.max(MIN_SIZE, resizeRef.current!.oh + dy)
        return { ...n, w: Math.min(newW, BOARD_W - n.x), h: Math.min(newH, BOARD_H - n.y) }
      }))
    }
    if (panRef.current) {
      const dx = (e.clientX - panRef.current.sx) * sx
      const dy = (e.clientY - panRef.current.sy) * sy
      setViewBox(v => clampViewBox(panRef.current!.ovx - dx, panRef.current!.ovy - dy, v.vw, v.vh))
    }
  }

  function handleMouseUp() {
    if (dragRef.current || resizeRef.current) {
      setNodes(prev => { nodesRef.current = prev; scheduleSave(prev, edgesRef.current); return prev })
    }
    dragRef.current = null
    resizeRef.current = null
    panRef.current = null
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (tool !== 'select') return
    const target = e.target as SVGElement
    if (target === svgRef.current || target.getAttribute('data-bg') === '1') {
      setSelected(null)
      edgeFromRef.current = null
      panRef.current = { sx: e.clientX, sy: e.clientY, ovx: viewBox.vx, ovy: viewBox.vy }
    }
  }

  // ===== ホイールでズーム（viewBoxの幅・高さを変える） =====
  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.1 : 0.9 // 下スクロール=縮小(viewBox拡大)、上=拡大(viewBox縮小)
    setViewBox(v => {
      const newVw = v.vw * factor
      const newVh = v.vh * factor
      // ズームの中心をマウス位置に保つための補正
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return clampViewBox(v.vx, v.vy, newVw, newVh)
      const mx = v.vx + (e.clientX - rect.left) * (v.vw / rect.width)
      const my = v.vy + (e.clientY - rect.top)  * (v.vh / rect.height)
      const ratio = newVw / v.vw
      const newVx = mx - (mx - v.vx) * ratio
      const newVy = my - (my - v.vy) * ratio
      return clampViewBox(newVx, newVy, newVw, newVh)
    })
  }

  function handleDoubleClick(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const node = nodesRef.current.find(n => n.id === id)
    if (node && node.type === 'note') setEditing({ id, text: node.text })
  }

  function handleEditSave() {
    if (!editing) return
    updateNodes(prev => prev.map(n => n.id === editing.id ? { ...n, text: editing.text } : n))
    setEditing(null)
  }

  const selectedNode = nodes.find(n => n.id === selected)

  function handleDelete() {
    if (!selected) return
    updateNodes(prev => prev.filter(n => n.id !== selected))
    updateEdges(prev => prev.filter(e => e.from !== selected && e.to !== selected))
    setSelected(null)
  }

  function handleColorChange(color: string) {
    if (!selected) return
    updateNodes(prev => prev.map(n => n.id === selected ? { ...n, color } : n))
  }

  function getNodeCenter(id: string) {
    const n = nodesRef.current.find(x => x.id === id)
    if (!n) return { x:0, y:0 }
    return { x: n.x + n.w/2, y: n.y + n.h/2 }
  }

  // ===== ズームボタン（中心固定でviewBoxを縮小/拡大） =====
  function zoomBy(factor: number) {
    setViewBox(v => {
      const cx = v.vx + v.vw/2, cy = v.vy + v.vh/2
      const newVw = v.vw * factor
      const newVh = v.vh * factor
      return clampViewBox(cx - newVw/2, cy - newVh/2, newVw, newVh)
    })
  }
  function zoomIn()  { zoomBy(0.9) }
  function zoomOut() { zoomBy(1.1) }

  function fitToScreen() {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const aspect = rect.height / rect.width
    let vw = BOARD_W, vh = BOARD_W * aspect
    if (vh < BOARD_H) { vh = BOARD_H; vw = BOARD_H / aspect }
    setViewBox(clampViewBox((BOARD_W - vw)/2, (BOARD_H - vh)/2, vw, vh))
  }

  if (!mounted) return null

  const markerColors = [...EDGE_COLORS, ...SHAPE_COLORS].filter((v,i,a)=>a.indexOf(v)===i)
  const zoomPercent = Math.round((BOARD_W / viewBox.vw) * 100)

  const toolBtnStyle = (active: boolean) => ({
    width:48, height:48, fontSize:20, borderRadius:10, border:'1.5px solid',
    cursor:'pointer' as const, display:'flex', alignItems:'center' as const, justifyContent:'center' as const,
    background: active ? '#F26A21' : '#fff',
    color: active ? '#fff' : '#2B211B',
    borderColor: active ? '#F26A21' : '#F0D9C9',
    fontWeight: active ? 700 as const : 400 as const,
    transition:'all .12s',
  })

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#f5f0ea',borderRadius:isModal?0:12,overflow:'hidden',fontFamily:"'Noto Sans JP',sans-serif"}}>

      {/* ===== ツールバー ===== */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 18px',background:'#fff',borderBottom:'1px solid #F0D9C9',flexWrap:'wrap',flexShrink:0}}>
        <span style={{fontSize:12,color:saveErr?'#dc2626':saving?'#F26A21':saved?'#22c55e':'transparent',minWidth:78,fontWeight:600}}>
          {saveErr || (saving?'保存中…':saved?'保存済み':'　')}
        </span>

        <div style={{width:1,height:36,background:'#F0D9C9'}}/>

        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>{setTool('select');edgeFromRef.current=null}} title="選択" style={toolBtnStyle(tool==='select')}>↖</button>
          <button onClick={()=>{setTool('note');edgeFromRef.current=null}} title="付箋" style={toolBtnStyle(tool==='note')}>▥</button>
          <button onClick={()=>{setTool('circle');edgeFromRef.current=null}} title="円" style={toolBtnStyle(tool==='circle')}>○</button>
          <button onClick={()=>{setTool('rect');edgeFromRef.current=null}} title="四角" style={toolBtnStyle(tool==='rect')}>□</button>
          <button onClick={()=>{setTool('triangle');edgeFromRef.current=null}} title="三角" style={toolBtnStyle(tool==='triangle')}>△</button>
          <button onClick={()=>{setTool('arrow');edgeFromRef.current=null}} title="矢印図形" style={toolBtnStyle(tool==='arrow')}>→</button>
          <button onClick={()=>{setTool('edge');edgeFromRef.current=null}} title="ノード接続"
            style={{...toolBtnStyle(tool==='edge'),width:'auto',padding:'0 18px',fontSize:15}}>接続</button>
        </div>

        <div style={{width:1,height:36,background:'#F0D9C9'}}/>

        {(tool==='note'||(!selectedNode&&tool==='select')||selectedNode?.type==='note') && (
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            {NOTE_COLORS.map(c=>(
              <button key={c} onClick={()=>{setNoteColor(c);if(selectedNode?.type==='note')handleColorChange(c)}}
                style={{width:26,height:26,borderRadius:6,border:'none',cursor:'pointer',background:c,
                  outline:(selectedNode?.type==='note'?selectedNode.color:noteColor)===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {(['circle','rect','triangle','arrow'].includes(tool)||(selectedNode&&['circle','rect','triangle','arrow'].includes(selectedNode.type))) && (
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            {SHAPE_COLORS.map(c=>(
              <button key={c} onClick={()=>{setShapeColor(c);if(selectedNode&&['circle','rect','triangle','arrow'].includes(selectedNode.type))handleColorChange(c)}}
                style={{width:26,height:26,borderRadius:'50%',border:'none',cursor:'pointer',background:c,
                  outline:(selectedNode&&['circle','rect','triangle','arrow'].includes(selectedNode.type)?selectedNode.color:shapeColor)===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {tool==='edge' && (
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {(['arrow','line'] as const).map(t=>(
              <button key={t} onClick={()=>setEdgeType(t)}
                style={{padding:'7px 14px',fontSize:13,borderRadius:8,border:'1px solid',cursor:'pointer',
                  background:edgeType===t?'#2B211B':'#fff',color:edgeType===t?'#fff':'#2B211B',borderColor:'#F0D9C9'}}>
                {t==='arrow'?'矢印':'直線'}
              </button>
            ))}
            {EDGE_COLORS.map(c=>(
              <button key={c} onClick={()=>setEdgeColor(c)}
                style={{width:24,height:24,borderRadius:'50%',border:'none',cursor:'pointer',background:c,
                  outline:edgeColor===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {selectedNode && tool==='select' && (
          <button onClick={handleDelete} style={{padding:'9px 18px',fontSize:13,border:'1px solid #fca5a5',borderRadius:9,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontWeight:600}}>
            削除
          </button>
        )}

        <div style={{flex:1}}/>

        {/* ===== ズームコントロール ===== */}
        <div style={{display:'flex',alignItems:'center',gap:4,background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:10,padding:4}}>
          <button onClick={zoomOut} title="縮小"
            style={{width:32,height:32,border:'none',background:'#fff',borderRadius:7,cursor:'pointer',fontSize:16,fontWeight:700,color:'#77706A',display:'flex',alignItems:'center',justifyContent:'center'}}>
            −
          </button>
          <span style={{minWidth:46,textAlign:'center',fontSize:13,fontWeight:700,color:'#2B211B'}}>
            {zoomPercent}%
          </span>
          <button onClick={zoomIn} title="拡大"
            style={{width:32,height:32,border:'none',background:'#fff',borderRadius:7,cursor:'pointer',fontSize:16,fontWeight:700,color:'#77706A',display:'flex',alignItems:'center',justifyContent:'center'}}>
            ＋
          </button>
          <div style={{width:1,height:20,background:'#F0D9C9',margin:'0 2px'}}/>
          <button onClick={fitToScreen} title="全体を表示"
            style={{padding:'0 10px',height:32,border:'none',background:'#fff',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600,color:'#77706A'}}>
            全体表示
          </button>
        </div>

        <div style={{width:1,height:36,background:'#F0D9C9'}}/>

        {onClose && (
          <button onClick={onClose} style={{padding:'9px 20px',fontSize:14,border:'1px solid #F0D9C9',borderRadius:10,background:'#fff',color:'#77706A',cursor:'pointer',fontWeight:600}}>
            閉じる
          </button>
        )}
      </div>

      {tool==='edge' && (
        <div style={{padding:'7px 16px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',fontSize:13,color:'#F26A21',fontWeight:600}}>
          {edgeFromRef.current ? '接続先のノードをクリック' : '接続元のノードをクリック'}
        </div>
      )}

      <div ref={wrapRef} style={{flex:1,overflow:'hidden',position:'relative',cursor:tool==='select'?'default':'crosshair'}}>
        <svg ref={svgRef} width="100%" height="100%"
          viewBox={`${viewBox.vx} ${viewBox.vy} ${viewBox.vw} ${viewBox.vh}`}
          onClick={handleSvgClick}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{display:'block'}}>
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.12)"/>
            </pattern>
            {markerColors.map(c=>(
              <marker key={c} id={`ah-${c.replace('#','')}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={c}/>
              </marker>
            ))}
          </defs>

          {/* 画面外（=ボード外）の余白を埋める背景。ボードより大きく取って、ズームアウトしてもグレーが見える */}
          <rect data-bg="1" x={-BOARD_W} y={-BOARD_H} width={BOARD_W*3} height={BOARD_H*3}
            fill="#ddd4c4" style={{pointerEvents:'all'}}/>

          {/* ===== ボード本体（端が見える固定範囲） ===== */}
          <rect x={0} y={0} width={BOARD_W} height={BOARD_H}
            fill="#f5f0ea" stroke="#F26A21" strokeWidth={4} vectorEffect="non-scaling-stroke"
            style={{pointerEvents:'none',filter:'drop-shadow(0 2px 12px rgba(0,0,0,0.12))'}}/>
          <rect x={0} y={0} width={BOARD_W} height={BOARD_H}
            fill="url(#dots)" style={{pointerEvents:'none'}}/>

          {edges.map(edge=>{
            const from = getNodeCenter(edge.from)
            const to   = getNodeCenter(edge.to)
            return (
              <g key={edge.id}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edge.color} strokeWidth={2} vectorEffect="non-scaling-stroke"
                  markerEnd={edge.type==='arrow'?`url(#ah-${edge.color.replace('#','')})`:undefined}/>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" style={{cursor:'pointer'}}
                  onClick={e=>{e.stopPropagation();updateEdges(prev=>prev.filter(x=>x.id!==edge.id))}}/>
              </g>
            )
          })}

          {nodes.map(node=>(
            <NodeShape key={node.id} node={node} selected={selected===node.id}
              onMouseDown={e=>handleNodeMouseDown(e,node.id)}
              onDoubleClick={e=>handleDoubleClick(e,node.id)}
              onResizeStart={e=>handleResizeStart(e,node.id)}/>
          ))}

          {edgeFromRef.current && (()=>{
            const n = nodesRef.current.find(x=>x.id===edgeFromRef.current)
            if (!n) return null
            return <rect x={n.x-4} y={n.y-4} width={n.w+8} height={n.h+8} rx={6}
              fill="none" stroke="#F26A21" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeDasharray="6 3"
              style={{pointerEvents:'none'}}/>
          })()}
        </svg>

        <div style={{position:'absolute',bottom:12,right:12,fontSize:11,color:'#B8AEA8',background:'rgba(255,255,255,0.8)',padding:'4px 10px',borderRadius:8,pointerEvents:'none'}}>
          ホイールで拡大縮小・背景ドラッグで移動
        </div>
      </div>

      {editing && (
        <div style={{position:'absolute',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',width:300,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:10}}>テキストを編集</div>
            <textarea autoFocus value={editing.text}
              onChange={e=>setEditing({...editing,text:e.target.value})}
              onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))handleEditSave()}}
              rows={4}
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}
              placeholder="テキストを入力…"/>
            <div style={{fontSize:10,color:'#B8AEA8',marginBottom:10}}>⌘+Enter で保存</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,padding:'8px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleEditSave} style={{flex:1,padding:'8px',border:'none',borderRadius:8,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
