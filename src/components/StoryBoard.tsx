'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ===== 型定義 =====
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

// ===== カラーパレット =====
const NOTE_COLORS = [
  '#FFF9C4', // 黄
  '#FFD6D6', // ピンク
  '#D6EAFF', // 水色
  '#D6FFE0', // 緑
  '#F0D6FF', // 紫
  '#FFE5D6', // オレンジ
  '#FFFFFF', // 白
  '#2B211B', // 黒（ダーク）
]

const EDGE_COLORS = ['#2B211B','#F26A21','#3b82f6','#e11d48','#22c55e','#8b5cf6']

const DEFAULT_NODE_SIZE: Record<Node['type'], {w:number;h:number}> = {
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
  const selStroke = '#F26A21'
  const strokeW = selected ? 2.5 : 1.5

  if (node.type === 'note') {
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        {/* 付箋の折り目 */}
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={4}
          fill={node.color} stroke={selected?selStroke:'rgba(0,0,0,0.15)'} strokeWidth={strokeW}
          style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.12))'}}/>
        {/* 折り目の三角 */}
        <polygon points={`${node.x+node.w-16},${node.y} ${node.x+node.w},${node.y} ${node.x+node.w},${node.y+16}`}
          fill="rgba(0,0,0,0.08)"/>
        <foreignObject x={node.x+8} y={node.y+8} width={node.w-16} height={node.h-16}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width:'100%',height:'100%',
            fontSize:node.fontSize,color:textColor,
            lineHeight:1.5,wordBreak:'break-all',
            overflow:'hidden',userSelect:'none',
            fontFamily:"'Noto Sans JP',sans-serif",
            pointerEvents:'none',
          }}>
            {node.text || <span style={{opacity:0.35}}>ダブルクリックで編集</span>}
          </div>
        </foreignObject>
      </g>
    )
  }

  if (node.type === 'circle') {
    const cx = node.x + node.w/2, cy = node.y + node.h/2
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <ellipse cx={cx} cy={cy} rx={node.w/2} ry={node.h/2}
          fill={node.color} stroke={selected?selStroke:'rgba(0,0,0,0.2)'} strokeWidth={strokeW}
          style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.1))'}}/>
        <foreignObject x={node.x+8} y={node.y+8} width={node.w-16} height={node.h-16}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:node.fontSize,color:textColor,textAlign:'center',
            wordBreak:'break-all',overflow:'hidden',userSelect:'none',
            fontFamily:"'Noto Sans JP',sans-serif",pointerEvents:'none',
          }}>
            {node.text}
          </div>
        </foreignObject>
      </g>
    )
  }

  if (node.type === 'rect') {
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <rect x={node.x} y={node.y} width={node.w} height={node.h} rx={6}
          fill={node.color} stroke={selected?selStroke:'rgba(0,0,0,0.2)'} strokeWidth={strokeW}
          style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.1))'}}/>
        <foreignObject x={node.x+8} y={node.y+8} width={node.w-16} height={node.h-16}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:node.fontSize,color:textColor,textAlign:'center',
            wordBreak:'break-all',overflow:'hidden',userSelect:'none',
            fontFamily:"'Noto Sans JP',sans-serif",pointerEvents:'none',
          }}>
            {node.text}
          </div>
        </foreignObject>
      </g>
    )
  }

  if (node.type === 'triangle') {
    const pts = `${node.x+node.w/2},${node.y} ${node.x+node.w},${node.y+node.h} ${node.x},${node.y+node.h}`
    return (
      <g onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} style={{cursor:'move'}}>
        <polygon points={pts}
          fill={node.color} stroke={selected?selStroke:'rgba(0,0,0,0.2)'} strokeWidth={strokeW}
          style={{filter:'drop-shadow(1px 2px 4px rgba(0,0,0,0.1))'}}/>
        <foreignObject x={node.x+16} y={node.y+node.h*0.5} width={node.w-32} height={node.h*0.4}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:node.fontSize,color:textColor,textAlign:'center',
            wordBreak:'break-all',overflow:'hidden',userSelect:'none',
            fontFamily:"'Noto Sans JP',sans-serif",pointerEvents:'none',
          }}>
            {node.text}
          </div>
        </foreignObject>
      </g>
    )
  }

  if (node.type === 'arrow') {
    const ax = node.x, ay = node.y + node.h/2
    const bx = node.x + node.w, by = node.y + node.h/2
    return (
      <g onMouseDown={onMouseDown} style={{cursor:'move'}}>
        <line x1={ax} y1={ay} x2={bx} y2={by}
          stroke={selected?selStroke:node.color} strokeWidth={selected?3:2.5}
          markerEnd="url(#arrowhead-node)"/>
        {selected && <line x1={ax} y1={ay} x2={bx} y2={by} stroke="transparent" strokeWidth={16}
          onMouseDown={onMouseDown}/>}
      </g>
    )
  }

  return null
}

