'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Node {
  id: string
  type: 'note' | 'circle' | 'rect' | 'triangle' | 'arrow'
  x: number; y: number; w: number; h: number
  color: string; text: string; fontSize: number
}
interface Edge { id: string; from: string; to: string; type: 'arrow' | 'line'; color: string }
interface MemoData { nodes: Node[]; edges: Edge[] }

const NOTE_COLORS = ['#FFE066','#FF9999','#80C8FF','#80E0A0','#D4A0FF','#FFB380','var(--base-color-1)','var(--color-text)']
const SHAPE_COLORS = ['var(--color-text)','var(--color-brand)','#3b82f6','#e11d48','#22c55e','#8b5cf6']
const EDGE_COLORS  = ['var(--color-text)','var(--color-brand)','#3b82f6','#e11d48','#22c55e','#8b5cf6']
const DEFAULT_SIZE: Record<Node['type'], {w:number;h:number}> = {
  note: {w:160,h:120}, circle:{w:100,h:100}, rect:{w:120,h:80}, triangle:{w:100,h:90}, arrow:{w:100,h:40},
}
const MIN_SIZE = 40
const BOARD_W = 14000, BOARD_H = 9000

function genId() { return Math.random().toString(36).slice(2,10) }

function NodeShape({ node, selected, onMouseDown, onDoubleClick, onResizeStart }: {
  node: Node; selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
  onResizeStart: (e: React.MouseEvent) => void
}) {
  const isDark = node.color === 'var(--color-text)'
  const textColor = isDark ? 'var(--base-color-1)' : 'var(--color-text)'
  const sel = 'var(--color-brand)'
  const sw = selected ? 2.5 : 1.8
  const handleSize = 11

  const ResizeHandle = () => selected ? (
    <rect x={node.x+node.w-handleSize/2} y={node.y+node.h-handleSize/2} width={handleSize} height={handleSize} rx={2}
      fill="var(--color-brand)" stroke="var(--base-color-1)" strokeWidth={1.5} vectorEffect="non-scaling-stroke"
      style={{cursor:'nwse-resize'}} onMouseDown={onResizeStart}/>
  ) : null

  if (node.type === 'note') {
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4}
          fill={node.color} stroke={selected ? sel : 'rgba(0,0,0,0.25)'} strokeWidth={sw}
          vectorEffect="non-scaling-stroke" style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.15))'}}/>
        <polygon points={`${node.x+node.w-14},${node.y} ${node.x+node.w},${node.y} ${node.x+node.w},${node.y+14}`} fill="rgba(0,0,0,0.1)"/>
        <foreignObject x={node.x+10} y={node.y+10} width={Math.max(10,node.w-20)} height={Math.max(10,node.h-20)}>
          <div style={{width:'100%',height:'100%',fontSize:node.fontSize,color:textColor,lineHeight:1.5,wordBreak:'break-all',overflow:'hidden',userSelect:'none',fontFamily:"'Noto Sans JP',sans-serif",pointerEvents:'none'}}>
            {node.text || <span style={{opacity:0.3}}>ダブルクリックで編集</span>}
          </div>
        </foreignObject>
        <ResizeHandle/>
      </g>
    )
  }
  if (node.type === 'circle') {
    const cx = node.x+node.w/2, cy = node.y+node.h/2
    return (<g onMouseDown={onMouseDown} style={{cursor:'move'}}>
      <ellipse cx={cx} cy={cy} rx={node.w/2} ry={node.h/2} fill="none" stroke={selected?sel:node.color} strokeWidth={selected?2.5:2} vectorEffect="non-scaling-stroke"/>
      <ResizeHandle/></g>)
  }
  if (node.type === 'rect') {
    return (<g onMouseDown={onMouseDown} style={{cursor:'move'}}>
      <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4} fill="none" stroke={selected?sel:node.color} strokeWidth={selected?2.5:2} vectorEffect="non-scaling-stroke"/>
      <ResizeHandle/></g>)
  }
  if (node.type === 'triangle') {
    const pts = `${node.x+node.w/2},${node.y} ${node.x+node.w},${node.y+node.h} ${node.x},${node.y+node.h}`
    return (<g onMouseDown={onMouseDown} style={{cursor:'move'}}>
      <polygon points={pts} fill="none" stroke={selected?sel:node.color} strokeWidth={selected?2.5:2} vectorEffect="non-scaling-stroke"/>
      <ResizeHandle/></g>)
  }
  if (node.type === 'arrow') {
    return (<g onMouseDown={onMouseDown} style={{cursor:'move'}}>
      <line x1={node.x} y1={node.y+node.h/2} x2={node.x+node.w} y2={node.y+node.h/2} stroke={selected?sel:node.color} strokeWidth={selected?3:2.5} vectorEffect="non-scaling-stroke" markerEnd={`url(#ah-${node.color.replace('#','')})`}/>
      <line x1={node.x} y1={node.y+node.h/2} x2={node.x+node.w} y2={node.y+node.h/2} stroke="transparent" strokeWidth={16} onMouseDown={onMouseDown}/>
      <ResizeHandle/></g>)
  }
  return null
}

