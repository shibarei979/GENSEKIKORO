'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlotNote {
  id: string
  episode: number       // 話数
  type: 'plot' | 'foreshadow' | 'memo'
  title: string
  body: string
  resolved?: boolean     // 伏線の回収済みフラグ
  resolveEpisode?: number | null // 回収予定話数
}
interface PlotData { notes: PlotNote[] }

const TYPE_INFO: Record<PlotNote['type'], {label:string;color:string;bg:string}> = {
  plot:       { label:'プロット',  color:'#3b82f6', bg:'#eff6ff' },
  foreshadow: { label:'伏線',     color:'#e11d48', bg:'#fef2f2' },
  memo:       { label:'メモ',     color:'var(--color-text-muted)', bg:'#f5f0ea' },
}

function genId() { return Math.random().toString(36).slice(2,10) }

export default function PlotMode({ userId }: { userId: string }) {
  const supabase = createClient()
  const [notes, setNotes] = useState<PlotNote[]>([])
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [filterType, setFilterType] = useState<'all'|PlotNote['type']>('all')
  const [editing, setEditing] = useState<PlotNote|null>(null)
  const [showAddForEp, setShowAddForEp] = useState<number|null>(null)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const notesRef = useRef<PlotNote[]>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    supabase.from('story_boards').select('plot_data').eq('user_id', userId).maybeSingle()
      .then(({data,error}) => {
        if (error) { console.error(error); return }
        if (data?.plot_data) {
          const d = data.plot_data as PlotData
          setNotes(d.notes||[]); notesRef.current = d.notes||[]
        }
      })
  }, [userId, mounted])

  const doSave = useCallback(async (n: PlotNote[]) => {
    setSaving(true)
    const { error } = await supabase.from('story_boards').upsert(
      { user_id: userId, plot_data: { notes: n }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(()=>setSaved(false),2000) }
  }, [userId])

  const scheduleSave = useCallback((n: PlotNote[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(n), 800)
  }, [doSave])

  function updateNotes(fn:(prev:PlotNote[])=>PlotNote[]) {
    setNotes(prev => { const next = fn(prev); notesRef.current = next; scheduleSave(next); return next })
  }

  function handleAdd(episode: number, type: PlotNote['type']) {
    const note: PlotNote = { id:genId(), episode, type, title:'', body:'', resolved:false, resolveEpisode:null }
    updateNotes(prev=>[...prev,note])
    setEditing(note)
    setShowAddForEp(null)
  }
  function handleSaveEdit() {
    if (!editing) return
    updateNotes(prev=>prev.map(n=>n.id===editing.id?editing:n))
    setEditing(null)
  }
  function handleDelete(id: string) {
    updateNotes(prev=>prev.filter(n=>n.id!==id))
  }
  function toggleResolved(id: string) {
    updateNotes(prev=>prev.map(n=>n.id===id?{...n,resolved:!n.resolved}:n))
  }

  if (!mounted) return null

  // 話数ごとにグループ化
  const filtered = filterType==='all' ? notes : notes.filter(n=>n.type===filterType)
  const episodes = Array.from(new Set(filtered.map(n=>n.episode))).sort((a,b)=>a-b)
  const maxEp = Math.max(1, ...notes.map(n=>n.episode), ...episodes)
  // 表示する話数リスト（データがある話数＋次の空欄を1つ）
  const displayEpisodes = Array.from({length: maxEp+1}, (_,i)=>i+1)

  const unresolvedForeshadows = notes.filter(n=>n.type==='foreshadow' && !n.resolved)

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column'}}>
      {/* ヘッダー */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--color-bg)',borderBottom:'1px solid var(--color-brand-border)',flexWrap:'wrap',flexShrink:0}}>
        <span style={{fontSize:11,color:saving?'var(--color-brand)':saved?'#22c55e':'transparent',minWidth:70,fontWeight:600}}>{saving?'保存中…':saved?'保存済み':'　'}</span>
        <div style={{width:1,height:30,background:'var(--color-brand-border)'}}/>
        <span style={{fontSize:12,color:'var(--color-text-muted)',fontWeight:600}}>表示：</span>
        {(['all','plot','foreshadow','memo'] as const).map(t=>(
          <button key={t} onClick={()=>setFilterType(t)}
            style={{padding:'7px 14px',fontSize:12,borderRadius:8,border:'1.5px solid',cursor:'pointer',
              background: filterType===t ? (t==='all'?'var(--color-text)':TYPE_INFO[t as PlotNote['type']].color) : 'var(--color-bg-card)',
              color: filterType===t ? 'var(--color-bg-card)' : (t==='all'?'var(--color-text)':TYPE_INFO[t as PlotNote['type']].color),
              borderColor: filterType===t ? 'transparent' : 'var(--color-brand-border)', fontWeight:600}}>
            {t==='all'?'すべて':TYPE_INFO[t as PlotNote['type']].label}
          </button>
        ))}
        <div style={{flex:1}}/>
        {unresolvedForeshadows.length>0 && (
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8}}>
            <span style={{fontSize:11,color:'var(--color-danger)',fontWeight:700}}>未回収の伏線 {unresolvedForeshadows.length}件</span>
          </div>
        )}
      </div>

      {/* タイムライン本体 */}
      <div style={{flex:1,overflowY:'auto',padding:'20px 24px',background:'var(--color-bg)'}}>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          {displayEpisodes.map(ep => {
            const epNotes = filtered.filter(n=>n.episode===ep)
            const hasAny = notes.some(n=>n.episode===ep)
            if (!hasAny && ep !== maxEp+1 && ep !== maxEp) {
              // データがない中間話数はスキップしない（タイムラインの連続性のため表示するが簡略化も可）
            }
            return (
              <div key={ep} style={{display:'flex',gap:16,marginBottom:4}}>
                {/* 話数ラベル＋縦線 */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,width:64}}>
                  <div style={{
                    width:44,height:44,borderRadius:'50%',background:hasAny?'var(--color-brand)':'var(--color-brand-border)',
                    color:'var(--color-bg-card)',display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:13,fontWeight:700,flexShrink:0,
                  }}>
                    {ep}
                  </div>
                  <div style={{width:2,flex:1,background:'var(--color-brand-border)',marginTop:2,minHeight:20}}/>
                </div>

                {/* 話のコンテンツ */}
                <div style={{flex:1,paddingBottom:20,minWidth:0}}>
                  <div style={{fontSize:12,color:'var(--color-text-faint)',fontWeight:600,marginBottom:8,paddingTop:10}}>第{ep}話</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
                    {epNotes.map(note=>{
                      const info = TYPE_INFO[note.type]
                      return (
                        <div key={note.id} style={{
                          background:'var(--color-bg-card)',border:`1.5px solid ${note.type==='foreshadow'&&!note.resolved?'#fca5a5':'var(--color-brand-border)'}`,
                          borderRadius:10,padding:'12px 14px',position:'relative',
                          opacity: note.type==='foreshadow'&&note.resolved?0.6:1,
                        }}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                            <span style={{fontSize:10,background:info.bg,color:info.color,padding:'2px 8px',borderRadius:6,fontWeight:700}}>{info.label}</span>
                            {note.type==='foreshadow' && (
                              <button onClick={()=>toggleResolved(note.id)}
                                style={{fontSize:10,padding:'2px 8px',borderRadius:6,border:'1px solid',cursor:'pointer',
                                  background:note.resolved?'#f0fdf4':'var(--color-bg-card)',color:note.resolved?'#15803d':'var(--color-danger)',
                                  borderColor:note.resolved?'#86efac':'#fca5a5',fontWeight:600}}>
                                {note.resolved?'✓ 回収済み':'未回収'}
                              </button>
                            )}
                            {note.resolveEpisode && (
                              <span style={{fontSize:10,color:'var(--color-text-faint)'}}>→ 第{note.resolveEpisode}話で回収予定</span>
                            )}
                          </div>
                          <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:4}}>{note.title||'（無題）'}</div>
                          {note.body && <div style={{fontSize:12,color:'var(--color-text-muted)',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{note.body}</div>}
                          <div style={{display:'flex',gap:6,marginTop:8}}>
                            <button onClick={()=>setEditing(note)} style={{fontSize:11,padding:'4px 10px',border:'1px solid var(--color-brand-border)',borderRadius:6,background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'}}>編集</button>
                            <button onClick={()=>handleDelete(note.id)} style={{fontSize:11,padding:'4px 10px',border:'1px solid #fca5a5',borderRadius:6,background:'#fef2f2',color:'var(--color-danger)',cursor:'pointer'}}>削除</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 追加ボタン */}
                  {showAddForEp === ep ? (
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {(['plot','foreshadow','memo'] as const).map(t=>(
                        <button key={t} onClick={()=>handleAdd(ep,t)}
                          style={{fontSize:12,padding:'7px 14px',borderRadius:8,border:`1.5px solid ${TYPE_INFO[t].color}`,background:TYPE_INFO[t].bg,color:TYPE_INFO[t].color,cursor:'pointer',fontWeight:600}}>
                          ＋ {TYPE_INFO[t].label}
                        </button>
                      ))}
                      <button onClick={()=>setShowAddForEp(null)} style={{fontSize:12,padding:'7px 14px',borderRadius:8,border:'1px solid var(--color-brand-border)',background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'}}>キャンセル</button>
                    </div>
                  ) : (
                    <button onClick={()=>setShowAddForEp(ep)}
                      style={{fontSize:12,padding:'7px 14px',borderRadius:8,border:'1px dashed var(--color-brand-border)',background:'var(--color-bg-card)',color:'var(--color-text-faint)',cursor:'pointer'}}>
                      ＋ この話にメモを追加
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 編集モーダル */}
      {editing && (
        <div style={{position:'absolute',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)'}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:14,padding:'22px',width:380,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:11,background:TYPE_INFO[editing.type].bg,color:TYPE_INFO[editing.type].color,padding:'3px 10px',borderRadius:8,fontWeight:700}}>{TYPE_INFO[editing.type].label}</span>
              <span style={{fontSize:13,fontWeight:700,color:'var(--color-text)'}}>第{editing.episode}話</span>
            </div>

            <label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>タイトル</label>
            <input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}
              placeholder={editing.type==='foreshadow'?'例：謎の鍵の存在':'例：主人公が決意する'}
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',marginBottom:12,boxSizing:'border-box'}}/>

            <label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>詳細メモ</label>
            <textarea value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}
              rows={5}
              style={{width:'100%',padding:'8px 10px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',marginBottom:12,boxSizing:'border-box',fontFamily:'inherit'}}/>

            {editing.type==='foreshadow' && (
              <>
                <label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>回収予定の話数（省略可）</label>
                <input type="number" value={editing.resolveEpisode||''} onChange={e=>setEditing({...editing,resolveEpisode:e.target.value?Number(e.target.value):null})}
                  placeholder="例：15"
                  style={{width:'100%',padding:'8px 10px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',marginBottom:14,boxSizing:'border-box'}}/>
              </>
            )}

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditing(null)} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleSaveEdit} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer'}}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
