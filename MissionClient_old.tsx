'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MissionStats {
  likeCount: number
  discoverCount: number
  commentCount: number
  bookmarkCount: number
  novelCount: number
  episodeCount: number
  followCount: number
  readCount?: number
  hasBio?: boolean
}

interface Props {
  user: boolean
  stats: MissionStats
  initialClaimedIds: string[]
}

// 初回15ミッション：サイト全体をめぐる構成。全達成でタブごと非公開になる
export const MISSIONS = [
  // 読み手の旅
  { id: 'first-read',     label: 'はじめての読了',       desc: '作品を1話、最後まで読む',        goal: (s: MissionStats) => (s.readCount || 0) >= 1 },
  { id: 'read-5',         label: '読書の habit',         desc: '5話読了する',                    goal: (s: MissionStats) => (s.readCount || 0) >= 5 },
  { id: 'read-20',        label: '航海の常連',           desc: '20話読了する',                   goal: (s: MissionStats) => (s.readCount || 0) >= 20 },
  { id: 'first-like',     label: 'はじめてのいいね',     desc: '作品にいいねを送る',             goal: (s: MissionStats) => s.likeCount >= 1 },
  { id: 'like-10',        label: '応援の達人',           desc: 'いいねを10回送る',               goal: (s: MissionStats) => s.likeCount >= 10 },
  { id: 'first-bookmark', label: 'はじめての保存',       desc: '気になる作品を保存する',         goal: (s: MissionStats) => s.bookmarkCount >= 1 },
  { id: 'first-comment',  label: 'はじめてのコメント',   desc: '作品にコメントを書く',           goal: (s: MissionStats) => s.commentCount >= 1 },
  { id: 'comment-5',      label: '感想の語り部',         desc: 'コメントを5件書く',              goal: (s: MissionStats) => s.commentCount >= 5 },
  { id: 'first-discover', label: 'はじめての発掘',       desc: '作品を発掘・拡散する',           goal: (s: MissionStats) => s.discoverCount >= 1 },
  { id: 'discover-3',     label: '原石ハンター',         desc: '3作品を発掘する',                goal: (s: MissionStats) => s.discoverCount >= 3 },
  // 書き手の旅
  { id: 'profile-setup',  label: '自己紹介を書く',       desc: 'プロフィールに自己紹介を設定',   goal: (s: MissionStats) => !!s.hasBio },
  { id: 'first-novel',    label: 'はじめての作品',       desc: '最初の作品を作る',               goal: (s: MissionStats) => s.novelCount >= 1 },
  { id: 'first-episode',  label: 'はじめての投稿',       desc: '最初の話を投稿する',             goal: (s: MissionStats) => s.episodeCount >= 1 },
  { id: 'episode-5',      label: '連載の一歩',           desc: '5話投稿する',                    goal: (s: MissionStats) => s.episodeCount >= 5 },
  { id: 'episode-10',     label: '物語を紡ぐ人',         desc: '10話投稿する',                   goal: (s: MissionStats) => s.episodeCount >= 10 },
]

export default function MissionClient({ user, stats, initialClaimedIds }: Props) {
  const supabase = createClient()
  const [claimed, setClaimed] = useState(new Set(initialClaimedIds))
  const [claiming, setClaiming] = useState('')

  async function handleClaim(missionId: string) {
    setClaiming(missionId)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) {
      const { error } = await supabase.from('user_missions').insert({ user_id: u.id, mission_id: missionId })
      if (!error) setClaimed(prev => new Set(Array.from(prev).concat(missionId)))
    }
    setClaiming('')
  }

  const doneCount = MISSIONS.filter(m => claimed.has(m.id)).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>ミッション</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{doneCount} / {MISSIONS.length} 達成</div>
      </div>
      <div style={{ height: 6, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${(doneCount / MISSIONS.length) * 100}%`, height: '100%', background: 'var(--color-brand)', transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginBottom: 16, lineHeight: 1.6 }}>
        原石航路をひとめぐりする15のミッション。すべて達成すると、このタブは卒業（非表示）になります。
      </div>

      {MISSIONS.map(m => {
        const achieved = m.goal(stats)
        const isClaimed = claimed.has(m.id)
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '1px solid var(--color-brand-border)', borderRadius: 10, marginBottom: 8, background: isClaimed ? 'var(--color-bg)' : 'var(--color-bg-card)', opacity: isClaimed ? 0.65 : 1 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isClaimed ? 'var(--color-brand)' : achieved ? 'var(--color-brand-light)' : 'var(--color-bg)', border: `1.5px solid ${isClaimed || achieved ? 'var(--color-brand)' : 'var(--color-brand-border)'}` }}>
              {isClaimed && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', textDecoration: isClaimed ? 'line-through' : 'none' }}>{m.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{m.desc}</div>
            </div>
            {!isClaimed && achieved && (
              <button onClick={() => handleClaim(m.id)} disabled={claiming === m.id}
                style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--color-brand)', border: 'none', borderRadius: 14, padding: '7px 16px', cursor: 'pointer', flexShrink: 0 }}>
                {claiming === m.id ? '...' : '達成！'}
              </button>
            )}
            {!isClaimed && !achieved && (
              <span style={{ fontSize: 11, color: 'var(--color-text-faint)', flexShrink: 0 }}>未達成</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
