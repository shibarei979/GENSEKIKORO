'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Contest {
  id: string; title: string; description: string | null; prize: string | null;
  deadline: string | null; judging_end: string | null; apply_url: string | null;
  image_url: string | null; is_published: boolean; is_site_contest: boolean; created_at: string
}

interface Entry {
  novel_id: string
  novel_title: string
  author_name: string
  created_at: string
}

interface Props {
  initialContests: Contest[]
  entriesMap: Record<string, Entry[]>
}

const btn = (color: string, bg: string, border: string) => ({
  padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',color,background:bg,border:`1px solid ${border}`,
})

function getStatus(deadline: string | null, judging_end: string | null) {
  const now = new Date()
  if (!deadline) return { label: '募集中', color: '#10b981', bg: '#f0fdf4', border: '#86efac' }
  const d = new Date(deadline)
  if (now < d) return { label: '募集中', color: '#10b981', bg: '#f0fdf4', border: '#86efac' }
  if (!judging_end) return { label: '選考中', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' }
  const j = new Date(judging_end)
  if (now < j) return { label: '選考中', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' }
  const expire = new Date(j.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (now < expire) return { label: '結果発表', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' }
  return { label: '掲載終了', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' }
}

function validate(form: { title:string; apply_url:string; image_url:string; deadline:string; judging_end:string; is_site_contest:boolean }) {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'タイトルは必須です'
  if (!form.is_site_contest && !form.apply_url.trim()) errors.apply_url = '応募URLは必須です'
  if (!form.deadline) errors.deadline = '締切日時は必須です'
  if (!form.judging_end) errors.judging_end = '選考終了日時は必須です'
  if (form.deadline && form.judging_end && new Date(form.judging_end) <= new Date(form.deadline)) {
    errors.judging_end = '選考終了日時は締切日時より後にしてください'
  }
  if (!form.image_url) errors.image_url = '画像は必須です'
  return errors
}

export default function ContestManager({ initialContests, entriesMap }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initialContests)
  const [editing, setEditing] = useState<Contest | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', deadline:'', judging_end:'', apply_url:'', image_url:'', is_published:true, is_site_contest:false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function openCreate() {
    setForm({title:'',description:'',deadline:'',judging_end:'',apply_url:'',image_url:'',is_published:true,is_site_contest:false})
    setErrors({})
    setCreating(true); setEditing(null)
  }
  function openEdit(c: Contest) {
    setForm({
      title:c.title, description:c.description||'',
      deadline:c.deadline?c.deadline.slice(0,16):'',
      judging_end:c.judging_end?c.judging_end.slice(0,16):'',
      apply_url:c.apply_url||'', image_url:c.image_url||'', is_published:c.is_published, is_site_contest:c.is_site_contest||false
    })
    setErrors({})
    setEditing(c); setCreating(false)
  }
  function closeForm() { setCreating(false); setEditing(null); setErrors({}) }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `contests/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      setForm(f => ({...f, image_url: data.publicUrl}))
      setErrors(e => ({...e, image_url: ''}))
    }
    setUploading(false)
  }

  async function handleSave() {
    const errs = validate({title:form.title, apply_url:form.apply_url, image_url:form.image_url, deadline:form.deadline, judging_end:form.judging_end, is_site_contest:form.is_site_contest})
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    const payload = {
      ...form,
      deadline: new Date(form.deadline).toISOString(),
      judging_end: new Date(form.judging_end).toISOString(),
      image_url: form.image_url || null
    }
    if (creating) {
      const { data } = await supabase.from('contests').insert(payload).select().single()
      if (data) setItems([data, ...items])
    } else if (editing) {
      await supabase.from('contests').update(payload).eq('id', editing.id)
      setItems(items.map(i => i.id === editing.id ? {...i,...payload} : i))
    }
    setLoading(false); closeForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('contests').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  const inputStyle = (key: string) => ({
    padding:'7px 12px',
    border:`1px solid ${errors[key] ? '#fca5a5' : '#e2e8f0'}`,
    borderRadius:6, fontSize:13, width:'100%',
    background: errors[key] ? '#fef2f2' : '#fff'
  })

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button onClick={openCreate} style={{...btn('#fff','#F26A21','#F26A21'),fontSize:13,padding:'8px 20px'}}>＋ コンテストを作成</button>
      </div>

      {(creating || editing) && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:16}}>{creating?'新規作成':'編集'}</div>
          <div style={{display:'grid',gap:12}}>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>タイトル <span style={{color:'#ef4444'}}>*</span></label>
              <input value={form.title} onChange={e=>{setForm({...form,title:e.target.value});setErrors(ev=>({...ev,title:''}))}}
                style={inputStyle('title')} placeholder="第XX回 原石航路小説コンテスト"/>
              {errors.title && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.title}</div>}
            </div>
            {/* 外部コンテストのみ応募URL表示 */}
            {!form.is_site_contest && (
              <div>
                <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>応募URL <span style={{color:'#ef4444'}}>*</span></label>
                <input value={form.apply_url} onChange={e=>{setForm({...form,apply_url:e.target.value});setErrors(ev=>({...ev,apply_url:''}))}}
                  style={inputStyle('apply_url')} placeholder="https://..."/>
                {errors.apply_url && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.apply_url}</div>}
              </div>
            )}
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>説明</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3}
                style={{...inputStyle('description'),resize:'vertical' as const}} placeholder="コンテストの詳細"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>締切日時 <span style={{color:'#ef4444'}}>*</span></label>
                <input type="datetime-local" value={form.deadline} onChange={e=>{setForm({...form,deadline:e.target.value});setErrors(ev=>({...ev,deadline:'',judging_end:''}))}}
                  style={inputStyle('deadline')}/>
                {errors.deadline && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.deadline}</div>}
                {!errors.deadline && <div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>この日以降「選考中」になります</div>}
              </div>
              <div>
                <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>選考終了日時 <span style={{color:'#ef4444'}}>*</span></label>
                <input type="datetime-local" value={form.judging_end} onChange={e=>{setForm({...form,judging_end:e.target.value});setErrors(ev=>({...ev,judging_end:''}))}}
                  style={inputStyle('judging_end')}/>
                {errors.judging_end && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.judging_end}</div>}
                {!errors.judging_end && <div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>この日以降「結果発表」→1ヶ月で自動非表示</div>}
              </div>
            </div>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:6}}>
                バナー画像 <span style={{color:'#ef4444'}}>*</span>
                <span style={{fontSize:10,color:'#94a3b8',fontWeight:400,marginLeft:6}}>推奨サイズ：600×300px（2:1）</span>
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{fontSize:12,marginBottom:4}}/>
              {uploading && <div style={{fontSize:12,color:'#64748b'}}>アップロード中...</div>}
              {errors.image_url && !form.image_url && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.image_url}</div>}
              {form.image_url && (
                <div style={{marginTop:8}}>
                  <img src={form.image_url} alt="プレビュー" style={{maxWidth:400,maxHeight:150,objectFit:'contain',borderRadius:8,border:'1px solid #e2e8f0',display:'block',marginBottom:8,background:'#fff'}}/>
                  <button onClick={()=>setForm(f=>({...f,image_url:''}))} style={{...btn('#dc2626','#fef2f2','#fca5a5'),fontSize:11}}>画像を削除</button>
                </div>
              )}
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/>公開する
            </label>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>コンテスト種別</label>
              <div style={{display:'flex',gap:12}}>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
                  <input type="radio" name="contest_type" checked={!form.is_site_contest} onChange={()=>setForm({...form,is_site_contest:false})}/>
                  外部コンテスト（応募URLへ誘導）
                </label>
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
                  <input type="radio" name="contest_type" checked={form.is_site_contest} onChange={()=>setForm({...form,is_site_contest:true})}/>
                  サイトコンテスト（原石航路内で応募）
                </label>
              </div>
              <div style={{fontSize:10,color:'#94a3b8',marginTop:3}}>
                {form.is_site_contest ? 'マイページから作品を応募でき、コンテストページに応募作品が表示されます' : '外部の応募URLへ誘導します'}
              </div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
            <button onClick={closeForm} style={btn('#64748b','#fff','#e2e8f0')}>キャンセル</button>
            <button onClick={handleSave} disabled={loading} style={{...btn('#fff', loading?'#fdba74':'#F26A21', loading?'#fdba74':'#F26A21'),opacity:loading?0.7:1}}>
              {loading?'保存中...':'保存する'}
            </button>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        {items.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>コンテストがありません</div>
        ) : items.map((c, idx) => {
          const status = getStatus(c.deadline, c.judging_end)
          const contestEntries = entriesMap[c.id] || []
          const isExpanded = expandedId === c.id
          return (
            <div key={c.id} style={{borderBottom:idx<items.length-1?'1px solid #f1f5f9':'none'}}>
              <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:14}}>
                {c.image_url
                  ? <img src={c.image_url} alt="" style={{width:90,height:30,objectFit:'contain',borderRadius:6,flexShrink:0,background:'#fff'}}/>
                  : <div style={{width:90,height:30,borderRadius:6,flexShrink:0,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#94a3b8'}}>画像なし</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                    <span style={{fontSize:10,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'1px 7px',borderRadius:10}}>
                      {status.label}
                    </span>
                    {!c.is_published && <span style={{fontSize:10,color:'#94a3b8',background:'#f1f5f9',padding:'1px 7px',borderRadius:10}}>非公開</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'#1e293b',marginBottom:2}}>{c.title}</div>
                  <div style={{display:'flex',gap:12,fontSize:11,color:'#94a3b8'}}>
                    {c.deadline && <span>締切：{new Date(c.deadline).toLocaleDateString('ja-JP')}</span>}
                    {c.judging_end && <span>選考終了：{new Date(c.judging_end).toLocaleDateString('ja-JP')}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                  {/* 応募一覧ボタン */}
                  <button onClick={()=>setExpandedId(isExpanded ? null : c.id)}
                    style={{...btn('#F26A21','#FFF1E6','#f5b080'),fontSize:11}}>
                    応募 {contestEntries.length}件 {isExpanded ? '▲' : '▼'}
                  </button>
                  <button onClick={async()=>{await supabase.from('contests').update({is_published:!c.is_published}).eq('id',c.id);setItems(items.map(x=>x.id===c.id?{...x,is_published:!c.is_published}:x))}}
                    style={btn(c.is_published?'#f59e0b':'#10b981',c.is_published?'#fffbeb':'#f0fdf4',c.is_published?'#fde68a':'#86efac')}>
                    {c.is_published?'非公開':'公開'}
                  </button>
                  {c.is_site_contest && (
                    <a href={`/contests/${c.id}`} target="_blank" rel="noopener noreferrer"
                      style={{...btn('#8b5cf6','#f5f3ff','#c4b5fd'),textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                      ページ
                    </a>
                  )}
                  <button onClick={()=>openEdit(c)} style={btn('#3b82f6','#eff6ff','#bfdbfe')}>編集</button>
                  <button onClick={()=>handleDelete(c.id)} style={btn('#dc2626','#fef2f2','#fca5a5')}>削除</button>
                </div>
              </div>
              {/* 応募一覧 */}
              {isExpanded && (
                <div style={{borderTop:'1px solid #f1f5f9',background:'#f8fafc',padding:'12px 20px'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginBottom:8}}>応募作品一覧（{contestEntries.length}件）</div>
                  {contestEntries.length === 0 ? (
                    <div style={{fontSize:12,color:'#94a3b8'}}>応募作品はまだありません</div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {contestEntries.map((e, i) => (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#fff',borderRadius:8,border:'1px solid #e2e8f0'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <Link href={`/novel/${e.novel_id}`} target="_blank"
                              style={{fontSize:13,fontWeight:600,color:'#F26A21',textDecoration:'none'}}>{e.novel_title}</Link>
                            <div style={{fontSize:11,color:'#94a3b8'}}>作者：{e.author_name} · 応募日：{new Date(e.created_at).toLocaleDateString('ja-JP')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
