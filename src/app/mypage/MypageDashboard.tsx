'use client'
import Link from 'next/link'
import { READER_MISSIONS, WRITER_MISSIONS, type MissionStats } from './MissionClient'

interface Props {
  novels: any[]
  historyItems: any[]
  bookmarkedNovels: any[]
  bmAuthorMap: Record<string, string>
  novelLikeMap: Record<string, number>
  novelViewMap: Record<string, number>
  missionStats: MissionStats
  claimedMissionIds: string[]
  isWriter: boolean
  monthlySummary: { novels: number; novelsPrev: number; chars: number; charsPrev: number; views: number; viewsPrev: number; likes: number; likesPrev: number }
  recentTweet: any
  onEditName: () => void
  onEditBio: () => void
}

const card: React.CSSProperties = { background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 14, padding: '16px 18px' }
const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }
const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }
const seeAll: React.CSSProperties = { fontSize: 11.5, color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 600 }

function diffLabel(cur: number, prev: number) {
  const d = cur - prev
  if (d === 0) return <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>先月比 ±0</span>
  const up = d > 0
  return <span style={{ fontSize: 11, color: up ? 'var(--color-success, #15803d)' : 'var(--color-text-muted)' }}>先月比 {up ? '+' : ''}{d.toLocaleString()}</span>
}

export default function MypageDashboard({ novels, historyItems, bookmarkedNovels, bmAuthorMap, novelLikeMap, novelViewMap, missionStats, claimedMissionIds, isWriter, monthlySummary, recentTweet }: Props) {
  const published = novels.filter(n => n.published)
  const drafts = novels.filter(n => !n.published)
  const missions = isWriter ? [...READER_MISSIONS, ...WRITER_MISSIONS] : READER_MISSIONS
  const claimedSet = new Set(claimedMissionIds)
  const missionPreview = missions.filter(m => !claimedSet.has(m.id)).slice(0, 3)

  const summaryCards = [
    { label: '投稿作品', value: monthlySummary.novels, prev: monthlySummary.novelsPrev },
    { label: '総文字数', value: monthlySummary.chars, prev: monthlySummary.charsPrev },
    { label: '総閲覧数', value: monthlySummary.views, prev: monthlySummary.viewsPrev },
    { label: '総いいね数', value: monthlySummary.likes, prev: monthlySummary.likesPrev },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>

      {/* 最近の投稿作品 */}
      <div style={card}>
        <div style={cardHead}><span style={cardTitle}>最近の投稿作品</span><Link href="/mypage/works" style={seeAll}>すべて見る →</Link></div>
        {published.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', padding: '10px 0' }}>まだ公開作品がありません</div>
        ) : published.slice(0, 2).map(n => (
          <Link key={n.id} href={`/mypage/novel/${n.id}`} style={{ display: 'flex', gap: 10, marginBottom: 10, textDecoration: 'none' }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--color-bg)', flexShrink: 0, overflow: 'hidden' }}>
              {n.cover_url && <img src={n.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--color-brand)', border: '1px solid var(--color-brand-border)', borderRadius: 4, padding: '0 6px' }}>{n.genre}</span>
                <span style={{ fontSize: 10, color: 'var(--color-info)', border: '1px solid var(--color-info)', borderRadius: 4, padding: '0 6px' }}>{n.is_serial ? '連載中' : '完結'}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>♡ {novelLikeMap[n.id] || 0}　👁 {(novelViewMap[n.id] || 0).toLocaleString()}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 下書き */}
      <div style={card}>
        <div style={cardHead}><span style={cardTitle}>下書き</span><Link href="/mypage/works" style={seeAll}>すべて見る →</Link></div>
        {drafts.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', padding: '10px 0' }}>下書きはありません</div>
        ) : drafts.slice(0, 3).map(n => (
          <Link key={n.id} href={`/mypage/novel/${n.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, textDecoration: 'none' }}>
            <span style={{ fontSize: 15, color: 'var(--color-text-faint)', flexShrink: 0 }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>{n.genre}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ミッション進捗 */}
      <div style={card}>
        <div style={cardHead}><span style={cardTitle}>ミッション進捗</span><Link href="/mypage/mission" style={seeAll}>すべて見る →</Link></div>
        {missionPreview.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', padding: '10px 0' }}>すべて達成しました！</div>
        ) : missionPreview.map(m => {
          const cur = Math.min(m.target, m.cur(missionStats))
          return (
            <div key={m.id} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)' }}>{m.label}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{cur}/{m.target}</span>
              </div>
              <div style={{ height: 5, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(cur / m.target) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-brand), #ff9d5c)' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 最近の閲覧履歴 */}
      <div style={card}>
        <div style={cardHead}><span style={cardTitle}>最近の閲覧履歴</span><Link href="/mypage/history" style={seeAll}>すべて見る →</Link></div>
        {historyItems.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', padding: '10px 0' }}>まだ閲覧履歴がありません</div>
        ) : historyItems.slice(0, 2).map((h, i) => (
          <Link key={i} href={h.episodeId ? `/novel/${h.novelId}/episode/${h.episodeId}` : `/novel/${h.novelId}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, textDecoration: 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.novelTitle}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>{h.authorName}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 保存済み作品 */}
      <div style={card}>
        <div style={cardHead}><span style={cardTitle}>保存済み作品</span><Link href="/mypage/bookmarks" style={seeAll}>すべて見る →</Link></div>
        {bookmarkedNovels.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', padding: '10px 0' }}>保存済み作品はありません</div>
        ) : bookmarkedNovels.slice(0, 2).map((b: any, i: number) => (
          <Link key={i} href={`/novel/${b.novels?.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, textDecoration: 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.novels?.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>{bmAuthorMap[b.novels?.author_id] || ''}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 最近のつぶやき */}
      <div style={card}>
        <div style={cardHead}><span style={cardTitle}>最近のつぶやき</span><Link href="/mypage/tweet" style={seeAll}>すべて見る →</Link></div>
        {recentTweet ? (
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 6 }}>
              {recentTweet.body.length > 80 ? recentTweet.body.slice(0, 80) + '…' : recentTweet.body}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>♡ {recentTweet.like_count || 0}　💬 {recentTweet.reply_count || 0}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', padding: '10px 0' }}>まだつぶやきがありません</div>
        )}
      </div>

      {/* 活動サマリー（今月）※横幅いっぱい */}
      <div style={{ ...card, gridColumn: '1 / -1' }}>
        <div style={cardHead}><span style={cardTitle}>活動サマリー（今月）</span><Link href="/mypage/report" style={seeAll}>グラフで見る →</Link></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {summaryCards.map(s => (
            <div key={s.label} style={{ background: 'var(--color-bg)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>{s.value.toLocaleString()}</div>
              {diffLabel(s.value, s.prev)}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
