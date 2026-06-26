'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { novelId: string; userId: string }

const FIELDS = [
  { key: 'goal',       label: '目標',         placeholder: 'この作品で何を達成したいか（例：書籍化、読者に感動を届ける）' },
  { key: 'theme',      label: 'テーマ',       placeholder: '作品を通して伝えたいこと（例：諦めない心、愛の力）' },
  { key: 'logline',    label: 'ログライン',   placeholder: '一文で作品を説明（例：魔法を失った少女が世界を救う旅に出る）' },
  { key: 'target',     label: 'ターゲット読者', placeholder: 'どんな読者に向けた作品か（例：20代女性、ファンタジー好き）' },
  { key: 'wordcount',  label: '目標文字数',   placeholder: '例：10万文字、30万文字' },
  { key: 'change',     label: '主人公の変化', placeholder: '物語の始めと終わりで主人公はどう変わるか' },
  { key: 'summary',    label: '企画概要',     placeholder: '作品全体の概要を自由に' },
]

export default function PlanView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [data, setData] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('novel_memos').select('*').eq('novel_id', novelId).eq('category', 'plan').eq('user_id', userId)
      .then(({ data: rows }) => {
        const obj: Record<string,string> = {}
        rows?.forEach(r => { obj[r.title] = r.body })
        setData(obj)
      })
  }, [novelId])

  async function save(key: string, value: string) {
    setSaving(true)
    setData(prev => ({ ...prev, [key]: value }))
    const { data: existing } = await supabase.from('novel_memos').select('id').eq('novel_id', novelId).eq('category', 'plan').eq('title', key).eq('user_id', userId).maybeSingle()
    if (existing) {
      await supabase.from('novel_memos').update({ body: value, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('novel_memos').insert({ novel_id: novelId, user_id: userId, category: 'plan', title: key, body: value })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}> 企画</h2>
        <span style={{ fontSize: 11, color: saving ? 'var(--color-brand)' : saved ? 'var(--color-success)' : 'var(--color-text-faint)' }}>
          {saving ? '保存中…' : saved ? '✓ 保存しました' : '自動保存'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <textarea
              value={data[f.key] || ''}
              onChange={e => setData(prev => ({ ...prev, [f.key]: e.target.value }))}
              onBlur={e => save(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={f.key === 'summary' ? 5 : 2}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--color-brand-border)', borderRadius: 8, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, color: 'var(--color-text)', background: 'var(--color-bg-card)', boxSizing: 'border-box' as const }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
