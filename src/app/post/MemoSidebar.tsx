'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Memo {
  id: string
  category: string
  title: string
  body: string
  order_num: number
}

interface Props {
  novelId: string | null
  userId: string
}

const MENU_SECTIONS = [
  {
    section: '企画',
    items: [
      { id: 'plan_summary',  label: '企画用あらすじ', placeholder: '結末までを含んだ内容を書きましょう。', maxLen: 1000 },
      { id: 'plan_chars',    label: '登場人物',       placeholder: '主人公や重要な人物を簡単にまとめておきましょう。', maxLen: 1000 },
      { id: 'plan_goal',     label: '作品の終着点',   placeholder: 'この作品のゴールを明確にしましょう。', maxLen: 1000 },
      { id: 'plan_theme',    label: '作品のテーマ',   placeholder: '作中で繰り返し表現する主題を簡潔に書きましょう。', maxLen: 50 },
      { id: 'plan_change',   label: '物語の変化',     placeholder: '作品を通して変化していく要素や、どんでん返しなどを書きましょう。', maxLen: 1000 },
      { id: 'plan_logline',  label: 'ログライン',     placeholder: '物語の特徴を一文で表現しましょう。「誰が」「何をする」かに加え、意外性や葛藤を盛り込むと、物語の骨組みがより鮮明になります。', maxLen: 50 },
      { id: 'plan_target',   label: 'ターゲット層',   placeholder: 'どんな人に読んで欲しいのか明確にしましょう。年齢層・性別・趣味・嗜好・ターゲット層が他に読みそうな作品など', maxLen: 500 },
      { id: 'plan_wordcount', label: '執筆予定文字数', placeholder: '例：8万字（長編）\n・長編小説：8万字〜\n・中編小説：2万字〜\n・短編小説：5,000字〜\n・ショートショート：〜5,000字', maxLen: 200 },
    ],
  },
  {
    section: '構成',
    items: [
      { id: 'plot',      label: 'プロット',   placeholder: 'ストーリーの流れを書きましょう。', maxLen: 10000 },
      { id: 'timeline',  label: '時系列',     placeholder: '出来事を時系列順に整理しましょう。', maxLen: 5000 },
      { id: 'relation',  label: '相関関係',   placeholder: '登場人物の関係性を整理しましょう。', maxLen: 5000 },
    ],
  },
  {
    section: '資料',
    items: [
      { id: 'character', label: '登場人物',   placeholder: 'キャラクターの詳細を書きましょう。', maxLen: 5000 },
      { id: 'world',     label: '世界観',     placeholder: '世界の設定を書きましょう。', maxLen: 5000 },
      { id: 'memo',      label: 'メモ',       placeholder: 'アイデアや気になったことを書きましょう。', maxLen: 5000 },
    ],
  },
  {
    section: '執筆',
    items: [
      { id: 'writing', label: '投稿ページへ', placeholder: '', maxLen: 0, isLink: true },
    ],
  },
]

export default function MemoSidebar({ novelId, userId }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(true)
  const [view, setView] = useState<'menu' | 'edit'>('menu')
  const [activeItem, setActiveItem] = useState<typeof MENU_SECTIONS[0]['items'][0] | null>(null)
  const [memos, setMemos] = useState<Memo[]>([])
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!novelId) return
    supabase.from('novel_memos').select('*')
      .eq('novel_id', novelId).eq('user_id', userId).order('order_num')
      .then(({ data }) => setMemos(data || []))
  }, [novelId])

  function getMemoBody(catId: string) {
    return memos.find(m => m.category === catId)?.body || ''
  }
  function getMemoId(catId: string) {
    return memos.find(m => m.category === catId)?.id || null
  }

  function openItem(item: typeof MENU_SECTIONS[0]['items'][0]) {
    setActiveItem(item)
    setEditBody(getMemoBody(item.id))
    setView('edit')
  }

  function handleBodyChange(v: string) {
    if (activeItem?.maxLen && v.length > activeItem.maxLen) return
    setEditBody(v)
    autoSave(v)
  }

  function autoSave(body: string) {
    if (!novelId || !activeItem) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const existingId = getMemoId(activeItem.id)
      if (existingId) {
        await supabase.from('novel_memos').update({ body, updated_at: new Date().toISOString() }).eq('id', existingId)
        setMemos(prev => prev.map(m => m.id === existingId ? { ...m, body } : m))
      } else {
        const { data } = await supabase.from('novel_memos').insert({
          novel_id: novelId, user_id: userId, category: activeItem.id,
          title: activeItem.label, body, order_num: 0,
        }).select().single()
        if (data) setMemos(prev => [...prev, data])
      }
      setSaving(false)
    }, 800)
  }

  const W = open ? 220 : 36

  return (
    <div style={{
      width: W, minWidth: W, flexShrink: 0,
      transition: 'width 0.2s ease, min-width 0.2s ease',
      background: 'var(--color-bg)',
      borderRight: '1px solid var(--color-brand-border)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      position: 'sticky', top: 60,
      overflow: 'hidden',
    }}>

      {/* ヘッダー */}
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 0', border: 'none',
        borderBottom: '1px solid var(--color-brand-border)',
        background: 'var(--color-bg)', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        paddingLeft: open ? 12 : 0, paddingRight: open ? 8 : 0,
        flexShrink: 0,
      }}>
        {open && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>執筆メモ</span>}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <polyline points={open ? '10,3 4,7 10,11' : '4,3 10,7 4,11'}
            stroke="var(--color-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* メニュー */}
          {view === 'menu' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!novelId ? (
                <div style={{ padding: 16, fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 20 }}>
                  作品を選択すると<br/>メモが使えます
                </div>
              ) : MENU_SECTIONS.map(section => (
                <div key={section.section}>
                  <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', background: 'var(--color-bg-subtle)', letterSpacing: '0.05em' }}>
                    {section.section}
                  </div>
                  {section.items.map(item => {
                    const hasContent = getMemoBody(item.id).length > 0
                    return (
                      <button key={item.id} onClick={() => openItem(item)}
                        style={{
                          width: '100%', padding: '10px 16px',
                          border: 'none', borderBottom: '1px solid var(--color-brand-border)',
                          background: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          textAlign: 'left' as const,
                        }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {hasContent && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-brand)', flexShrink: 0 }}/>}
                          <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
                            <polyline points="1,1 5.5,5.5 1,10" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* 編集画面 */}
          {view === 'edit' && activeItem && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--color-brand-border)', gap: 4, flexShrink: 0, background: 'var(--color-bg)' }}>
                <button onClick={() => setView('menu')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-brand)', padding: '2px 4px' }}>
                  ‹
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', flex: 1 }}>{activeItem.label}</span>
                <span style={{ fontSize: 10, color: saving ? 'var(--color-brand)' : 'var(--color-text-faint)' }}>
                  {saving ? '保存中…' : '自動保存'}
                </span>
              </div>
              {activeItem.maxLen > 0 && (
                <>
                  <textarea value={editBody} onChange={e => handleBodyChange(e.target.value)}
                    placeholder={activeItem.placeholder}
                    style={{ flex: 1, padding: '10px 12px', border: 'none', fontSize: 12, color: 'var(--color-text)', background: 'var(--color-bg)', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.8 }}
                  />
                  {activeItem.maxLen <= 1000 && (
                    <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-brand-border)', flexShrink: 0, textAlign: 'right' as const }}>
                      {editBody.length}/{activeItem.maxLen}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
