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

// 付箋カラー（濃いめ）
const NOTE_COLORS = [
  '#FFE066', // 黄
  '#FF9999', // ピンク
  '#80C8FF', // 水色
  '#80E0A0', // 緑
  '#D4A0FF', // 紫
  '#FFB380', // オレンジ
  '#FFFFFF', // 白
  '#2B211B', // 黒
]

// 図形カラー（枠線色）
const SHAPE_COLORS = ['#2B211B','#F26A21','#3b82f6','#e11d48','#22c55e','#8b5cf6']

const EDGE_COLORS = ['#2B211B','#F26A21','#3b82f6','#e11d48','#22c55e','#8b5cf6']

const DEFAULT_SIZE: Record<Node['type'], {w:number;h:number}> = {
  note:     { w:160, h:120 },
  circle:   { w:100, h:100 },
  rect:     { w:120, h:80  },
  triangle: { w:100, h:90  },
  arrow:    { w:100, h:40  },
}

function genId() { return Math.random().toString(36).slice(2,10) }

// ===== SVG図形 =====
function NodeShape({ node, selected, onMouseDown, onDoubleClick }: {
  node: Node
  selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
}) {
  const isDark = node.color === '#2B211B'
  const textColor = isDark ? '#fff' : '#2B211B'
  const sel = '#F26A21'
  const sw = selected ? 2.5 : 1.8

  if (node.type === 'note') {
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4}
          fill={node.color}
          stroke={selected ? sel : 'rgba(0,0,0,0.25)'}
          strokeWidth={sw}
          style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.15))'}}/>
        {/* 折り目 */}
        <polygon points={`${node.x+node.w-14},${node.y} ${node.x+node.w},${node.y} ${node.x+node.w},${node.y+14}`}
          fill="rgba(0,0,0,0.1)"/>
        <text x={node.x+10} y={node.y+22} fontSize={node.fontSize} fill={textColor}
          fontFamily="'Noto Sans JP',sans-serif" style={{pointerEvents:'none',userSelect:'none'}}>
          {node.text ? node.text.slice(0,40) : ''}
        </text>
        {!node.text && (
          <text x={node.x+10} y={node.y+22} fontSize={node.fontSize} fill="rgba(0,0,0,0.25)"
            fontFamily="'Noto Sans JP',sans-serif" style={{pointerEvents:'none',userSelect:'none'}}>
            ダブルクリックで編集
          </text>
        )}
      </g>
    )
  }

  if (node.type === 'circle') {
    const cx = node.x + node.w/2, cy = node.y + node.h/2
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <ellipse cx={cx} cy={cy} rx={node.w/2} ry={node.h/2}
          fill="none"
          stroke={selected ? sel : node.color}
          strokeWidth={selected ? 2.5 : 2}/>
        {node.text && (
          <text x={cx} y={cy+5} fontSize={node.fontSize} fill={node.color}
            textAnchor="middle" fontFamily="'Noto Sans JP',sans-serif"
            style={{pointerEvents:'none',userSelect:'none'}}>
            {node.text.slice(0,16)}
          </text>
        )}
      </g>
    )
  }

  if (node.type === 'rect') {
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4}
          fill="none"
          stroke={selected ? sel : node.color}
          strokeWidth={selected ? 2.5 : 2}/>
        {node.text && (
          <text x={node.x+node.w/2} y={node.y+node.h/2+5} fontSize={node.fontSize} fill={node.color}
            textAnchor="middle" fontFamily="'Noto Sans JP',sans-serif"
            style={{pointerEvents:'none',userSelect:'none'}}>
            {node.text.slice(0,16)}
          </text>
        )}
      </g>
    )
  }

  if (node.type === 'triangle') {
    const pts = `${node.x+node.w/2},${node.y} ${node.x+node.w},${node.y+node.h} ${node.x},${node.y+node.h}`
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <polygon points={pts}
          fill="none"
          stroke={selected ? sel : node.color}
          strokeWidth={selected ? 2.5 : 2}/>
        {node.text && (
          <text x={node.x+node.w/2} y={node.y+node.h*0.75} fontSize={node.fontSize} fill={node.color}
            textAnchor="middle" fontFamily="'Noto Sans JP',sans-serif"
            style={{pointerEvents:'none',userSelect:'none'}}>
            {node.text.slice(0,12)}
          </text>
        )}
      </g>
    )
  }

  if (node.type === 'arrow') {
    return (
      <g onMouseDown={onMouseDown} style={{cursor:'move'}}>
        <line x1={node.x} y1={node.y+node.h/2} x2={node.x+node.w} y2={node.y+node.h/2}
          stroke={selected ? sel : node.color} strokeWidth={selected ? 3 : 2.5}
          markerEnd={`url(#ah-${node.color.replace('#','')})`}/>
        {/* 当たり判定を広げる透明線 */}
        <line x1={node.x} y1={node.y+node.h/2} x2={node.x+node.w} y2={node.y+node.h/2}
          stroke="transparent" strokeWidth={16} onMouseDown={onMouseDown}/>
      </g>
    )
  }

  return null
}