export default function MemoMode({ userId }: { userId: string }) {
  const supabase = createClient()
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selected, setSelected] = useState<string|null>(null)
  const [tool, setTool] = useState<'select'|'note'|'circle'|'rect'|'triangle'|'arrow'|'edge'>('select')
  const [noteColor, setNoteColor] = useState('#FFE066')
  const [shapeColor, setShapeColor] = useState('var(--color-text)')
  const [edgeColor, setEdgeColor] = useState('var(--color-text)')
  const [edgeType, setEdgeType] = useState<'arrow'|'line'>('arrow')
  const [viewBox, setViewBox] = useState({vx:0,vy:0,vw:BOARD_W,vh:BOARD_H})
  const [fitSize, setFitSize] = useState<{vw:number;vh:number}|null>(null)
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState<{id:string;text:string}|null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [mounted, setMounted] = useState(false)

  const dragRef = useRef<{id:string;ox:number;oy:number;mx:number;my:number}|null>(null)
  const resizeRef = useRef<{id:string;ow:number;oh:number;mx:number;my:number}|null>(null)
  const panRef = useRef<{sx:number;sy:number;ovx:number;ovy:number}|null>(null)
  const edgeFromRef = useRef<string|null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])

  useEffect(() => { setMounted(true) }, [])

  const computeFitSize = useCallback((): {vw:number;vh:number}|null => {
    if (!wrapRef.current) return null
    const rect = wrapRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const aspect = rect.height/rect.width
    let vw = BOARD_W, vh = BOARD_W*aspect
    if (vh < BOARD_H) { vh = BOARD_H; vw = BOARD_H/aspect }
    if (!isFinite(vw)||!isFinite(vh)||vw<=0||vh<=0) return null
    return {vw,vh}
  }, [])

  const clampViewBox = useCallback((vx:number,vy:number,vw:number,vh:number,fit:{vw:number;vh:number}|null) => {
    const maxVw = fit?fit.vw:BOARD_W, maxVh = fit?fit.vh:BOARD_H
    const minVw = BOARD_W*0.02
    const cw = Math.min(Math.max(vw,minVw),maxVw)
    const ratio = vh/vw
    const ch = isFinite(ratio)&&ratio>0 ? cw*ratio : Math.min(Math.max(vh,minVw*(maxVh/maxVw)),maxVh)
    const cx = cw>=BOARD_W ? (BOARD_W-cw)/2 : Math.min(Math.max(vx,0),Math.max(0,BOARD_W-cw))
    const cy = ch>=BOARD_H ? (BOARD_H-ch)/2 : Math.min(Math.max(vy,0),Math.max(0,BOARD_H-ch))
    if (!isFinite(cx)||!isFinite(cy)||!isFinite(cw)||!isFinite(ch)) return {vx:0,vy:0,vw:BOARD_W,vh:BOARD_H}
    return {vx:cx,vy:cy,vw:cw,vh:ch}
  }, [])

  useEffect(() => {
    if (!mounted) return
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        const fit = computeFitSize()
        if (!fit) return
        setFitSize(fit)
        setViewBox({vx:(BOARD_W-fit.vw)/2,vy:(BOARD_H-fit.vh)/2,vw:fit.vw,vh:fit.vh})
        setReady(true)
      })
      ;(id1 as any).id2 = id2
    })
    return () => { cancelAnimationFrame(id1); if((id1 as any).id2) cancelAnimationFrame((id1 as any).id2) }
  }, [mounted, computeFitSize])

  useEffect(() => {
    function onResize() { const fit = computeFitSize(); if (fit) setFitSize(fit) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [computeFitSize])

  useEffect(() => {
    if (!mounted) return
    supabase.from('story_boards').select('memo_data').eq('user_id', userId).maybeSingle()
      .then(({data,error}) => {
        if (error) { console.error(error); return }
        if (data?.memo_data) {
          const d = data.memo_data as MemoData
          const n = (d.nodes||[]).map(node => ({
            ...node,
            x: Math.min(Math.max(node.x,0),Math.max(0,BOARD_W-node.w)),
            y: Math.min(Math.max(node.y,0),Math.max(0,BOARD_H-node.h)),
          }))
          setNodes(n); nodesRef.current = n
          setEdges(d.edges||[]); edgesRef.current = d.edges||[]
        }
      })
  }, [userId, mounted])

  const doSave = useCallback(async (n: Node[], e: Edge[]) => {
    setSaving(true); setSaveErr('')
    const safeNodes = n.map(node => ({
      ...node,
      x: Math.min(Math.max(node.x,0),Math.max(0,BOARD_W-node.w)),
      y: Math.min(Math.max(node.y,0),Math.max(0,BOARD_H-node.h)),
    }))
    const { error } = await supabase.from('story_boards').upsert(
      { user_id: userId, memo_data: { nodes: safeNodes, edges: e }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    if (error) { setSaveErr('保存失敗: '+error.message); setTimeout(()=>setSaveErr(''),4000); return }
    setSaved(true); setTimeout(()=>setSaved(false),2000)
  }, [userId])

  const scheduleSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(n,e), 900)
  }, [doSave])

  function updateNodes(fn:(prev:Node[])=>Node[]) {
    setNodes(prev => { const next = fn(prev); nodesRef.current = next; scheduleSave(next, edgesRef.current); return next })
  }
  function updateEdges(fn:(prev:Edge[])=>Edge[]) {
    setEdges(prev => { const next = fn(prev); edgesRef.current = next; scheduleSave(nodesRef.current, next); return next })
  }
  function clampToBoard(x:number,y:number,w:number,h:number) {
    return { x: Math.min(Math.max(x,0),Math.max(0,BOARD_W-w)), y: Math.min(Math.max(y,0),Math.max(0,BOARD_H-h)) }
  }
  function screenToBoard(clientX:number, clientY:number) {
    if (!svgRef.current) return {x:0,y:0}
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width||!rect.height) return {x:0,y:0}
    return { x: viewBox.vx+(clientX-rect.left)*(viewBox.vw/rect.width), y: viewBox.vy+(clientY-rect.top)*(viewBox.vh/rect.height) }
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (tool==='select'||tool==='edge') return
    const {x,y} = screenToBoard(e.clientX,e.clientY)
    const sz = DEFAULT_SIZE[tool as Node['type']]
    const color = tool==='note'?noteColor:shapeColor
    const clamped = clampToBoard(x-sz.w/2,y-sz.h/2,sz.w,sz.h)
    const node: Node = { id:genId(), type:tool as Node['type'], x:clamped.x, y:clamped.y, w:sz.w, h:sz.h, color, text:'', fontSize:12 }
    updateNodes(prev => [...prev,node]); setSelected(node.id); setTool('select')
  }

  function handleNodeMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (tool==='edge') {
      if (!edgeFromRef.current) edgeFromRef.current = id
      else if (edgeFromRef.current!==id) {
        updateEdges(prev=>[...prev,{id:genId(),from:edgeFromRef.current!,to:id,type:edgeType,color:edgeColor}])
        edgeFromRef.current = null
      }
      return
    }
    setSelected(id)
    const node = nodesRef.current.find(n=>n.id===id); if (!node) return
    dragRef.current = {id, ox:node.x, oy:node.y, mx:e.clientX, my:e.clientY}
  }
  function handleResizeStart(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const node = nodesRef.current.find(n=>n.id===id); if (!node) return
    resizeRef.current = {id, ow:node.w, oh:node.h, mx:e.clientX, my:e.clientY}
  }
  function pixelToBoardScale() {
    if (!svgRef.current) return {sx:1,sy:1}
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width||!rect.height) return {sx:1,sy:1}
    return {sx:viewBox.vw/rect.width, sy:viewBox.vh/rect.height}
  }
  function handleMouseMove(e: React.MouseEvent) {
    const {sx,sy} = pixelToBoardScale()
    if (dragRef.current) {
      const dr = dragRef.current
      const dx=(e.clientX-dr.mx)*sx, dy=(e.clientY-dr.my)*sy
      setNodes(prev=>prev.map(n=>{ if(n.id!==dr.id) return n; const c=clampToBoard(dr.ox+dx,dr.oy+dy,n.w,n.h); return {...n,x:c.x,y:c.y} }))
    }
    if (resizeRef.current) {
      const rr = resizeRef.current
      const dx=(e.clientX-rr.mx)*sx, dy=(e.clientY-rr.my)*sy
      setNodes(prev=>prev.map(n=>{ if(n.id!==rr.id) return n; const newW=Math.max(MIN_SIZE,rr.ow+dx), newH=Math.max(MIN_SIZE,rr.oh+dy); return {...n,w:Math.min(newW,BOARD_W-n.x),h:Math.min(newH,BOARD_H-n.y)} }))
    }
    if (panRef.current) {
      const pr = panRef.current
      const dx=(e.clientX-pr.sx)*sx, dy=(e.clientY-pr.sy)*sy
      const newVx=pr.ovx-dx, newVy=pr.ovy-dy
      setViewBox(v=>clampViewBox(newVx,newVy,v.vw,v.vh,fitSize))
    }
  }
  function handleMouseUp() {
    if (dragRef.current||resizeRef.current) setNodes(prev=>{nodesRef.current=prev; scheduleSave(prev,edgesRef.current); return prev})
    dragRef.current=null; resizeRef.current=null; panRef.current=null
  }
  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (tool!=='select') return
    const target = e.target as SVGElement
    if (target===svgRef.current || target.getAttribute('data-bg')==='1') {
      setSelected(null); edgeFromRef.current=null
      panRef.current = {sx:e.clientX, sy:e.clientY, ovx:viewBox.vx, ovy:viewBox.vy}
    }
  }
  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault()
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width||!rect.height) return
    const factor = e.deltaY>0?1.1:0.9
    setViewBox(v=>{
      const newVw=v.vw*factor, newVh=v.vh*factor
      const mx=v.vx+(e.clientX-rect.left)*(v.vw/rect.width), my=v.vy+(e.clientY-rect.top)*(v.vh/rect.height)
      const ratio=newVw/v.vw
      return clampViewBox(mx-(mx-v.vx)*ratio, my-(my-v.vy)*ratio, newVw, newVh, fitSize)
    })
  }
  function handleDoubleClick(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const node = nodesRef.current.find(n=>n.id===id)
    if (node&&node.type==='note') setEditing({id,text:node.text})
  }
  function handleEditSave() {
    if (!editing) return
    updateNodes(prev=>prev.map(n=>n.id===editing.id?{...n,text:editing.text}:n))
    setEditing(null)
  }
  const selectedNode = nodes.find(n=>n.id===selected)
  function handleDelete() {
    if (!selected) return
    updateNodes(prev=>prev.filter(n=>n.id!==selected))
    updateEdges(prev=>prev.filter(e=>e.from!==selected&&e.to!==selected))
    setSelected(null)
  }
  function handleColorChange(color:string) { if(!selected) return; updateNodes(prev=>prev.map(n=>n.id===selected?{...n,color}:n)) }
  function getNodeCenter(id:string) { const n=nodesRef.current.find(x=>x.id===id); if(!n) return {x:0,y:0}; return {x:n.x+n.w/2,y:n.y+n.h/2} }
  function zoomBy(factor:number) { setViewBox(v=>{ const cx=v.vx+v.vw/2, cy=v.vy+v.vh/2, newVw=v.vw*factor, newVh=v.vh*factor; return clampViewBox(cx-newVw/2,cy-newVh/2,newVw,newVh,fitSize) }) }
  function zoomIn(){zoomBy(0.9)} function zoomOut(){zoomBy(1.1)}
  function fitToScreen() { const fit=computeFitSize(); if(!fit) return; setFitSize(fit); setViewBox({vx:(BOARD_W-fit.vw)/2,vy:(BOARD_H-fit.vh)/2,vw:fit.vw,vh:fit.vh}) }

  if (!mounted) return null
  const markerColors = [...EDGE_COLORS,...SHAPE_COLORS].filter((v,i,a)=>a.indexOf(v)===i)
  const zoomPercent = fitSize&&fitSize.vw>0 ? Math.round((fitSize.vw/viewBox.vw)*100) : 100

  const toolBtnStyle = (active:boolean) => ({
    width:44,height:44,fontSize:18,borderRadius:10,border:'1.5px solid',cursor:'pointer' as const,
    display:'flex',alignItems:'center' as const,justifyContent:'center' as const,
    background:active?'var(--color-brand)':'var(--color-bg-card)', color:active?'var(--color-bg-card)':'var(--color-text)',
    borderColor:active?'var(--color-brand)':'var(--color-brand-border)', fontWeight:active?700 as const:400 as const, transition:'all .12s',
  })

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'var(--color-bg)',borderBottom:'1px solid var(--color-brand-border)',flexWrap:'wrap',flexShrink:0}}>
        <span style={{fontSize:11,color:saveErr?'var(--color-danger)':saving?'var(--color-brand)':saved?'#22c55e':'transparent',minWidth:70,fontWeight:600}}>
          {saveErr || (saving?'保存中…':saved?'保存済み':'　')}
        </span>
        <div style={{width:1,height:30,background:'var(--color-brand-border)'}}/>
        <div style={{display:'flex',gap:5}}>
          <button onClick={()=>{setTool('select');edgeFromRef.current=null}} title="選択" style={toolBtnStyle(tool==='select')}>↖</button>
          <button onClick={()=>{setTool('note');edgeFromRef.current=null}} title="付箋" style={toolBtnStyle(tool==='note')}>▥</button>
          <button onClick={()=>{setTool('circle');edgeFromRef.current=null}} title="円" style={toolBtnStyle(tool==='circle')}>○</button>
          <button onClick={()=>{setTool('rect');edgeFromRef.current=null}} title="四角" style={toolBtnStyle(tool==='rect')}>□</button>
          <button onClick={()=>{setTool('triangle');edgeFromRef.current=null}} title="三角" style={toolBtnStyle(tool==='triangle')}>△</button>
          <button onClick={()=>{setTool('arrow');edgeFromRef.current=null}} title="矢印図形" style={toolBtnStyle(tool==='arrow')}>→</button>
          <button onClick={()=>{setTool('edge');edgeFromRef.current=null}} title="ノード接続" style={{...toolBtnStyle(tool==='edge'),width:'auto',padding:'0 16px',fontSize:13}}>接続</button>
        </div>
        <div style={{width:1,height:30,background:'var(--color-brand-border)'}}/>
        {(tool==='note'||(!selectedNode&&tool==='select')||selectedNode?.type==='note') && (
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            {NOTE_COLORS.map(c=>(<button key={c} onClick={()=>{setNoteColor(c);if(selectedNode?.type==='note')handleColorChange(c)}}
              style={{width:24,height:24,borderRadius:6,border:'none',cursor:'pointer',background:c,outline:(selectedNode?.type==='note'?selectedNode.color:noteColor)===c?'2.5px solid var(--color-brand)':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>))}
          </div>
        )}
        {(['circle','rect','triangle','arrow'].includes(tool)||(selectedNode&&['circle','rect','triangle','arrow'].includes(selectedNode.type))) && (
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            {SHAPE_COLORS.map(c=>(<button key={c} onClick={()=>{setShapeColor(c);if(selectedNode&&['circle','rect','triangle','arrow'].includes(selectedNode.type))handleColorChange(c)}}
              style={{width:24,height:24,borderRadius:'50%',border:'none',cursor:'pointer',background:c,outline:(selectedNode&&['circle','rect','triangle','arrow'].includes(selectedNode.type)?selectedNode.color:shapeColor)===c?'2.5px solid var(--color-brand)':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>))}
          </div>
        )}
        {tool==='edge' && (
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            {(['arrow','line'] as const).map(t=>(<button key={t} onClick={()=>setEdgeType(t)} style={{padding:'6px 12px',fontSize:12,borderRadius:7,border:'1px solid',cursor:'pointer',background:edgeType===t?'var(--color-text)':'var(--color-bg-card)',color:edgeType===t?'var(--color-bg-card)':'var(--color-text)',borderColor:'var(--color-brand-border)'}}>{t==='arrow'?'矢印':'直線'}</button>))}
            {EDGE_COLORS.map(c=>(<button key={c} onClick={()=>setEdgeColor(c)} style={{width:22,height:22,borderRadius:'50%',border:'none',cursor:'pointer',background:c,outline:edgeColor===c?'2.5px solid var(--color-brand)':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>))}
          </div>
        )}
        {selectedNode && tool==='select' && (
          <button onClick={handleDelete} style={{padding:'8px 16px',fontSize:12,border:'1px solid #fca5a5',borderRadius:8,background:'#fef2f2',color:'var(--color-danger)',cursor:'pointer',fontWeight:600}}>削除</button>
        )}
        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:4,background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:4}}>
          <button onClick={zoomOut} style={{width:30,height:30,border:'none',background:'var(--color-bg)',borderRadius:7,cursor:'pointer',fontSize:15,fontWeight:700,color:'var(--color-text-muted)'}}>−</button>
          <span style={{minWidth:44,textAlign:'center',fontSize:12,fontWeight:700,color:'var(--color-text)'}}>{zoomPercent}%</span>
          <button onClick={zoomIn} style={{width:30,height:30,border:'none',background:'var(--color-bg)',borderRadius:7,cursor:'pointer',fontSize:15,fontWeight:700,color:'var(--color-text-muted)'}}>＋</button>
          <div style={{width:1,height:18,background:'var(--color-brand-border)',margin:'0 2px'}}/>
          <button onClick={fitToScreen} style={{padding:'0 10px',height:30,border:'none',background:'var(--color-bg)',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,color:'var(--color-text-muted)'}}>全体表示</button>
        </div>
      </div>

      {tool==='edge' && (
        <div style={{padding:'6px 14px',background:'var(--color-brand-light)',borderBottom:'1px solid var(--color-brand-border)',fontSize:12,color:'var(--color-brand)',fontWeight:600}}>
          {edgeFromRef.current ? '接続先のノードをクリック' : '接続元のノードをクリック'}
        </div>
      )}

      <div ref={wrapRef} style={{flex:1,overflow:'hidden',position:'relative',cursor:tool==='select'?'default':'crosshair',background:'#ddd4c4'}}>
        {ready && (
          <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="none"
            viewBox={`${viewBox.vx} ${viewBox.vy} ${viewBox.vw} ${viewBox.vh}`}
            onClick={handleSvgClick} onMouseDown={handleSvgMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} style={{display:'block'}}>
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.12)"/></pattern>
              {markerColors.map(c=>(<marker key={c} id={`ah-${c.replace('#','')}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill={c}/></marker>))}
            </defs>
            <rect data-bg="1" x={-BOARD_W} y={-BOARD_H} width={BOARD_W*3} height={BOARD_H*3} fill="#ddd4c4" style={{pointerEvents:'all'}}/>
            <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#f5f0ea" stroke="var(--color-brand)" strokeWidth={4} vectorEffect="non-scaling-stroke" style={{pointerEvents:'none',filter:'drop-shadow(0 2px 12px rgba(0,0,0,0.12))'}}/>
            <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="url(#dots)" style={{pointerEvents:'none'}}/>
            {edges.map(edge=>{
              const from=getNodeCenter(edge.from), to=getNodeCenter(edge.to)
              return (<g key={edge.id}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.color} strokeWidth={2} vectorEffect="non-scaling-stroke" markerEnd={edge.type==='arrow'?`url(#ah-${edge.color.replace('#','')})`:undefined}/>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();updateEdges(prev=>prev.filter(x=>x.id!==edge.id))}}/>
              </g>)
            })}
            {nodes.map(node=>(<NodeShape key={node.id} node={node} selected={selected===node.id} onMouseDown={e=>handleNodeMouseDown(e,node.id)} onDoubleClick={e=>handleDoubleClick(e,node.id)} onResizeStart={e=>handleResizeStart(e,node.id)}/>))}
            {edgeFromRef.current && (()=>{ const n=nodesRef.current.find(x=>x.id===edgeFromRef.current); if(!n) return null;
              return <rect x={n.x-4} y={n.y-4} width={n.w+8} height={n.h+8} rx={6} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeDasharray="6 3" style={{pointerEvents:'none'}}/> })()}
          </svg>
        )}
        <div style={{position:'absolute',bottom:12,right:12,fontSize:11,color:'var(--color-text-faint)',background:'color-mix(in srgb, var(--base-color-1) 80%, transparent)',padding:'4px 10px',borderRadius:8,pointerEvents:'none'}}>
          ホイールで拡大縮小・背景ドラッグで移動
        </div>
      </div>

      {editing && (
        <div style={{position:'absolute',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)'}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:14,padding:'20px',width:300,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:10}}>テキストを編集</div>
            <textarea autoFocus value={editing.text} onChange={e=>setEditing({...editing,text:e.target.value})}
              onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))handleEditSave()}} rows={4}
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}
              placeholder="テキストを入力…"/>
            <div style={{fontSize:10,color:'var(--color-text-faint)',marginBottom:10}}>⌘+Enter で保存</div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,padding:'8px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleEditSave} style={{flex:1,padding:'8px',border:'none',borderRadius:8,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer'}}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
