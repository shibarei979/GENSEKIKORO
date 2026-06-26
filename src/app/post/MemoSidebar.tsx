'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { userId: string }

// ===== 型定義 =====
interface PlotChapter { id: string; title: string; body: string; order_num: number }
interface Character { id: string; name: string; role: string; age: string; personality: string; appearance: string; background: string; note: string; order_num: number }
interface TimelineEvent { id: string; title: string; detail: string; order_num: number }
interface Memo { id: string; category: string; title: string; body: string }

// ===== メニュー定義 =====
type ViewType = 'menu' | 'plan' | 'plot' | 'character' | 'character_edit' | 'timeline' | 'relation' | 'simple_edit'
const SIMPLE_ITEMS = [
  { id: 'plan_summary',   label: '企画用あらすじ',  placeholder: '結末までを含んだ内容を書きましょう。',  maxLen: 1000 },
  { id: 'plan_chars',     label: '登場人物（概要）', placeholder: '主人公や重要な人物を簡単にまとめておきましょう。', maxLen: 1000 },
  { id: 'plan_goal',      label: '作品の終着点',    placeholder: 'この作品のゴールを明確にしましょう。', maxLen: 1000 },
  { id: 'plan_theme',     label: '作品のテーマ',    placeholder: '作中で繰り返し表現する主題を簡潔に書きましょう。', maxLen: 50 },
  { id: 'plan_change',    label: '物語の変化',      placeholder: '作品を通して変化していく要素やどんでん返しなどを書きましょう。', maxLen: 1000 },
  { id: 'plan_logline',   label: 'ログライン',      placeholder: '物語の特徴を一文で表現しましょう。', maxLen: 50 },
  { id: 'plan_target',    label: 'ターゲット層',    placeholder: 'どんな人に読んでほしいか。年齢層・性別・趣味・嗜好など', maxLen: 500 },
  { id: 'plan_wordcount', label: '執筆予定文字数',  placeholder: '例：8万字（長編）\n長編：8万字〜\n中編：2万字〜\n短編：5,000字〜', maxLen: 200 },
  { id: 'world',          label: '世界観',          placeholder: '世界の設定を書きましょう。', maxLen: 5000 },
  { id: 'memo',           label: 'メモ',            placeholder: 'アイデアや気になったことを書きましょう。', maxLen: 5000 },
]

const MENU = [
  { section: '企画', items: [
    { id: 'plan' as ViewType, label: '企画', sub: true },
  ]},
  { section: '構成', items: [
    { id: 'plot' as ViewType,      label: 'プロット' },
    { id: 'timeline' as ViewType,  label: '時系列' },
  ]},
  { section: '資料', items: [
    { id: 'character' as ViewType, label: '登場人物' },
    { id: 'relation' as ViewType,  label: '相関関係' },
    { id: 'world_view' as ViewType, label: '世界観' },
    { id: 'memo_view' as ViewType,  label: 'メモ' },
  ]},
]

