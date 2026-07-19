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
  tweetCount?: number
  seriesCount?: number
}

interface Props {
  user: boolean
  stats: MissionStats
  initialClaimedIds: string[]
  isWriter: boolean
}

interface Mission {
  id: string
  label: string
  desc: string
  target: number
  cur: (s: MissionStats) => number
}

// 読み手10・書き手はさらに5個（計15）。クリアを押すとカードが消え、全達成でタブごと非公開
export const READER_MISSIONS: Mission[] = [
  { id: 'first-read',     label: 'はじめての読了',     desc: '作品を1話、最後まで読む',      target: 1,  cur: s => s.readCount || 0 },
  { id: 'read-5',         label: '読書の習慣',         desc: '5話読了する',                  target: 5,  cur: s => s.readCount || 0 },
  { id: 'first-follow',   label: '作家をフォロー',     desc: '気になる作家をフォローする',   target: 1,  cur: s => s.followCount },
  { id: 'first-like',     label: 'はじめてのいいね',   desc: '作品にいいねを送る',           target: 1,  cur: s => s.likeCount },
  { id: 'like-10',        label: '応援の達人',         desc: 'いいねを10回送る',             target: 10, cur: s => s.likeCount },
  { id: 'first-bookmark', label: 'はじめての保存',     desc: '気になる作品を保存する',       target: 1,  cur: s => s.bookmarkCount },
  { id: 'first-comment',  label: 'はじめてのコメント', desc: '作品にコメントを書く',         target: 1,  cur: s => s.commentCount },
  { id: 'comment-5',      label: '感想の語り部',       desc: 'コメントを5件書く',            target: 5,  cur: s => s.commentCount },
  { id: 'first-discover', label: 'はじめての発掘',     desc: '作品を発掘・拡散する',         target: 1,  cur: s => s.discoverCount },
  { id: 'discover-3',     label: '原石ハンター',       desc: '3作品を発掘する',              target: 3,  cur: s => s.discoverCount },
]
export const WRITER_MISSIONS: Mission[] = [
  { id: 'profile-setup',  label: '自己紹介を書く',     desc: 'プロフィールに自己紹介を設定', target: 1,  cur: s => (s.hasBio ? 1 : 0) },
  { id: 'first-episode',  label: '投稿する',           desc: '最初の話を投稿する',           target: 1,  cur: s => s.episodeCount },
  { id: 'episode-5',      label: '5回投稿する',        desc: '話を5回投稿する',              target: 5,  cur: s => s.episodeCount },
  { id: 'first-tweet',    label: 'つぶやく',           desc: 'つぶやきを投稿する',           target: 1,  cur: s => s.tweetCount || 0 },
  { id: 'first-series',   label: 'シリーズを作る',     desc: '作品をまとめるシリーズを作成', target: 1,  cur: s => s.seriesCount || 0 },
]

export default function MissionClient({ user, stats, initialClaimedIds, isWriter }: Props) {
  const MISSIONS = isWriter ? [...READER_MISSIONS, ...WRITER_MISSIONS] : READER_MISSIONS
  const supabase = createClient()
  const [claimed, setClaimed] = useState(new Set(initialClaimedIds))
  const [claiming, setClaiming] = useState('')
  const [vanishing, setVanishing] = useState('')

  async function handleClaim(missionId: string) {
    setClaiming(missionId)
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) {
      const { error } = await supabase.from('user_missions').insert({ user_id: u.id, mission_id: missionId })
      if (!error) {
        setClaiming('')
        setVanishing(missionId)
        setTimeout(() => {
          setClaimed(prev => new Set(Array.from(prev).concat(missionId)))
          setVanishing('')
        }, 450)
        return
      }
    }
    setClaiming('')
  }

  // クリア済みは表示しない（押したら消える）
  const visible = MISSIONS.filter(m => !claimed.has(m.id))
  const doneCount = MISSIONS.length - visible.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>ミッション</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{doneCount} / {MISSIONS.length} クリア</div>
      </div>
      <div style={{ height: 6, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${(doneCount / MISSIONS.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-brand), #ff9d5c)', transition: 'width .4s' }} />
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 600 }}>
          すべてのミッションをクリアしました！
        </div>
      ) : (
        visible.map(m => {
          const cur = Math.min(m.target, m.cur(stats))
          const achieved = cur >= m.target
          const isVanishing = vanishing === m.id
          return (
            <div key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
                borderRadius: 12, marginBottom: 9,
                background: 'var(--color-bg-card)',
                border: achieved ? '1.5px solid var(--color-brand)' : '1px solid var(--color-brand-border)',
                boxShadow: achieved ? '0 2px 10px rgba(242,106,33,0.18)' : 'none',
                opacity: isVanishing ? 0 : 1,
                transform: isVanishing ? 'translateX(24px) scale(0.96)' : 'none',
                transition: 'opacity .45s, transform .45s',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginBottom: 6 }}>{m.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, maxWidth: 160, height: 5, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(cur / m.target) * 100}%`, height: '100%', background: achieved ? 'linear-gradient(90deg, var(--color-brand), #ff9d5c)' : 'var(--color-brand-border)', transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: achieved ? 'var(--color-brand)' : 'var(--color-text-faint)', flexShrink: 0 }}>{cur}/{m.target}</span>
                </div>
              </div>
              {achieved ? (
                <button onClick={() => handleClaim(m.id)} disabled={claiming === m.id || isVanishing}
                  style={{
                    fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--color-brand), #ff8a3d)',
                    border: 'none', borderRadius: 20, padding: '9px 20px', cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(242,106,33,0.4)',
                  }}>
                  {claiming === m.id ? '...' : 'クリア！'}
                </button>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)', flexShrink: 0, border: '1px solid var(--color-brand-border)', borderRadius: 14, padding: '5px 12px' }}>挑戦中</span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
