'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { novelId: string; userId: string }

const STEPS = [
  { key: 'hero',       label: '主人公の日常',     desc: '物語が始まる前の主人公の生活・世界を描く' },
  { key: 'trigger',    label: 'きっかけ',         desc: '主人公の日常を壊す出来事・事件が起こる' },
  { key: 'refusal',    label: '拒絶・葛藤',       desc: '主人公は変化を拒む・躊躇する' },
  { key: 'mentor',     label: 'メンターの登場',   desc: '導く存在・知識・アイテムが現れる' },
  { key: 'crossing',   label: '一線を越える',     desc: '主人公が新たな世界・冒険に踏み出す' },
  { key: 'trials',     label: '試練と仲間',       desc: '敵・試練・仲間・ルールを学ぶ' },
  { key: 'cave',       label: '最大の試練へ',     desc: '最も危険な場所に向かう準備' },
  { key: 'ordeal',     label: '最大の試練',       desc: '生死をかけた最大の危機・対決' },
  { key: 'reward',     label: '報酬を得る',       desc: '試練を乗り越え目標の一部を達成' },
  { key: 'road_back',  label: '帰路',             desc: '主人公は元の世界に戻ろうとする' },
  { key: 'resurrection', label: '復活・最終決戦', desc: '最後の試練・変容・真の勝利' },
  { key: 'return',     label: '帰還',             desc: '成長した主人公が元の世界に戻る' },
]

export default function PlotMakerView({ novelId, userId }: Props) {
  const supabase = createClient()
  const [data, setData] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('novel_memos').select('*').eq('novel_id', novelId).eq('user_id', userId).eq('category', 'plotmaker')
      .then(({ data: rows }) => {
        const obj: Record<string,string> = {}
        rows?.forEach(r => { obj[r.title] = r.body })
        setData(obj)
      })
  }, [novelId])

  async function save(key: string, value: string) {
    setData(prev => ({ ...prev, [key]: value }))
    setSaving(true)
    const { data: existing } = await supabase.from('novel_memos').select('id').eq('novel_id', novelId).eq('category', 'plotmaker').eq('title', key).eq('user_id', userId).maybeSingle()
    if (existing) {
      await supabase.from('novel_memos').update({ body: value }).eq('id', existing.id)
    } else {
      await supabase.from('novel_memos').insert({ novel_id: novelId, user_id: userId, category: 'plotmaker', title: key, body: value })
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500)
  }

  const filled = STEPS.filter(s => data[s.key]?.trim()).length

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}> プロットメーカー</h2>
        <span style={{ fontSize: 11, color: saving ? 'var(--color-brand)' : saved ? 'var(--color-success)' : 'var(--color-text-faint)' }}>
          {saving ? '保存中…' : saved ? ' 保存' : '自動保存'}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>英雄の旅（ヒーローズ・ジャーニー）をベースにしたプロット構成ツール</div>
      {/* 進捗バー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--color-brand-border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--color-brand)', width: `${(filled / STEPS.length) * 100}%`, transition: 'width .3s' }}/>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{filled}/{STEPS.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {STEPS.map((step, i) => (
          <div key={step.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: data[step.key]?.trim() ? 'var(--color-brand)' : 'var(--color-brand-border)', color: data[step.key]?.trim() ? '#fff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{step.label}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{step.desc}</span>
              </div>
              <textarea
                value={data[step.key] || ''}
                onChange={e => setData(prev => ({ ...prev, [step.key]: e.target.value }))}
                onBlur={e => save(step.key, e.target.value)}
                placeholder={`${step.label}について書く...`}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${data[step.key]?.trim() ? 'var(--color-brand)' : 'var(--color-brand-border)'}`, borderRadius: 8, fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, color: 'var(--color-text)', background: 'var(--color-bg-card)', boxSizing: 'border-box' as const, transition: 'border-color .15s' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
