'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Announcement {
  id: string; title: string; body: string; type: string;
  link: string | null; image_url: string | null; is_published: boolean; created_at: string
}

const btn = (color: string, bg: string, border: string) => ({
  padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',
  color,background:bg,border:`1px solid ${border}`,
})

const TYPE_OPTIONS = [
  { value: 'info',      label: 'お知らせ',       color: '#3b82f6' },
  { value: 'important', label: '重要なお知らせ',  color: '#ef4444' },
  { value: 'contest',   label: 'コンテスト',      color: '#F26A21' },
]

function getType(t: string) {
  return TYPE_OPTIONS.find(o => o.value === t) ?? TYPE_OPTIONS[0]
}

function validate(form: { title:string; body:string; link:string; type:string; image_url:string }) {
  const errors: Record<string, string> = {}
  if (!form.type) errors.type = '種別は必須です'
  if (!form.title.trim()) errors.title = 'タイトルは必須です'
  if (!form.body.trim()) errors.body = '本文は必須です'
  return errors
}

export default function AnnouncementManager({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const supabase = createClient()
  const [items, setItems] = useState(initialAnnouncements)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title:'', body:'', type:'info', link:'', image_url:'', is_published:true })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  function openCreate() {
    setForm({title:'',body:'',type:'info',link:'',image_url:'',is_published:true})
    setErrors({})
    setCreating(true); setEditing(null)
  }
  function openEdit(a: Announcement) {
    setForm({title:a.title,body:a.body,type:a.type,link:a.link||'',image_url:a.image_url||'',is_published:a.is_published})
    setErrors({})
    setEditing(a); setCreating(false)
  }
  function closeForm() { setCreating(false); setEditing(null); setErrors({}) }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `announcements/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      setForm(f => ({...f, image_url: data.publicUrl}))
      setErrors(ev => ({...ev, image_url: ''}))
    }
    setUploading(false)
  }

  async function handleSave() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    const payload = { ...form, image_url: form.image_url || null, link: form.link || null }
    if (creating) {
      const { data } = await supabase.from('announcements').insert(payload).select().single()
      if (data) setItems([data, ...items])
    } else if (editing) {
      await supabase.from('announcements').update(payload).eq('id', editing.id)
      setItems(items.map(i => i.id === editing.id ? {...i,...payload} : i))
    }
    setLoading(false); closeForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('announcements').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  async function togglePublish(a: Announcement) {
    await supabase.from('announcements').update({is_published:!a.is_published}).eq('id', a.id)
    setItems(items.map(i => i.id === a.id ? {...i,is_published:!a.is_published} : i))
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
        <button onClick={openCreate} style={{...btn('#fff','#F26A21','#F26A21'),fontSize:13,padding:'8px 20px'}}>
          ＋ お知らせを作成
        </button>
      </div>

      {(creating || editing) && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:16}}>{creating?'新規作成':'編集'}</div>
          <div style={{display:'grid',gap:12}}>

            {/* 種別 */}
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>種別 <span style={{color:'#ef4444'}}>*</span></label>
              <select value={form.type} onChange={e=>{setForm({...form,type:e.target.value});setErrors(ev=>({...ev,type:''}))}}
                style={inputStyle('type')}>
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.type && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.type}</div>}
            </div>

            {/* URL */}
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>URL <span style={{color:'#94a3b8',fontSize:10}}>(任意)</span></label>
              <input value={form.link} onChange={e=>{setForm({...form,link:e.target.value});setErrors(ev=>({...ev,link:''}))}}
                style={inputStyle('link')} placeholder="https://..."/>
              {errors.link && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.link}</div>}
            </div>

            {/* タイトル */}
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>タイトル <span style={{color:'#ef4444'}}>*</span></label>
              <input value={form.title} onChange={e=>{setForm({...form,title:e.target.value});setErrors(ev=>({...ev,title:''}))}}
                style={inputStyle('title')} placeholder="タイトルを入力"/>
              {errors.title && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.title}</div>}
            </div>

            {/* 本文 */}
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>本文 <span style={{color:'#ef4444'}}>*</span></label>
              <textarea value={form.body} onChange={e=>{setForm({...form,body:e.target.value});setErrors(ev=>({...ev,body:''}))}} rows={4}
                style={{...inputStyle('body'),resize:'vertical' as const}} placeholder="本文を入力"/>
              {errors.body && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.body}</div>}
            </div>

            {/* 画像（必須） */}
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:6}}>
                バナー画像 <span style={{color:'#94a3b8',fontSize:10}}>(任意)</span>
                <span style={{fontSize:10,color:'#94a3b8',fontWeight:400,marginLeft:6}}>推奨サイズ：600×300px（2:1）</span>
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{fontSize:12,marginBottom:4}}/>
              {uploading && <div style={{fontSize:12,color:'#64748b'}}>アップロード中...</div>}
              {errors.image_url && !form.image_url && <div style={{fontSize:11,color:'#ef4444',marginTop:3}}>{errors.image_url}</div>}
              {form.image_url && (
                <div style={{marginTop:8}}>
                  <img src={form.image_url} alt="プレビュー" style={{maxWidth:400,maxHeight:150,objectFit:'contain',borderRadius:8,border:'1px solid #e2e8f0',display:'block',marginBottom:8,background:'#fff'}}/>
                  <button onClick={()=>setForm(f=>({...f,image_url:''}))}
                    style={{...btn('#dc2626','#fef2f2','#fca5a5'),fontSize:11}}>画像を削除</button>
                </div>
              )}
            </div>

            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_published} onChange={e=>setForm({...form,is_published:e.target.checked})}/>
              公開する
            </label>
          </div>

          <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
            <button onClick={closeForm} style={btn('#64748b','#fff','#e2e8f0')}>キャンセル</button>
            <button onClick={handleSave} disabled={loading}
              style={{...btn('#fff', loading?'#fdba74':'#F26A21', loading?'#fdba74':'#F26A21'),opacity:loading?0.7:1}}>
              {loading?'保存中...':'保存する'}
            </button>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        {items.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>お知らせがありません</div>
        ) : items.map((a, idx) => {
          const t = getType(a.type)
          return (
            <div key={a.id} style={{padding:'14px 20px',borderBottom:idx<items.length-1?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:12}}>
              {a.image_url
                ? <img src={a.image_url} alt="" style={{width:90,height:30,objectFit:'contain',borderRadius:4,flexShrink:0,background:'#fff'}}/>
                : <div style={{width:90,height:30,borderRadius:4,flexShrink:0,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#94a3b8'}}>画像なし</div>
              }
              <span style={{fontSize:10,fontWeight:700,color:t.color,background:`${t.color}18`,border:`1px solid ${t.color}40`,padding:'2px 8px',borderRadius:4,flexShrink:0}}>
                {t.label}
              </span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:'#1e293b',marginBottom:1}}>{a.title}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{new Date(a.created_at).toLocaleDateString('ja-JP')}</div>
              </div>
              {!a.is_published && <span style={{fontSize:11,color:'#94a3b8',background:'#f1f5f9',padding:'2px 8px',borderRadius:4}}>非公開</span>}
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>togglePublish(a)} style={btn(a.is_published?'#f59e0b':'#10b981',a.is_published?'#fffbeb':'#f0fdf4',a.is_published?'#fde68a':'#86efac')}>
                  {a.is_published?'非公開':'公開'}
                </button>
                <button onClick={()=>openEdit(a)} style={btn('#3b82f6','#eff6ff','#bfdbfe')}>編集</button>
                <button onClick={()=>handleDelete(a.id)} style={btn('#dc2626','#fef2f2','#fca5a5')}>削除</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
