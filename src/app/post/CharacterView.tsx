'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Character { id: string; name: string; role: string; description: string; image_url: string | null; order_num: number }
interface Props { novelId: string; userId: string }

export default function CharacterView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [chars, setChars] = useState<Character[]>([])
  const [selected, setSelected] = useState<Character | null>(null)
  const [form, setForm] = useState({ name: '', role: '', description: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    supabase.from('novel_characters').select('*').eq('novel_id', novelId).eq('user_id', userId).order('order_num')
      .then(({ data }) => setChars(data || []))
  }, [novelId])

  async function handleNew() {
    if (!novelId || !userId) { alert('作品が選択されていません。執筆タブで作品を選択してください。'); return }
    const { data, error } = await supabase.from('novel_characters').insert({ novel_id: novelId, user_id: userId, name: '新キャラクター', role: '', description: '', order_num: chars.length }).select().single()
    if (error) { console.error('character insert error:', error); alert('追加に失敗しました: ' + error.message); return }
    if (data) { setChars(prev => [...prev, data]); selectChar(data) }
  }

  function selectChar(c: Character) {
    setSelected(c); setForm({ name: c.name, role: c.role, description: c.description, image_url: c.image_url || '' })
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await supabase.from('novel_characters').update({ name: form.name, role: form.role, description: form.description, image_url: form.image_url || null, updated_at: new Date().toISOString() }).eq('id', selected.id)
    setChars(prev => prev.map(c => c.id === selected.id ? { ...c, ...form, image_url: form.image_url || null } : c))
    setSelected(prev => prev ? { ...prev, ...form, image_url: form.image_url || null } : null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_characters').delete().eq('id', id)
    setChars(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const path = `characters/${userId}/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: data.publicUrl }))
    }
    setUploading(false)
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--color-text)', background: 'var(--color-bg-card)', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* リスト */}
      <div style={{ width: 180, flexShrink: 0, borderRight: '1px solid var(--color-brand-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>登場人物</span>
          <button onClick={handleNew} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>＋</button>
        </div>
        {chars.length === 0 ? (
          <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center' }}>キャラクターを追加してください</div>
        ) : chars.map(c => (
          <div key={c.id} onClick={() => selectChar(c)}
            style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-brand-light)', cursor: 'pointer', background: selected?.id === c.id ? 'var(--color-brand-light)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            {c.image_url
              ? <img src={c.image_url} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt=""/>
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}></div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selected?.id === c.id ? 'var(--color-brand)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.role || '役割未設定'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 詳細 */}
      {selected ? (
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{selected.name}</h3>
            <button onClick={handleSave} disabled={saving} style={{ marginLeft: 'auto', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button onClick={() => handleDelete(selected.id)} style={{ background: 'none', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>削除</button>
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
            {/* 画像 */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 100, height: 100, borderRadius: 12, border: '2px dashed var(--color-brand-border)', overflow: 'hidden', cursor: 'pointer', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => document.getElementById('char-img')?.click()}>
                {form.image_url
                  ? <img src={form.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
                  : <span style={{ fontSize: 32 }}></span>
                }
              </div>
              <input id="char-img" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload}/>
              {uploading && <div style={{ fontSize: 10, color: 'var(--color-brand)', textAlign: 'center', marginTop: 4 }}>アップロード中…</div>}
              <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} style={{ width: '100%', marginTop: 4, fontSize: 10, background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer' }}>削除</button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>名前</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>役割・立場</label>
                <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="例：主人公・ヒロイン・ライバル" style={inp}/>
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>キャラクター設定</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="外見、性格、背景、能力など自由に記述..."
              rows={12}
              style={{ ...inp, resize: 'vertical', lineHeight: 1.8 }}/>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
          キャラクターを選択してください
        </div>
      )}
    </div>
  )
}
