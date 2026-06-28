'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Series {
  id: string; title: string; description: string; cover_url: string | null; order_num: number
  novels?: SeriesNovel[]
}
interface SeriesNovel {
  id: string; novel_id: string; order_num: number
  novel?: { id: string; title: string; genre: string; cover_url?: string }
}
interface Props { userId: string; myNovels: any[] }

export default function SeriesManager({ userId, myNovels }: Props) {
  const supabase = createClient()
  const [series, setSeries] = useState([] as Series[])
  const [selected, setSelected] = useState(null as Series | null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [addNovelId, setAddNovelId] = useState('')

  useEffect(() => {
    loadSeries()
  }, [userId])

  async function loadSeries() {
    const { data } = await supabase.from('series').select('*').eq('user_id', userId).order('order_num')
    setSeries(data || [])
  }

  async function loadSeriesNovels(seriesId: string) {
    const { data } = await supabase.from('series_novels')
      .select('id, novel_id, order_num, novels(id, title, genre)')
      .eq('series_id', seriesId).order('order_num')
    return data || []
  }

  async function handleNew() {
    const { data } = await supabase.from('series').insert({
      user_id: userId, title: '新しいシリーズ', description: '', order_num: series.length
    }).select().single()
    if (data) {
      setSeries(prev => [...prev, data])
      selectSeries(data)
    }
  }

  async function selectSeries(s: Series) {
    const novels = await loadSeriesNovels(s.id)
    const full = { ...s, novels }
    setSelected(full)
    setEditTitle(s.title)
    setEditDesc(s.description || '')
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await supabase.from('series').update({ title: editTitle, description: editDesc, updated_at: new Date().toISOString() }).eq('id', selected.id)
    setSeries(prev => prev.map(s => s.id === selected.id ? { ...s, title: editTitle, description: editDesc } : s))
    setSelected(prev => prev ? { ...prev, title: editTitle, description: editDesc } : null)
    setSaving(false)
  }

  async function handleDelete() {
    if (!selected || !confirm(`「${selected.title}」を削除しますか？`)) return
    await supabase.from('series').delete().eq('id', selected.id)
    setSeries(prev => prev.filter(s => s.id !== selected.id))
    setSelected(null)
  }

  async function handleAddNovel() {
    if (!selected || !addNovelId) return
    const already = (selected.novels || []).some(n => n.novel_id === addNovelId)
    if (already) { alert('すでに追加されています'); return }
    const { data } = await supabase.from('series_novels').insert({
      series_id: selected.id, novel_id: addNovelId, order_num: (selected.novels || []).length
    }).select('id, novel_id, order_num').single()
    if (data) {
      const novel = myNovels.find(n => n.id === addNovelId)
      const newEntry = { ...data, novels: novel }
      setSelected(prev => prev ? { ...prev, novels: [...(prev.novels || []), newEntry] } : null)
      setAddNovelId('')
    }
  }

  async function handleRemoveNovel(entryId: string) {
    await supabase.from('series_novels').delete().eq('id', entryId)
    setSelected(prev => prev ? { ...prev, novels: (prev.novels || []).filter(n => n.id !== entryId) } : null)
  }

  async function moveNovel(idx: number, dir: -1 | 1) {
    if (!selected) return
    const novels = [...(selected.novels || [])]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= novels.length) return
    const tmp = novels[idx]; novels[idx] = novels[swapIdx]; novels[swapIdx] = tmp
    const updated = novels.map((n, i) => ({ ...n, order_num: i }))
    setSelected(prev => prev ? { ...prev, novels: updated } : null)
    await Promise.all(updated.map(n => supabase.from('series_novels').update({ order_num: n.order_num }).eq('id', n.id)))
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'var(--color-bg-card)', color: 'var(--color-text)', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 400 }}>
      {/* シリーズ一覧 */}
      <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--color-brand-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--color-brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>シリーズ</span>
          <button onClick={handleNew} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>＋</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {series.length === 0 ? (
            <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center' }}>シリーズを作成してください</div>
          ) : series.map(s => (
            <div key={s.id} onClick={() => selectSeries(s)}
              style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-brand-light)', cursor: 'pointer', background: selected?.id === s.id ? 'var(--color-brand-light)' : 'none' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selected?.id === s.id ? 'var(--color-brand)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細 */}
      {selected ? (
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>シリーズ編集</h3>
            <button onClick={handleSave} disabled={saving} style={{ marginLeft: 'auto', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>
              {saving ? '保存中…' : '保存'}
            </button>
            <button onClick={handleDelete} style={{ background: 'none', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>削除</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>シリーズ名</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inp}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>説明</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
              style={{ ...inp, resize: 'vertical' as const }} placeholder="シリーズの説明（省略可）"/>
          </div>

          {/* 作品追加 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>作品を追加</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={addNovelId} onChange={e => setAddNovelId(e.target.value)}
                style={{ ...inp, flex: 1, cursor: 'pointer' }}>
                <option value="">作品を選択</option>
                {myNovels.filter(n => !(selected.novels || []).some(sn => sn.novel_id === n.id)).map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
              <button onClick={handleAddNovel} disabled={!addNovelId}
                style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: addNovelId ? 1 : 0.5 }}>
                追加
              </button>
            </div>
          </div>

          {/* シリーズ内作品 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>シリーズの作品（{(selected.novels || []).length}件）</label>
            {(selected.novels || []).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)', padding: '20px', textAlign: 'center', border: '2px dashed var(--color-brand-border)', borderRadius: 8 }}>
                作品を追加してください
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(selected.novels || []).map((sn, idx) => {
                  const novel = (sn as any).novels || myNovels.find(n => n.id === sn.novel_id)
                  return (
                    <div key={sn.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button onClick={() => moveNovel(idx, -1)} disabled={idx === 0}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-text-faint)', padding: 0, lineHeight: 1, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                        <button onClick={() => moveNovel(idx, 1)} disabled={idx === (selected.novels||[]).length - 1}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-text-faint)', padding: 0, lineHeight: 1, opacity: idx === (selected.novels||[]).length - 1 ? 0.3 : 1 }}>▼</button>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-faint)', minWidth: 20 }}>#{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{novel?.title || '不明'}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{novel?.genre}</div>
                      </div>
                      <button onClick={() => handleRemoveNovel(sn.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 公開リンク */}
          {(selected.novels || []).length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--color-brand-light)', border: '1px solid var(--color-brand-border)', borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>公開ページ：</span>
              <Link href={`/series/${selected.id}`} style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 600 }}>
                /series/{selected.id}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
          シリーズを選択または作成してください
        </div>
      )}
    </div>
  )
}