// ===== メインコンポーネント =====
export default function StoryBoard({ userId, onClose, isModal }: Props) {
  const supabase = createClient()
  const svgRef   = useRef<SVGSVGElement>(null)

  const [nodes,     setNodes]     = useState<Node[]>([])
  const [edges,     setEdges]     = useState<Edge[]>([])
  const [selected,  setSelected]  = useState<string | null>(null)
  const [tool,      setTool]      = useState<'select'|'note'|'circle'|'rect'|'triangle'|'arrow'|'edge'>('select')
  const [noteColor, setNoteColor] = useState('#FFF9C4')
  const [edgeColor, setEdgeColor] = useState('#2B211B')
  const [edgeType,  setEdgeType]  = useState<'arrow'|'line'>('arrow')

  // ドラッグ
  const dragRef    = useRef<{id:string;ox:number;oy:number;mx:number;my:number} | null>(null)
  // パン
  const panRef     = useRef<{sx:number;sy:number;ox:number;oy:number} | null>(null)
  const [pan,      setPan]        = useState({x:0,y:0})
  // 線接続
  const edgeFromRef = useRef<string|null>(null)
  // 編集
  const [editing,   setEditing]   = useState<{id:string;text:string} | null>(null)
  // 保存
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  // ===== 初期ロード =====
  useEffect(() => {
    supabase.from('story_boards').select('data').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data?.data) {
          const d = data.data as BoardData
          setNodes(d.nodes || [])
          setEdges(d.edges || [])
        }
      })
  }, [userId])

  // ===== 自動保存 =====
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
    setNodes(prev => { const next = fn(prev); scheduleSave(next, edges); return next })
  }
  function updateEdges(fn: (prev: Edge[]) => Edge[]) {
    setEdges(prev => { const next = fn(prev); scheduleSave(nodes, next); return next })
  }

  // ===== ボードクリック → ノード追加 =====
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (tool === 'select' || tool === 'edge') return
    const rect = svgRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left - pan.x
    const y = e.clientY - rect.top - pan.y
    const sz = DEFAULT_NODE_SIZE[tool as Node['type']]
    const node: Node = {
      id: genId(), type: tool as Node['type'],
      x: x - sz.w/2, y: y - sz.h/2,
      w: sz.w, h: sz.h,
      color: noteColor, text: '', fontSize: 12,
    }
    updateNodes(prev => [...prev, node])
    setSelected(node.id)
    setTool('select')
  }

  // ===== ノードドラッグ開始 =====
  function handleNodeMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()

    if (tool === 'edge') {
      // 線接続モード
      if (!edgeFromRef.current) {
        edgeFromRef.current = id
      } else if (edgeFromRef.current !== id) {
        const edge: Edge = {
          id: genId(), from: edgeFromRef.current, to: id,
          type: edgeType, color: edgeColor,
        }
        updateEdges(prev => [...prev, edge])
        edgeFromRef.current = null
      }
      return
    }

    setSelected(id)
    const node = nodes.find(n => n.id === id)!
    dragRef.current = { id, ox: node.x, oy: node.y, mx: e.clientX, my: e.clientY }
  }

  // ===== マウス移動 =====
  function handleMouseMove(e: React.MouseEvent) {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.mx
      const dy = e.clientY - dragRef.current.my
      updateNodes(prev => prev.map(n => n.id === dragRef.current!.id
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
    if (dragRef.current) { dragRef.current = null; scheduleSave(nodes, edges) }
    if (panRef.current)  { panRef.current = null }
  }

  // ===== パン開始（背景ドラッグ） =====
  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (tool !== 'select') return
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'rect' && (e.target as SVGElement).getAttribute('data-bg')) {
      setSelected(null)
      panRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y }
    }
  }

  // ===== ダブルクリックで編集 =====
  function handleDoubleClick(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const node = nodes.find(n => n.id === id)
    if (node) setEditing({ id, text: node.text })
  }

  function handleEditSave() {
    if (!editing) return
    updateNodes(prev => prev.map(n => n.id === editing.id ? { ...n, text: editing.text } : n))
    setEditing(null)
  }

  // ===== 選択ノードの操作 =====
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

  // ===== エッジの中点計算 =====
  function getNodeCenter(id: string) {
    const n = nodes.find(x => x.id === id)
    if (!n) return { x:0, y:0 }
    return { x: n.x + n.w/2, y: n.y + n.h/2 }
  }

  const BOARD_W = 3000, BOARD_H = 2000

  return (
    <div style={{
      width:'100%', height:'100%',
      display:'flex', flexDirection:'column',
      background:'#f8f7f4',
      borderRadius: isModal ? 0 : 12,
      overflow:'hidden',
      fontFamily:"'Noto Sans JP',sans-serif",
    }}>

      {/* ===== ツールバー ===== */}
      <div style={{
        display:'flex', alignItems:'center', gap:6, padding:'8px 12px',
        background:'#fff', borderBottom:'1px solid #F0D9C9',
        flexWrap:'wrap', flexShrink:0,
      }}>
        {/* 保存状態 */}
        <div style={{fontSize:11,color:saving?'#F26A21':saved?'#22c55e':'#B8AEA8',minWidth:60}}>
          {saving?'保存中…':saved?'保存済み':''}
        </div>

        <div style={{width:1,height:24,background:'#F0D9C9'}}/>

        {/* ツール選択 */}
        {([
          {id:'select',   label:'選択'},
          {id:'note',     label:'付箋'},
          {id:'circle',   label:'○'},
          {id:'rect',     label:'□'},
          {id:'triangle', label:'△'},
          {id:'arrow',    label:'→'},
          {id:'edge',     label:'接続'},
        ] as {id:string;label:string}[]).map(t => (
          <button key={t.id} onClick={()=>{ setTool(t.id as any); edgeFromRef.current=null }}
            style={{
              padding:'4px 10px', fontSize:12, borderRadius:6, border:'1px solid',
              cursor:'pointer',
              background: tool===t.id ? '#F26A21' : '#fff',
              color:       tool===t.id ? '#fff'    : '#2B211B',
              borderColor: tool===t.id ? '#F26A21' : '#F0D9C9',
              fontWeight:  tool===t.id ? 700       : 400,
            }}>
            {t.label}
          </button>
        ))}

        <div style={{width:1,height:24,background:'#F0D9C9'}}/>

        {/* カラーパレット（付箋・図形用） */}
        {tool !== 'edge' && (
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            {NOTE_COLORS.map(c => (
              <button key={c} onClick={()=>{ setNoteColor(c); if(selected) handleColorChange(c) }}
                style={{
                  width:18, height:18, borderRadius:'50%', border:'none', cursor:'pointer',
                  background:c,
                  outline: noteColor===c ? '2px solid #F26A21' : '1px solid rgba(0,0,0,0.15)',
                  outlineOffset:1,
                }}/>
            ))}
          </div>
        )}

        {/* 接続線の設定 */}
        {tool === 'edge' && (
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={()=>setEdgeType('arrow')}
              style={{padding:'3px 10px',fontSize:11,borderRadius:6,border:'1px solid',cursor:'pointer',
                background:edgeType==='arrow'?'#2B211B':'#fff',color:edgeType==='arrow'?'#fff':'#2B211B',borderColor:'#F0D9C9'}}>
              矢印
            </button>
            <button onClick={()=>setEdgeType('line')}
              style={{padding:'3px 10px',fontSize:11,borderRadius:6,border:'1px solid',cursor:'pointer',
                background:edgeType==='line'?'#2B211B':'#fff',color:edgeType==='line'?'#fff':'#2B211B',borderColor:'#F0D9C9'}}>
              直線
            </button>
            {EDGE_COLORS.map(c => (
              <button key={c} onClick={()=>setEdgeColor(c)}
                style={{width:18,height:18,borderRadius:'50%',border:'none',cursor:'pointer',
                  background:c,outline:edgeColor===c?'2px solid #F26A21':'1px solid rgba(0,0,0,0.15)',outlineOffset:1}}/>
            ))}
          </div>
        )}

        {/* 選択中ノードの操作 */}
        {selectedNode && tool === 'select' && (
          <>
            <div style={{width:1,height:24,background:'#F0D9C9'}}/>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              {NOTE_COLORS.map(c => (
                <button key={c} onClick={()=>handleColorChange(c)}
                  style={{width:18,height:18,borderRadius:'50%',border:'none',cursor:'pointer',
                    background:c,outline:selectedNode.color===c?'2px solid #F26A21':'1px solid rgba(0,0,0,0.15)',outlineOffset:1}}/>
              ))}
            </div>
            <button onClick={()=>handleFontSizeChange(-1)} style={{padding:'3px 8px',fontSize:12,border:'1px solid #F0D9C9',borderRadius:6,background:'#fff',cursor:'pointer'}}>A-</button>
            <button onClick={()=>handleFontSizeChange(1)}  style={{padding:'3px 8px',fontSize:12,border:'1px solid #F0D9C9',borderRadius:6,background:'#fff',cursor:'pointer'}}>A+</button>
            <button onClick={handleDelete}
              style={{padding:'3px 10px',fontSize:12,border:'1px solid #fca5a5',borderRadius:6,background:'#fef2f2',color:'#dc2626',cursor:'pointer'}}>
              削除
            </button>
          </>
        )}

        <div style={{flex:1}}/>
        {onClose && (
          <button onClick={onClose}
            style={{padding:'4px 14px',fontSize:12,border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',cursor:'pointer'}}>
            閉じる
          </button>
        )}
      </div>

      {/* ===== ツール説明 ===== */}
      {tool === 'edge' && (
        <div style={{padding:'6px 12px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',fontSize:11,color:'#77706A'}}>
          {edgeFromRef.current ? '接続先のノードをクリック' : '接続元のノードをクリック'}
        </div>
      )}

      {/* ===== SVGボード ===== */}
      <div style={{flex:1,overflow:'hidden',position:'relative',
        cursor: tool==='select' ? 'default' : 'crosshair',
      }}>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          onClick={handleSvgClick}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{display:'block'}}
        >
          <defs>
            {/* 矢印マーカー */}
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#2B211B"/>
            </marker>
            <marker id="arrowhead-orange" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#F26A21"/>
            </marker>
            <marker id="arrowhead-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6"/>
            </marker>
            <marker id="arrowhead-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#e11d48"/>
            </marker>
            <marker id="arrowhead-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#22c55e"/>
            </marker>
            <marker id="arrowhead-purple" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#8b5cf6"/>
            </marker>
            <marker id="arrowhead-node" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#F26A21"/>
            </marker>
            {/* ドットグリッドパターン */}
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.1)"/>
            </pattern>
          </defs>

          {/* パン変換グループ */}
          <g transform={`translate(${pan.x},${pan.y})`}>
            {/* ドットグリッド背景 */}
            <rect data-bg="1" x={-pan.x} y={-pan.y} width="200%" height="200%"
              fill="url(#dots)" style={{pointerEvents:'none'}}/>

            {/* ===== エッジ（線） ===== */}
            {edges.map(edge => {
              const from = getNodeCenter(edge.from)
              const to   = getNodeCenter(edge.to)
              const markerMap: Record<string,string> = {
                '#2B211B':'url(#arrowhead)',
                '#F26A21':'url(#arrowhead-orange)',
                '#3b82f6':'url(#arrowhead-blue)',
                '#e11d48':'url(#arrowhead-red)',
                '#22c55e':'url(#arrowhead-green)',
                '#8b5cf6':'url(#arrowhead-purple)',
              }
              return (
                <line key={edge.id}
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edge.color} strokeWidth={2}
                  markerEnd={edge.type==='arrow'?(markerMap[edge.color]||'url(#arrowhead)'):''}
                  strokeDasharray={edge.type==='line'?'none':'none'}
                  style={{cursor:'pointer'}}
                  onClick={e=>{e.stopPropagation();updateEdges(prev=>prev.filter(x=>x.id!==edge.id))}}
                />
              )
            })}

            {/* ===== ノード ===== */}
            {nodes.map(node => (
              <NodeShape
                key={node.id}
                node={node}
                selected={selected === node.id}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                onDoubleClick={e => handleDoubleClick(e, node.id)}
              />
            ))}

            {/* 接続元のハイライト */}
            {edgeFromRef.current && (() => {
              const n = nodes.find(x => x.id === edgeFromRef.current)
              if (!n) return null
              return <rect x={n.x-3} y={n.y-3} width={n.w+6} height={n.h+6} rx={6}
                fill="none" stroke="#F26A21" strokeWidth={2.5} strokeDasharray="6 3" style={{pointerEvents:'none'}}/>
            })()}
          </g>
        </svg>
      </div>

      {/* ===== テキスト編集モーダル ===== */}
      {editing && (
        <div style={{position:'absolute',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'20px',width:300,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:10}}>テキストを編集</div>
            <textarea
              autoFocus
              value={editing.text}
              onChange={e=>setEditing({...editing,text:e.target.value})}
              onKeyDown={e=>{if(e.key==='Enter'&&e.metaKey)handleEditSave()}}
              rows={4}
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}
              placeholder="テキストを入力…"
            />
            <div style={{fontSize:10,color:'#B8AEA8',marginBottom:12}}>⌘+Enter で保存</div>
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
