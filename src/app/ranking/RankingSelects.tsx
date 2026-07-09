'use client'
import { useRouter } from 'next/navigation'

interface Props {
  period: string
  novelType: string
  serial: string
  genre: string
  aiMode: string
  showAiTab: boolean
  genres: string[]
}

export default function RankingSelects({ period, novelType, serial, genre, aiMode, showAiTab, genres }: Props) {
  const router = useRouter()

  function go(next: Partial<{ type: string; serial: string; genre: string; ai: string }>) {
    const p = new URLSearchParams()
    p.set('period', period)
    p.set('type', next.type ?? novelType)
    p.set('serial', next.serial ?? serial)
    p.set('genre', next.genre ?? genre)
    p.set('ai', next.ai ?? aiMode)
    p.set('page', '1')
    router.push(`/ranking?${p.toString()}`)
  }

  const sel = {
    appearance: 'none' as const, WebkitAppearance: 'none' as const,
    padding: '7px 30px 7px 12px', borderRadius: 8,
    border: '1px solid var(--color-brand-border)', background: 'var(--color-bg-card)',
    color: 'var(--color-text)', fontSize: 12.5, cursor: 'pointer', fontWeight: 600,
  }
  const wrap = { position: 'relative' as const, display: 'inline-block' }
  const arrow = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {showAiTab && (
        <span style={wrap}>
          <select value={aiMode} onChange={e => go({ ai: e.target.value })} style={sel}>
            <option value="human">通常作品</option>
            <option value="ai">AI作品</option>
          </select>
          {arrow}
        </span>
      )}
      <span style={wrap}>
        <select value={novelType} onChange={e => go({ type: e.target.value })} style={sel}>
          <option value="全て">長さ：全て</option>
          <option value="長編">長編</option>
          <option value="短編">短編</option>
          <option value="WEBTOON">WEBTOON</option>
        </select>
        {arrow}
      </span>
      <span style={wrap}>
        <select value={genre} onChange={e => go({ genre: e.target.value })} style={sel}>
          <option value="全て">ジャンル：全て</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        {arrow}
      </span>
      <span style={wrap}>
        <select value={serial} onChange={e => go({ serial: e.target.value })} style={sel}>
          <option value="all">絞り込み：すべて</option>
          <option value="serial">連載中</option>
          <option value="complete">完結</option>
          <option value="new">新作（1ヶ月以内）</option>
          <option value="newbie">新人作家</option>
        </select>
        {arrow}
      </span>
    </div>
  )
}
