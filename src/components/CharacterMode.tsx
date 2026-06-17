'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Character {
  id: string
  name: string
  memo: string
  color: string
  x: number
  y: number
}
interface Relation {
  id: string
  from: string
  to: string
  label: string
  color: string
}
interface CharacterData { characters: Character[]; relations: Relation[] }

const CHAR_COLORS = ['#F26A21','#3b82f6','#e11d48','#22c55e','#8b5cf6','#f59e0b','#06b6d4','#ec4899']
const RELATION_COLORS = [
  { color:'#e11d48', label:'対立' },
  { color:'#ec4899', label:'恋愛' },
  { color:'#3b82f6', label:'友好' },
  { color:'#8b5cf6', label:'師弟' },
  { color:'#77706A', label:'その他' },
]

const CARD_W = 130, CARD_H = 90
const BOARD_W = 3000, BOARD_H = 2000

function genId() { return Math.random().toString(36).slice(2,10) }

export default function CharacterMode({ userId }: { userId: string }) {
  const supabase = createClient()
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [characters, setCharacters] = useState<Character[]>([])
  const [relations,  setRelations]  = useState<Relation[]>([])
  const [selected,   setSelected]   = useState<string|null>(null)
  const [mode, setMode] = useState<'select'|'add'|'connect'>('select')
  const [newColor, setNewColor] = useState(CHAR_COLORS[0])
  const [viewBox, setViewBox] = useState({vx:0,vy:0,vw:BOARD_W,vh:BOARD_H})
  const [fitSize, setFitSize] = useState<{vw:number;vh:number}|null>(null)
  const [ready, setReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingChar, setEditingChar] = useState<Character|null>(null)
  const [relationPicker, setRelationPicker] = useState<{from:string;to:string}|null>(null)
  const [customLabel, setCustomLabel] = useState('')

  const dragRef = useRef<{id:string;ox:number;oy:number;mx:number;my:number}|null>(null)
  const panRef  = useRef<{sx:number;sy:number;ovx:number;ovy:number}|null>(null)
  const connectFromRef = useRef<string|null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const charsRef = useRef<Character[]>([])
  const relsRef  = useRef<Relation[]>([])

  useEffect(() => { setMounted(true) }, [])

  const computeFitSize = useCallback((): {vw:number;vh:number}|null => {
    if (!wrapRef.current) return null
    const rect = wrapRef.current.getBoundingClientRect()
    if (!rect.width||!rect.height) return null
    const aspect = rect.height/rect.width
    let vw = BOARD_W, vh = BOARD_W*aspect
    if (vh < BOARD_H) { vh = BOARD_H; vw = BOARD_H/aspect }
    if (!isFinite(vw)||!isFinite(vh)) return null
    return {vw,vh}
  }, [])

  const clampViewBox = useCallback((vx:number,vy:number,vw:number,vh:number,fit:{vw:number;vh:number}|null) => {
    const maxVw = fit?fit.vw:BOARD_W, maxVh = fit?fit.vh:BOARD_H
    const minVw = BOARD_W*0.1
    const cw = Math.min(Math.max(vw,minVw),maxVw)
    const ratio = vh/vw
    const ch = isFinite(ratio)&&ratio>0 ? cw*ratio : maxVh
    const cx = cw>=BOARD_W ? (BOARD_W-cw)/2 : Math.min(Math.max(vx,0),Math.max(0,BOARD_W-cw))
    const cy = ch>=BOARD_H ? (BOARD_H-ch)/2 : Math.min(Math.max(vy,0),Math.max(0,BOARD_H-ch))
    if (!isFinite(cx)||!isFinite(cy)) return {vx:0,vy:0,vw:BOARD_W,vh:BOARD_H}
    return {vx:cx,vy:cy,vw:cw,vh:ch}
  }, [])

  useEffect(() => {
    if (!mounted) return
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        const fit = computeFitSize(); if (!fit) return
        setFitSize(fit)
        setViewBox({vx:(BOARD_W-fit.vw)/2,vy:(BOARD_H-fit.vh)/2,vw:fit.vw,vh:fit.vh})
        setReady(true)
      })
      ;(id1 as any).id2 = id2
    })
    return () => { cancelAnimationFrame(id1); if((id1 as any).id2) cancelAnimationFrame((id1 as any).id2) }
  }, [mounted, computeFitSize])

  useEffect(() => {
    if (!mounted) return
    supabase.from('story_boards').select('character_data').eq('user_id', userId).maybeSingle()
      .then(({data,error}) => {
        if (error) { console.error(error); return }
        if (data?.character_data) {
          const d = data.character_data as CharacterData
          setCharacters(d.characters||[]); charsRef.current = d.characters||[]
          setRelations(d.relations||[]); relsRef.current = d.relations||[]
        }
      })
  }, [userId, mounted])

  const doSave = useCallback(async (c: Character[], r: Relation[]) => {
    setSaving(true)
    const { error } = await supabase.from('story_boards').upsert(
      { user_id: userId, character_data: { characters: c, relations: r }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(()=>setSaved(false),2000) }
  }, [userId])

  const scheduleSave = useCallback((c: Character[], r: Relation[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(c,r), 800)
  }, [doSave])

  function updateChars(fn:(prev:Character[])=>Character[]) {
    setCharacters(prev => { const next = fn(prev); charsRef.current = next; scheduleSave(next, relsRef.current); return next })
  }
  function updateRels(fn:(prev:Relation[])=>Relation[]) {
    setRelations(prev => { const next = fn(prev); relsRef.current = next; scheduleSave(charsRef.current, next); return next })
  }

  function screenToBoard(clientX:number, clientY:number) {
    if (!svgRef.current) return {x:0,y:0}
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width) return {x:0,y:0}
    return { x: viewBox.vx+(clientX-rect.left)*(viewBox.vw/rect.width), y: viewBox.vy+(clientY-rect.top)*(viewBox.vh/rect.height) }
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== 'add') return
    const {x,y} = screenToBoard(e.clientX,e.clientY)
    const cx = Math.min(Math.max(x-CARD_W/2,0),BOARD_W-CARD_W)
    const cy = Math.min(Math.max(y-CARD_H/2,0),BOARD_H-CARD_H)
    const char: Character = { id:genId(), name:'新キャラ', memo:'', color:newColor, x:cx, y:cy }
    updateChars(prev=>[...prev,char])
    setSelected(char.id)
    setMode('select')
    setEditingChar(char)
  }

  function handleCardMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (mode==='connect') {
      if (!connectFromRef.current) connectFromRef.current = id
      else if (connectFromRef.current !== id) {
        setRelationPicker({ from: connectFromRef.current, to: id })
        connectFromRef.current = null
      }
      return
    }
    setSelected(id)
    const c = charsRef.current.find(x=>x.id===id); if (!c) return
    dragRef.current = { id, ox:c.x, oy:c.y, mx:e.clientX, my:e.clientY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width) return
    const sx = viewBox.vw/rect.width, sy = viewBox.vh/rect.height

    if (dragRef.current) {
      const dr = dragRef.current
      const dx=(e.clientX-dr.mx)*sx, dy=(e.clientY-dr.my)*sy
      const nx = Math.min(Math.max(dr.ox+dx,0),BOARD_W-CARD_W)
      const ny = Math.min(Math.max(dr.oy+dy,0),BOARD_H-CARD_H)
      setCharacters(prev=>prev.map(c=>c.id===dr.id?{...c,x:nx,y:ny}:c))
    }
    if (panRef.current) {
      const pr = panRef.current
      const dx=(e.clientX-pr.sx)*sx, dy=(e.clientY-pr.sy)*sy
      setViewBox(v=>clampViewBox(pr.ovx-dx,pr.ovy-dy,v.vw,v.vh,fitSize))
    }
  }
  function handleMouseUp() {
    if (dragRef.current) setCharacters(prev=>{charsRef.current=prev; scheduleSave(prev,relsRef.current); return prev})
    dragRef.current=null; panRef.current=null
  }
  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (mode!=='select') return
    const target = e.target as SVGElement
    if (target===svgRef.current || target.getAttribute('data-bg')==='1') {
      setSelected(null); connectFromRef.current=null
      panRef.current = {sx:e.clientX,sy:e.clientY,ovx:viewBox.vx,ovy:viewBox.vy}
    }
  }
  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault()
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width) return
    const factor = e.deltaY>0?1.1:0.9
    setViewBox(v=>{
      const newVw=v.vw*factor, newVh=v.vh*factor
      const mx=v.vx+(e.clientX-rect.left)*(v.vw/rect.width), my=v.vy+(e.clientY-rect.top)*(v.vh/rect.height)
      const ratio=newVw/v.vw
      return clampViewBox(mx-(mx-v.vx)*ratio, my-(my-v.vy)*ratio, newVw, newVh, fitSize)
    })
  }
  function zoomBy(factor:number) { setViewBox(v=>{ const cx=v.vx+v.vw/2, cy=v.vy+v.vh/2, newVw=v.vw*factor, newVh=v.vh*factor; return clampViewBox(cx-newVw/2,cy-newVh/2,newVw,newVh,fitSize) }) }
  function fitToScreen() { const fit=computeFitSize(); if(!fit) return; setFitSize(fit); setViewBox({vx:(BOARD_W-fit.vw)/2,vy:(BOARD_H-fit.vh)/2,vw:fit.vw,vh:fit.vh}) }

  function handleDeleteChar() {
    if (!selected) return
    updateChars(prev=>prev.filter(c=>c.id!==selected))
    updateRels(prev=>prev.filter(r=>r.from!==selected&&r.to!==selected))
    setSelected(null)
  }
  function getCardCenter(id:string) { const c=charsRef.current.find(x=>x.id===id); if(!c) return {x:0,y:0}; return {x:c.x+CARD_W/2,y:c.y+CARD_H/2} }

  function confirmRelation(label: string, color: string) {
    if (!relationPicker) return
    updateRels(prev=>[...prev,{id:genId(),from:relationPicker.from,to:relationPicker.to,label,color}])
    setRelationPicker(null); setCustomLabel('')
  }

  function handleSaveCharEdit() {
    if (!editingChar) return
    updateChars(prev=>prev.map(c=>c.id===editingChar.id?editingChar:c))
    setEditingChar(null)
  }

  if (!mounted) return null
  const zoomPercent = fitSize&&fitSize.vw>0 ? Math.round((fitSize.vw/viewBox.vw)*100) : 100
  const selectedChar = characters.find(c=>c.id===selected)

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',flexWrap:'wrap',flexShrink:0}}>
        <span style={{fontSize:11,color:saving?'#F26A21':saved?'#22c55e':'transparent',minWidth:70,fontWeight:600}}>{saving?'保存中…':saved?'保存済み':'　'}</span>
        <div style={{width:1,height:30,background:'#F0D9C9'}}/>
        <button onClick={()=>{setMode('select');connectFromRef.current=null}}
          style={{padding:'9px 16px',fontSize:13,borderRadius:9,border:'1.5px solid',cursor:'pointer',background:mode==='select'?'#F26A21':'#fff',color:mode==='select'?'#fff':'#2B211B',borderColor:mode==='select'?'#F26A21':'#F0D9C9',fontWeight:mode==='select'?700:400}}>
          選択
        </button>
        <button onClick={()=>{setMode('add');connectFromRef.current=null}}
          style={{padding:'9px 16px',fontSize:13,borderRadius:9,border:'1.5px solid',cursor:'pointer',background:mode==='add'?'#F26A21':'#fff',color:mode==='add'?'#fff':'#2B211B',borderColor:mode==='add'?'#F26A21':'#F0D9C9',fontWeight:mode==='add'?700:400}}>
          ＋ キャラ追加
        </button>
        <button onClick={()=>{setMode('connect');setSelected(null)}}
          style={{padding:'9px 16px',fontSize:13,borderRadius:9,border:'1.5px solid',cursor:'pointer',background:mode==='connect'?'#F26A21':'#fff',color:mode==='connect'?'#fff':'#2B211B',borderColor:mode==='connect'?'#F26A21':'#F0D9C9',fontWeight:mode==='connect'?700:400}}>
          関係性をつなぐ
        </button>

        {mode==='add' && (
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            {CHAR_COLORS.map(c=>(<button key={c} onClick={()=>setNewColor(c)} style={{width:24,height:24,borderRadius:'50%',border:'none',cursor:'pointer',background:c,outline:newColor===c?'2.5px solid #2B211B':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>))}
          </div>
        )}

        {selectedChar && mode==='select' && (
          <>
            <button onClick={()=>setEditingChar(selectedChar)} style={{padding:'8px 14px',fontSize:12,border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#2B211B',cursor:'pointer',fontWeight:600}}>編集</button>
            <button onClick={handleDeleteChar} style={{padding:'8px 14px',fontSize:12,border:'1px solid #fca5a5',borderRadius:8,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontWeight:600}}>削除</button>
          </>
        )}

        <div style={{flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:4,background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,padding:4}}>
          <button onClick={()=>zoomBy(0.9)} style={{width:30,height:30,border:'none',background:'#FFF9F2',borderRadius:7,cursor:'pointer',fontSize:15,fontWeight:700,color:'#77706A'}}>＋</button>
          <span style={{minWidth:44,textAlign:'center',fontSize:12,fontWeight:700,color:'#2B211B'}}>{zoomPercent}%</span>
          <button onClick={()=>zoomBy(1.1)} style={{width:30,height:30,border:'none',background:'#FFF9F2',borderRadius:7,cursor:'pointer',fontSize:15,fontWeight:700,color:'#77706A'}}>−</button>
          <div style={{width:1,height:18,background:'#F0D9C9',margin:'0 2px'}}/>
          <button onClick={fitToScreen} style={{padding:'0 10px',height:30,border:'none',background:'#FFF9F2',borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:600,color:'#77706A'}}>全体表示</button>
        </div>
      </div>

      {mode==='add' && (
        <div style={{padding:'6px 14px',background:'#FFF1E6',borderBottom:'1px solid #F0D9C9',fontSize:12,color:'#F26A21',fontWeight:600}}>
          ボード上をクリックしてキャラクターを追加
        </div>
      )}
      {mode==='connect' && (
        <div style={{padding:'6px 14px',background:'#FFF1E6',borderBottom:'1px solid #F0D9C9',fontSize:12,color:'#F26A21',fontWeight:600}}>
          {connectFromRef.current ? '関係をつなぐ相手のカードをクリック' : '関係をつなぐ1人目のカードをクリック'}
        </div>
      )}

      <div ref={wrapRef} style={{flex:1,overflow:'hidden',position:'relative',cursor:mode==='select'?'default':'pointer',background:'#ddd4c4'}}>
        {ready && (
          <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="none"
            viewBox={`${viewBox.vx} ${viewBox.vy} ${viewBox.vw} ${viewBox.vh}`}
            onClick={handleSvgClick} onMouseDown={handleSvgMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} style={{display:'block'}}>
            <defs>
              <pattern id="cdots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.1)"/></pattern>
              {RELATION_COLORS.map(r=>(<marker key={r.color} id={`rh-${r.color.replace('#','')}`} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 9 3.5, 0 7" fill={r.color}/></marker>))}
            </defs>
            <rect data-bg="1" x={-BOARD_W} y={-BOARD_H} width={BOARD_W*3} height={BOARD_H*3} fill="#ddd4c4" style={{pointerEvents:'all'}}/>
            <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#fdfaf5" stroke="#F26A21" strokeWidth={4} vectorEffect="non-scaling-stroke" style={{pointerEvents:'none',filter:'drop-shadow(0 2px 12px rgba(0,0,0,0.1))'}}/>
            <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="url(#cdots)" style={{pointerEvents:'none'}}/>

            {/* 関係性の線 */}
            {relations.map(rel=>{
              const from=getCardCenter(rel.from), to=getCardCenter(rel.to)
              const mx=(from.x+to.x)/2, my=(from.y+to.y)/2
              return (
                <g key={rel.id}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={rel.color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" markerEnd={`url(#rh-${rel.color.replace('#','')})`}/>
                  <rect x={mx-26} y={my-11} width={52} height={20} rx={10} fill="#fff" stroke={rel.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke"/>
                  <text x={mx} y={my+4} textAnchor="middle" fontSize={11} fill={rel.color} fontFamily="'Noto Sans JP',sans-serif" fontWeight={700} style={{userSelect:'none'}}>{rel.label}</text>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth={16} vectorEffect="non-scaling-stroke" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();updateRels(prev=>prev.filter(x=>x.id!==rel.id))}}/>
                </g>
              )
            })}

            {/* キャラクターカード */}
            {characters.map(c=>(
              <g key={c.id} onMouseDown={e=>handleCardMouseDown(e,c.id)} style={{cursor:mode==='select'?'move':'pointer'}}>
                <rect x={c.x} y={c.y} width={CARD_W} height={CARD_H} rx={10}
                  fill="#fff" stroke={selected===c.id?'#F26A21':c.color} strokeWidth={selected===c.id?3:2.5}
                  vectorEffect="non-scaling-stroke" style={{filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.12))'}}/>
                <rect x={c.x} y={c.y} width={CARD_W} height={8} rx={4} fill={c.color}/>
                <text x={c.x+CARD_W/2} y={c.y+36} textAnchor="middle" fontSize={15} fontWeight={700} fill="#2B211B" fontFamily="'Noto Serif JP',serif" style={{userSelect:'none'}}>
                  {c.name.length>8?c.name.slice(0,8)+'…':c.name}
                </text>
                {c.memo && (
                  <text x={c.x+CARD_W/2} y={c.y+58} textAnchor="middle" fontSize={10} fill="#77706A" fontFamily="'Noto Sans JP',sans-serif" style={{userSelect:'none'}}>
                    {c.memo.length>14?c.memo.slice(0,14)+'…':c.memo}
                  </text>
                )}
                {connectFromRef.current===c.id && (
                  <rect x={c.x-4} y={c.y-4} width={CARD_W+8} height={CARD_H+8} rx={12} fill="none" stroke="#F26A21" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeDasharray="6 3" style={{pointerEvents:'none'}}/>
                )}
              </g>
            ))}
          </svg>
        )}

        {characters.length===0 && (
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',color:'#B8AEA8',pointerEvents:'none'}}>
            <div style={{fontSize:14,marginBottom:6}}>キャラクターがまだいません</div>
            <div style={{fontSize:12}}>「＋ キャラ追加」を押してボードをクリック</div>
          </div>
        )}

        <div style={{position:'absolute',bottom:12,right:12,fontSize:11,color:'#B8AEA8',background:'rgba(255,255,255,0.8)',padding:'4px 10px',borderRadius:8,pointerEvents:'none'}}>
          ホイールで拡大縮小・背景ドラッグで移動
        </div>
      </div>

      {/* キャラ編集モーダル */}
      {editingChar && (
        <div style={{position:'absolute',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'22px',width:320,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#2B211B',marginBottom:14}}>キャラクターを編集</div>
            <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>名前</label>
            <input value={editingChar.name} onChange={e=>setEditingChar({...editingChar,name:e.target.value})}
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',marginBottom:12,boxSizing:'border-box'}}/>
            <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>一言メモ（性格・役割など）</label>
            <input value={editingChar.memo} onChange={e=>setEditingChar({...editingChar,memo:e.target.value})}
              placeholder="例：主人公の幼馴染、活発"
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',marginBottom:12,boxSizing:'border-box'}}/>
            <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:6}}>カラー</label>
            <div style={{display:'flex',gap:6,marginBottom:18}}>
              {CHAR_COLORS.map(c=>(<button key={c} onClick={()=>setEditingChar({...editingChar,color:c})}
                style={{width:26,height:26,borderRadius:'50%',border:'none',cursor:'pointer',background:c,outline:editingChar.color===c?'2.5px solid #2B211B':'1px solid rgba(0,0,0,0.2)',outlineOffset:1}}/>))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditingChar(null)} style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleSaveCharEdit} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 関係性ラベル選択モーダル */}
      {relationPicker && (
        <div style={{position:'absolute',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'22px',width:300,boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#2B211B',marginBottom:14}}>関係性を選択</div>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
              {RELATION_COLORS.map(r=>(
                <button key={r.label} onClick={()=>confirmRelation(r.label,r.color)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:'1.5px solid #F0D9C9',borderRadius:9,background:'#fff',cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:14,height:14,borderRadius:'50%',background:r.color}}/>
                  <span style={{fontSize:13,color:'#2B211B',fontWeight:600}}>{r.label}</span>
                </button>
              ))}
            </div>
            <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:6}}>自由入力</label>
            <div style={{display:'flex',gap:8}}>
              <input value={customLabel} onChange={e=>setCustomLabel(e.target.value.slice(0,6))}
                placeholder="例：家族"
                style={{flex:1,padding:'8px 10px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none'}}/>
              <button onClick={()=>customLabel.trim()&&confirmRelation(customLabel.trim(),'#77706A')}
                disabled={!customLabel.trim()}
                style={{padding:'8px 16px',border:'none',borderRadius:8,background:customLabel.trim()?'#F26A21':'#F0D9C9',color:'#fff',fontSize:13,fontWeight:700,cursor:customLabel.trim()?'pointer':'not-allowed'}}>
                追加
              </button>
            </div>
            <button onClick={()=>{setRelationPicker(null);setCustomLabel('')}}
              style={{width:'100%',marginTop:14,padding:'9px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