export default function MemoSidebar({ userId }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(true)
  const [view, setView] = useState<ViewType | 'world_view' | 'memo_view'>('menu')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // シンプルメモ
  const [memos, setMemos] = useState<Memo[]>([])
  const [activeSimple, setActiveSimple] = useState<typeof SIMPLE_ITEMS[0] | null>(null)
  const [simpleBody, setSimpleBody] = useState('')

  // プロット
  const [plots, setPlots] = useState<PlotChapter[]>([])
  const [activePlot, setActivePlot] = useState<PlotChapter | null>(null)

  // 登場人物
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeChar, setActiveChar] = useState<Character | null>(null)

  // 時系列
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')

  // 相関関係
  const [relation, setRelation] = useState('')

  useEffect(() => {
    if (!userId) return
    Promise.all([
      supabase.from('novel_memos').select('*').eq('user_id', userId).is('novel_id', null),
      supabase.from('novel_plot_chapters').select('*').eq('user_id', userId).order('order_num'),
      supabase.from('novel_characters').select('*').eq('user_id', userId).order('order_num'),
      supabase.from('novel_timeline_events').select('*').eq('user_id', userId).order('order_num'),
    ]).then(([m, p, c, t]) => {
      setMemos(m.data || [])
      setPlots(p.data || [])
      setCharacters(c.data || [])
      setEvents(t.data || [])
      const rel = (m.data || []).find((x: Memo) => x.category === 'relation')
      if (rel) setRelation(rel.body)
    })
  }, [userId])

  // ===== シンプルメモ =====
  function getMemoBody(catId: string) { return memos.find(m => m.category === catId)?.body || '' }
  function getMemoId(catId: string) { return memos.find(m => m.category === catId)?.id || null }

  function openSimple(item: typeof SIMPLE_ITEMS[0]) {
    setActiveSimple(item)
    setSimpleBody(getMemoBody(item.id))
    setView('simple_edit')
  }

  function handleSimpleChange(v: string) {
    if (activeSimple?.maxLen && v.length > activeSimple.maxLen) return
    setSimpleBody(v)
    autoSaveMemo(activeSimple!.id, activeSimple!.label, v)
  }

  function autoSaveMemo(catId: string, label: string, body: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const existingId = getMemoId(catId)
      if (existingId) {
        await supabase.from('novel_memos').update({ body }).eq('id', existingId)
        setMemos(prev => prev.map(m => m.id === existingId ? { ...m, body } : m))
      } else {
        const { data } = await supabase.from('novel_memos').insert({ novel_id: null, user_id: userId, category: catId, title: label, body, order_num: 0 }).select().single()
        if (data) setMemos(prev => [...prev, data])
      }
      setSaving(false)
    }, 800)
  }

  // ===== プロット =====
  async function addPlot() {
    const { data } = await supabase.from('novel_plot_chapters').insert({ user_id: userId, title: `章 ${plots.length + 1}`, body: '', order_num: plots.length }).select().single()
    if (data) { setPlots(prev => [...prev, data]); setActivePlot(data); setView('plot') }
  }
  async function savePlot(plot: PlotChapter) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('novel_plot_chapters').update({ title: plot.title, body: plot.body }).eq('id', plot.id)
      setPlots(prev => prev.map(p => p.id === plot.id ? plot : p))
      setSaving(false)
    }, 800)
  }
  async function deletePlot(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_plot_chapters').delete().eq('id', id)
    setPlots(prev => prev.filter(p => p.id !== id))
    setActivePlot(null); setView('plot')
  }

  // ===== 登場人物 =====
  async function addChar() {
    const { data } = await supabase.from('novel_characters').insert({ user_id: userId, name: '新キャラクター', role: '', age: '', personality: '', appearance: '', background: '', note: '', order_num: characters.length }).select().single()
    if (data) { setCharacters(prev => [...prev, data]); setActiveChar(data); setView('character_edit') }
  }
  async function saveChar(ch: Character) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('novel_characters').update({ name: ch.name, role: ch.role, age: ch.age, personality: ch.personality, appearance: ch.appearance, background: ch.background, note: ch.note }).eq('id', ch.id)
      setCharacters(prev => prev.map(c => c.id === ch.id ? ch : c))
      setSaving(false)
    }, 800)
  }
  async function deleteChar(id: string) {
    if (!confirm('削除しますか？')) return
    await supabase.from('novel_characters').delete().eq('id', id)
    setCharacters(prev => prev.filter(c => c.id !== id))
    setActiveChar(null); setView('character')
  }

  // ===== 時系列 =====
  async function addEvent() {
    if (!newEventTitle.trim()) return
    const { data } = await supabase.from('novel_timeline_events').insert({ user_id: userId, title: newEventTitle.trim(), detail: '', order_num: events.length }).select().single()
    if (data) { setEvents(prev => [...prev, data]); setNewEventTitle('') }
  }
  async function deleteEvent(id: string) {
    await supabase.from('novel_timeline_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }
  async function moveEvent(id: string, dir: 'up' | 'down') {
    const idx = events.findIndex(e => e.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === events.length - 1) return
    const newEvents = [...events]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[newEvents[idx], newEvents[swap]] = [newEvents[swap], newEvents[idx]]
    const updated = newEvents.map((e, i) => ({ ...e, order_num: i }))
    setEvents(updated)
    await Promise.all(updated.map(e => supabase.from('novel_timeline_events').update({ order_num: e.order_num }).eq('id', e.id)))
  }

  // ===== 相関関係 =====
  function handleRelationChange(v: string) {
    setRelation(v)
    autoSaveMemo('relation', '相関関係', v)
  }

  const W = open ? 220 : 36

  // ===== 共通UI =====
  const inp = { width: '100%', padding: '6px 10px', border: '1px solid var(--color-brand-border)', borderRadius: 6, fontSize: 12, background: 'var(--color-bg-card)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
  const ta = { ...inp, resize: 'none' as const, lineHeight: 1.7 }

  function BackBtn({ to }: { to: ViewType | 'menu' }) {
    return (
      <button onClick={() => setView(to as any)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-brand)', padding: '2px 4px' }}>‹</button>
    )
  }

  function Header({ back, title, onAdd }: { back: ViewType | 'menu'; title: string; onAdd?: () => void }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0, background: 'var(--color-bg)' }}>
        <BackBtn to={back}/>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>{title}</span>
        {saving && <span style={{ fontSize: 10, color: 'var(--color-brand)' }}>保存中…</span>}
        {onAdd && <button onClick={onAdd} style={{ fontSize: 16, color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>＋</button>}
      </div>
    )
  }

  return (
    <div style={{ width: W, minWidth: W, flexShrink: 0, transition: 'width 0.2s ease, min-width 0.2s ease', background: 'var(--color-bg)', borderRight: '1px solid var(--color-brand-border)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', position: 'sticky', top: 60, overflow: 'hidden' }}>

      {/* ヘッダー開閉 */}
      <button onClick={() => setOpen(!open)} style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '1px solid var(--color-brand-border)', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', paddingLeft: open ? 12 : 0, paddingRight: open ? 8 : 0, flexShrink: 0 }}>
        {open && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>執筆メモ</span>}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <polyline points={open ? '10,3 4,7 10,11' : '4,3 10,7 4,11'} stroke="var(--color-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ===== メニュー ===== */}
          {view === 'menu' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {MENU.map(sec => (
                <div key={sec.section}>
                  <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', background: 'var(--color-bg-subtle)', letterSpacing: '0.05em' }}>{sec.section}</div>
                  {sec.items.map(item => {
                    const vid = item.id as string
                    return (
                      <button key={vid} onClick={() => setView(vid as any)}
                        style={{ width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--color-brand-border)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' as const }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{item.label}</span>
                        <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><polyline points="1,1 5.5,5.5 1,10" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* ===== 企画サブメニュー ===== */}
          {view === 'plan' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="企画"/>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {SIMPLE_ITEMS.filter(i => i.id.startsWith('plan_')).map(item => {
                  const hasContent = getMemoBody(item.id).length > 0
                  return (
                    <button key={item.id} onClick={() => openSimple(item)}
                      style={{ width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--color-brand-border)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' as const }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {hasContent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-brand)' }}/>}
                        <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><polyline points="1,1 5.5,5.5 1,10" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ===== シンプル編集 ===== */}
          {view === 'simple_edit' && activeSimple && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back={activeSimple.id.startsWith('plan_') ? 'plan' : 'menu'} title={activeSimple.label}/>
              <textarea value={simpleBody} onChange={e => handleSimpleChange(e.target.value)}
                placeholder={activeSimple.placeholder}
                style={{ ...ta, flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, background: 'var(--color-bg)' }}/>
              {activeSimple.maxLen <= 1000 && (
                <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-brand-border)', flexShrink: 0, textAlign: 'right' as const }}>
                  {simpleBody.length}/{activeSimple.maxLen}
                </div>
              )}
            </div>
          )}

          {/* ===== プロット一覧 ===== */}
          {view === 'plot' && !activePlot && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="プロット" onAdd={addPlot}/>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {plots.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                    章を追加してプロットを書きましょう<br/>
                    <button onClick={addPlot} style={{ marginTop: 10, padding: '6px 14px', border: '1px dashed var(--color-brand)', borderRadius: 6, background: 'none', fontSize: 11, color: 'var(--color-brand)', cursor: 'pointer' }}>＋ 章を追加</button>
                  </div>
                ) : plots.map(p => (
                  <button key={p.id} onClick={() => { setActivePlot(p); setView('plot') }}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--color-brand-light)', background: 'none', cursor: 'pointer', textAlign: 'left' as const, display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{p.title || '（無題）'}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.body || '内容なし'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== プロット編集 ===== */}
          {view === 'plot' && activePlot && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0, background: 'var(--color-bg)' }}>
                <button onClick={() => setActivePlot(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-brand)', padding: '2px 4px' }}>‹</button>
                <input value={activePlot.title} onChange={e => { const u = { ...activePlot, title: e.target.value }; setActivePlot(u); savePlot(u) }}
                  style={{ ...inp, flex: 1, border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, padding: '2px 4px' }}/>
                {saving && <span style={{ fontSize: 10, color: 'var(--color-brand)' }}>保存中…</span>}
                <button onClick={() => deletePlot(activePlot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-danger)', padding: '2px 4px' }}>削除</button>
              </div>
              <textarea value={activePlot.body} onChange={e => { const u = { ...activePlot, body: e.target.value }; setActivePlot(u); savePlot(u) }}
                placeholder="この章のプロットを書きましょう。"
                style={{ ...ta, flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, background: 'var(--color-bg)' }}/>
            </div>
          )}

          {/* ===== 登場人物一覧 ===== */}
          {view === 'character' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="登場人物" onAdd={addChar}/>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {characters.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                    キャラクターを追加しましょう<br/>
                    <button onClick={addChar} style={{ marginTop: 10, padding: '6px 14px', border: '1px dashed var(--color-brand)', borderRadius: 6, background: 'none', fontSize: 11, color: 'var(--color-brand)', cursor: 'pointer' }}>＋ 追加</button>
                  </div>
                ) : characters.map(c => (
                  <button key={c.id} onClick={() => { setActiveChar(c); setView('character_edit') }}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--color-brand-light)', background: 'none', cursor: 'pointer', textAlign: 'left' as const, display: 'block' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{c.name || '（名前未設定）'}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{c.role || '役割未設定'}{c.age ? ` · ${c.age}` : ''}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== 登場人物編集 ===== */}
          {view === 'character_edit' && activeChar && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0, background: 'var(--color-bg)' }}>
                <button onClick={() => setView('character')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-brand)', padding: '2px 4px' }}>‹</button>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>キャラクター</span>
                {saving && <span style={{ fontSize: 10, color: 'var(--color-brand)' }}>保存中…</span>}
                <button onClick={() => deleteChar(activeChar.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--color-danger)', padding: '2px 4px' }}>削除</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'name', label: '名前', ph: '例：佐藤太郎' },
                  { key: 'role', label: '役割', ph: '例：主人公・ヒロインなど' },
                  { key: 'age', label: '年齢', ph: '例：17歳' },
                  { key: 'personality', label: '性格', ph: '明るく前向き、でも内心は...' },
                  { key: 'appearance', label: '外見', ph: '黒髪・青い瞳...' },
                  { key: 'background', label: '背景・過去', ph: 'どんな過去を持つか...' },
                  { key: 'note', label: 'メモ', ph: 'その他メモ...' },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 3 }}>{f.label}</div>
                    {f.key === 'name' || f.key === 'role' || f.key === 'age' ? (
                      <input value={(activeChar as any)[f.key]} onChange={e => { const u = { ...activeChar, [f.key]: e.target.value }; setActiveChar(u); saveChar(u) }}
                        placeholder={f.ph} style={inp}/>
                    ) : (
                      <textarea value={(activeChar as any)[f.key]} onChange={e => { const u = { ...activeChar, [f.key]: e.target.value }; setActiveChar(u); saveChar(u) }}
                        placeholder={f.ph} rows={f.key === 'note' ? 3 : 2} style={{ ...ta, width: '100%' }}/>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== 時系列 ===== */}
          {view === 'timeline' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="時系列"/>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-brand-border)', flexShrink: 0, display: 'flex', gap: 6 }}>
                <input value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addEvent()}
                  placeholder="出来事を入力..." style={{ ...inp, flex: 1, fontSize: 11 }}/>
                <button onClick={addEvent} style={{ padding: '5px 10px', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>追加</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {events.length === 0 ? (
                  <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>出来事を追加して時系列を整理しましょう</div>
                ) : events.map((ev, i) => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--color-brand-light)', background: dragging === ev.id ? 'var(--color-brand-light)' : 'transparent' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => moveEvent(ev.id, 'up')} disabled={i === 0}
                        style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', padding: 0, fontSize: 10, color: i === 0 ? 'var(--color-text-faint)' : 'var(--color-brand)', lineHeight: 1 }}>▲</button>
                      <button onClick={() => moveEvent(ev.id, 'down')} disabled={i === events.length - 1}
                        style={{ background: 'none', border: 'none', cursor: i === events.length - 1 ? 'default' : 'pointer', padding: 0, fontSize: 10, color: i === events.length - 1 ? 'var(--color-text-faint)' : 'var(--color-brand)', lineHeight: 1 }}>▼</button>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text)' }}>{ev.title}</span>
                    <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-faint)', padding: '2px 4px' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== 相関関係 ===== */}
          {view === 'relation' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="相関関係"/>
              <div style={{ padding: '8px 12px', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-brand-border)', fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                登場人物の関係を自由に書きましょう。矢印（→）や記号を使うと整理しやすいです。
              </div>
              <textarea value={relation} onChange={e => handleRelationChange(e.target.value)}
                placeholder={'例：\n太郎 → 花子（片想い）\n花子 ← 次郎（好意あり）\n太郎 ↔ 次郎（親友）\n三人は同じクラス'}
                style={{ ...ta, flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, background: 'var(--color-bg)' }}/>
            </div>
          )}

          {/* ===== 世界観 ===== */}
          {(view as string) === 'world_view' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="世界観"/>
              <textarea value={getMemoBody('world')} onChange={e => autoSaveMemo('world', '世界観', e.target.value) || setMemos(prev => { const id = getMemoId('world'); return id ? prev.map(m => m.id === id ? { ...m, body: e.target.value } : m) : prev })}
                placeholder="世界の設定を書きましょう。"
                style={{ ...ta, flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, background: 'var(--color-bg)' }}/>
            </div>
          )}

          {/* ===== メモ ===== */}
          {(view as string) === 'memo_view' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Header back="menu" title="メモ"/>
              <textarea value={getMemoBody('memo')} onChange={e => autoSaveMemo('memo', 'メモ', e.target.value) || setMemos(prev => { const id = getMemoId('memo'); return id ? prev.map(m => m.id === id ? { ...m, body: e.target.value } : m) : prev })}
                placeholder="アイデアや気になったことを書きましょう。"
                style={{ ...ta, flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, background: 'var(--color-bg)' }}/>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
