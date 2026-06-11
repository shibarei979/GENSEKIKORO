'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Banner { id: string; title: string; image_url: string|null; link_url: string|null; position: string; is_active: boolean; created_at: string }

const btn = (color: string, bg: string, border: string) => ({
  padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',color,background:bg,border:`1px solid ${border}`,
})

const POSITIONS = [{ v:'sidebar', l:'サイドバー' },{ v:'home', l:'ホーム' },{ v:'header', l:'ヘッダー' }]

export default function BannerManager({ initialBanners }: { initialBanners: Banner[] }) {
  const supabase = createClient()
  const [items, setItems] = useState(initialBanners)
  const [editing, setEditing] = useState<Banner|null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title:'', image_url:'', link_url:'', position:'sidebar', is_active:true })
  const [loading, setLoading] = useState(false)

  function openCreate() { setForm({title:'',image_url:'',link_url:'',position:'sidebar',is_active:true}); setCreating(true); setEditing(null) }
  function openEdit(b: Banner) { setForm({title:b.title,image_url:b.image_url||'',link_url:b.link_url||'',position:b.position,is_active:b.is_active}); setEditing(b); setCreating(false) }
  function closeForm() { setCreating(false); setEditing(null) }

  async function handleSave() {
    setLoading(true)
    if (creating) {
      const { data } = await supabase.from('banners').insert(form).select().single()
      if (data) setItems([data, ...items])
    } else if (editing) {
      await supabase.from('banners').update(form).eq('id', editing.id)
      setItems(items.map(i => i.id === editing.id ? {...i,...form} : i))
    }
    setLoading(false); closeForm()
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('banners').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({is_active:!b.is_active}).eq('id', b.id)
    setItems(items.map(i => i.id === b.id ? {...i,is_active:!b.is_active} : i))
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button onClick={openCreate} style={{...btn('#fff','#F26A21','#F26A21'),fontSize:13,padding:'8px 20px'}}>＋ バナーを追加</button>
      </div>

      {(creating || editing) && (
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'24px',marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:'#1e293b',marginBottom:16}}>{creating?'新規追加':'編集'}</div>
          <div style={{display:'grid',gap:12}}>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>タイトル *</label>
              <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                style={{padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:13,width:'100%'}} placeholder="バナー名"/>
            </div>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>画像URL</label>
              <input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})}
                style={{padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:13,width:'100%'}} placeholder="https://..."/>
            </div>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>リンクURL</label>
              <input value={form.link_url} onChange={e=>setForm({...form,link_url:e.target.value})}
                style={{padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:13,width:'100%'}} placeholder="https://..."/>
            </div>
            <div>
              <label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>表示位置</label>
              <select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}
                style={{padding:'7px 12px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:13}}>
                {POSITIONS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
              <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>有効にする
            </label>
          </div>
          <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
            <button onClick={closeForm} style={btn('#64748b','#fff','#e2e8f0')}>キャンセル</button>
            <button onClick={handleSave} disabled={loading||!form.title} style={btn('#fff','#F26A21','#F26A21')}>
              {loading?'保存中...':'保存する'}
            </button>
          </div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        {items.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>バナーがありません</div>
        ) : items.map((b, idx) => (
          <div key={b.id} style={{padding:'12px 16px',borderBottom:idx<items.length-1?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:12}}>
            {b.image_url && <img src={b.image_url} alt="" style={{width:60,height:40,objectFit:'cover',borderRadius:4,flexShrink:0}}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1e293b',marginBottom:2}}>{b.title}</div>
              <div style={{fontSize:11,color:'#94a3b8',display:'flex',gap:8}}>
                <span>{POSITIONS.find(p=>p.v===b.position)?.l}</span>
                {b.link_url && <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>{b.link_url}</span>}
              </div>
            </div>
            {!b.is_active && <span style={{fontSize:11,color:'#94a3b8',background:'#f1f5f9',padding:'2px 8px',borderRadius:4}}>無効</span>}
            <div style={{display:'flex',gap:4,flexShrink:0}}>
              <button onClick={()=>toggleActive(b)} style={btn(b.is_active?'#f59e0b':'#10b981',b.is_active?'#fffbeb':'#f0fdf4',b.is_active?'#fde68a':'#86efac')}>
                {b.is_active?'無効化':'有効化'}
              </button>
              <button onClick={()=>openEdit(b)} style={btn('#3b82f6','#eff6ff','#bfdbfe')}>編集</button>
              <button onClick={()=>handleDelete(b.id)} style={btn('#dc2626','#fef2f2','#fca5a5')}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