export default function StoryBoard({ userId, onClose, isModal }: Props) {
  const supabase = createClient()
  const svgRef   = useRef<SVGSVGElement>(null)

  const [nodes,    setNodes]    = useState<Node[]>([])
  const [edges,    setEdges]    = useState<Edge[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tool,     setTool]     = useState<'select'|'note'|'circle'|'rect'|'triangle'|'arrow'|'edge'>('select')
  const [noteColor,setNoteColor]= useState('#FFE066')
  const [shapeColor,setShapeColor]=useState('#2B211B')
  const [edgeColor,setEdgeColor]= useState('#2B211B')
  const [edgeType, setEdgeType] = useState<'arrow'|'line'>('arrow')
  const [pan,      setPan]      = useState({x:0,y:0})
  const [editing,  setEditing]  = useState<{id:string;text:string}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [mounted,  setMounted]  = useState(false)

  const dragRef    = useRef<{id:string;ox:number;oy:number;mx:number;my:number}|null>(null)
  const panRef     = useRef<{sx:number;sy:number;ox:number;oy:number}|null>(null)
  const edgeFromRef = useRef<string|null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const nodesRef   = useRef<Node[]>([])
  const edgesRef   = useRef<Edge[]>([])

  // SSR対策
  useEffect(() => { setMounted(true) }, [])

  // 初期ロード
  useEffect(() => {
    if (!mounted) return
    supabase.from('story_boards').select('data').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data?.data) {
          const d = data.data as BoardData
          const n = d.nodes || []
          const e = d.edges || []
          setNodes(n); nodesRef.current = n
          setEdges(e); edgesRef.current = e
        }
      })
  }, [userId, mounted])

  const scheduleSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('story_boards').upsert({
        user_id: userId,
        data: { nodes: n, edges: e },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 1200)
  }, [userId])

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

  // ボードクリック → ノード追加
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (tool === 'select' || tool === 'edge') return
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - pan.x
    const y = e.clientY - rect.top - pan.y
    const sz = DEFAULT_SIZE[tool as Node['type']]
    const color = tool === 'note' ? noteColor : shapeColor
    const node: Node = {
      id: genId(), type: tool as Node['type'],
      x: x - sz.w/2, y: y - sz.h/2,
      w: sz.w, h: sz.h,
      color, text: '', fontSize: 12,
    }
    updateNodes(prev => [...prev, node])
    setSelected(node.id)
    setTool('select')
  }

  // ノードドラッグ開始
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

  function handleMouseMove(e: React.MouseEvent) {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.mx
      const dy = e.clientY - dragRef.current.my
      setNodes(prev => prev.map(n => n.id === dragRef.current!.id
        ? { ...n, x: dragRef.current!.ox + dx, y: dragRef.current!.oy + dy }
        : n
      ))
    }
    if (panRef.current) {
      setPan({
        x: panRef.current.ox + (e.clientX - panRef.current.sx),
        y: panRef.current.oy + (e.clientY - panRef.current.sy),
      })
    }
  }

  function handleMouseUp() {
    if (dragRef.current) {
      nodesRef.current = nodesRef.current.map(n => {
        if (n.id !== dragRef.current!.id) return n
        const dx = 0 // already updated via setNodes
        return n
      })
      // 最新のnodesをrefに同期
      setNodes(prev => { nodesRef.current = prev; scheduleSave(prev, edgesRef.current); return prev })
      dragRef.current = null
    }
    panRef.current = null
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (tool !== 'select') return
    const target = e.target as SVGElement
    if (target === svgRef.current || target.getAttribute('data-bg') === '1') {
      setSelected(null)
      edgeFromRef.current = null
      panRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y }
    }
  }

  function handleDoubleClick(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const node = nodesRef.current.find(n => n.id === id)
    if (node) setEditing({ id, text: node.text })
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

  function handleFontSizeChange(delta: number) {
    if (!selected) return
    updateNodes(prev => prev.map(n => n.id === selected ? { ...n, fontSize: Math.max(8, Math.min(24, n.fontSize + delta)) } : n))
  }

  function getNodeCenter(id: string) {
    const n = nodesRef.current.find(x => x.id === id)
    if (!n) return { x:0, y:0 }
    return { x: n.x + n.w/2, y: n.y + n.h/2 }
  }

  if (!mounted) return null

  // 矢印マーカーの色リスト
  const markerColors = [...EDGE_COLORS, ...SHAPE_COLORS].filter((v,i,a)=>a.indexOf(v)===i)

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#f5f0ea',borderRadius:isModal?0:12,overflow:'hidden',fontFamily:"'Noto Sans JP',sans-serif"}}>

      {/* ===== ツールバー ===== */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:'#fff',borderBottom:'1px solid #F0D9C9',flexWrap:'wrap',flexShrink:0}}>
        <span style={{fontSize:11,color:saving?'#F26A21':saved?'#22c55e':'transparent',minWidth:52,fontWeight:600}}>
          {saving?'保存中…':saved?'保存済み':'　'}
        </span>

        <div style={{width:1,height:22,background:'#F0D9C9'}}/>

        {/* ツール */}
        {([
          {id:'select',   label:'選択'},
          {id:'note',     label:'付箋'},
          {id:'circle',   label:'○'},
          {id:'rect',     label:'□'},
          {id:'triangle', label:'△'},
          {id:'arrow',    label:'→'},
          {id:'edge',     label:'接続'},
        ] as {id:string;label:string}[]).map(t => (
          <button key={t.id} onClick={()=>{setTool(t.id as any);edgeFromRef.current=null}}
            style={{padding:'4px 10px',fontSize:12,borderRadius:6,border:'1px solid',cursor:'pointer',
              background:tool===t.id?'#F26A21':'#fff',
              color:tool===t.id?'#fff':'#2B211B',
              borderColor:tool===t.id?'#F26A21':'#F0D9C9',
              fontWeight:tool===t.id?700:400}}>
            {t.label}
          </button>
        ))}

        <div style={{width:1,height:22,background:'#F0D9C9'}}/>

        {/* 付箋カラー */}
        {(tool==='note'||(!selectedNode&&tool==='select')) && (
          <div style={{display:'flex',gap:3,alignItems:'center'}}>
            {NOTE_COLORS.map(c=>(
              <button key={c} onClick={()=>{setNoteColor(c);if(selectedNode?.type==='note')handleColorChange(c)}}
                style={{width:20,height:20,borderRadius:4,border:'none',cursor:'pointer',background:c,
                  outline:noteColor===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {/* 図形カラー */}
        {(['circle','rect','triangle'].includes(tool)||(selectedNode&&['circle','rect','triangle'].includes(selectedNode.type))) && (
          <div style={{display:'flex',gap:3,alignItems:'center'}}>
            {SHAPE_COLORS.map(c=>(
              <button key={c} onClick={()=>{setShapeColor(c);if(selectedNode&&['circle','rect','triangle'].includes(selectedNode.type))handleColorChange(c)}}
                style={{width:20,height:20,borderRadius:'50%',border:'none',cursor:'pointer',background:c,
                  outline:shapeColor===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {/* 接続線設定 */}
        {tool==='edge' && (
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            {(['arrow','line'] as const).map(t=>(
              <button key={t} onClick={()=>setEdgeType(t)}
                style={{padding:'3px 9px',fontSize:11,borderRadius:6,border:'1px solid',cursor:'pointer',
                  background:edgeType===t?'#2B211B':'#fff',color:edgeType===t?'#fff':'#2B211B',borderColor:'#F0D9C9'}}>
                {t==='arrow'?'矢印':'直線'}
              </button>
            ))}
            {EDGE_COLORS.map(c=>(
              <button key={c} onClick={()=>setEdgeColor(c)}
                style={{width:18,height:18,borderRadius:'50%',border:'none',cursor:'pointer',background:c,
                  outline:edgeColor===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {/* 選択中操作 */}
        {selectedNode && tool==='select' && (
          <>
            <div style={{width:1,height:22,background:'#F0D9C9'}}/>
            {selectedNode.type==='note' ? NOTE_COLORS.map(c=>(
              <button key={c} onClick={()=>handleColorChange(c)}
                style={{width:18,height:18,borderRadius:4,border:'none',cursor:'pointer',background:c,
                  outline:selectedNode.color===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            )) : SHAPE_COLORS.map(c=>(
              <button key={c} onClick={()=>handleColorChange(c)}
                style={{width:18,height:18,borderRadius:'50%',border:'none',cursor:'pointer',background:c,
                  outline:selectedNode.color===c?'2.5px solid #F26A21':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>
            ))}
            <button onClick={()=>handleFontSizeChange(-1)} style={{padding:'3px 7px',fontSize:11,border:'1px solid #F0D9C9',borderRadius:5,background:'#fff',cursor:'pointer'}}>A-</button>
            <button onClick={()=>handleFontSizeChange(1)}  style={{padding:'3px 7px',fontSize:11,border:'1px solid #F0D9C9',borderRadius:5,background:'#fff',cursor:'pointer'}}>A+</button>
            <button onClick={handleDelete} style={{padding:'3px 10px',fontSize:11,border:'1px solid #fca5a5',borderRadius:5,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontWeight:600}}>削除</button>
          </>
        )}

        <div style={{flex:1}}/>
        {onClose && (
          <button onClick={onClose} style={{padding:'4px 14px',fontSize:12,border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',cursor:'pointer'}}>
            閉じる
          </button>
        )}
      </div>

      {/* 接続モードのヒント */}
      {tool==='edge' && (
        <div style={{padding:'5px 12px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',fontSize:11,color:'#F26A21',fontWeight:600}}>
          {edgeFromRef.current ? '接続先のノードをクリック' : '接続元のノードをクリック'}
        </div>
      )}

      {/* ===== SVGボード ===== */}
      <div style={{flex:1,overflow:'hidden',position:'relative',cursor:tool==='select'?'default':'crosshair'}}>
        <svg ref={svgRef} width="100%" height="100%"
          onClick={handleSvgClick}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{display:'block'}}>
          <defs>
            {/* ドットグリッド */}
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.12)"/>
            </pattern>
            {/* 矢印マーカー（色ごと） */}
            {markerColors.map(c=>(
              <marker key={c} id={`ah-${c.replace('#','')}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={c}/>
              </marker>
            ))}
          </defs>

          <g transform={`translate(${pan.x},${pan.y})`}>
            {/* ドットグリッド背景 */}
            <rect data-bg="1" x={-5000} y={-5000} width={10000} height={10000}
              fill="url(#dots)" style={{pointerEvents:'all'}}/>

            {/* エッジ */}
            {edges.map(edge=>{
              const from = getNodeCenter(edge.from)
              const to   = getNodeCenter(edge.to)
              return (
                <g key={edge.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={edge.color} strokeWidth={2}
                    markerEnd={edge.type==='arrow'?`url(#ah-${edge.color.replace('#','')})`:undefined}/>
                  {/* 削除用クリック領域 */}
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="transparent" strokeWidth={14} style={{cursor:'pointer'}}
                    onClick={e=>{e.stopPropagation();updateEdges(prev=>prev.filter(x=>x.id!==edge.id))}}/>
                </g>
              )
            })}

            {/* ノード */}
            {nodes.map(node=>(
              <NodeShape key={node.id} node={node} selected={selected===node.id}
                onMouseDown={e=>handleNodeMouseDown(e,node.id)}
                onDoubleClick={e=>handleDoubleClick(e,node.id)}/>
            ))}

            {/* 接続元ハイライト */}
            {edgeFromRef.current && (()=>{
              const n = nodesRef.current.find(x=>x.id===edgeFromRef.current)
              if (!n) return null
              return <rect x={n.x-4} y={n.y-4} width={n.w+8} height={n.h+8} rx={6}
                fill="none" stroke="#F26A21" strokeWidth={2.5} strokeDasharray="6 3"
                style={{pointerEvents:'none'}}/>
            })()}
          </g>
        </svg>
      </div>

      {/* テキスト編集モーダル */}
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
