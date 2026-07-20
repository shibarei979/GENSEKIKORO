import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FeedbackReplyBox from './FeedbackReplyBox'

export const dynamic = 'force-dynamic'

// 感想・コメントページ：自作品へのコメント＋拡散（推薦文）を時系列で一覧
// 既読管理：前回このページを開いた時刻（last_seen_comments_at）より新しいもの＝未読
export default async function MyCommentsPage({ searchParams }: { searchParams: { tab?: string; kind?: string; seen?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
  const tab = searchParams.tab === 'read' ? 'read' : 'unread'
  const kind = ['comment', 'discover'].includes(searchParams.kind || '') ? searchParams.kind : 'all'

  // 前回見た時刻（これ以降＝未読）。
  // 初回アクセス時にDBを既読更新し、以降のタブ・絞り込み操作では ?seen= で基準時刻を引き継ぐ
  // （＝開いたときの未読は、絞り込みを切り替えても未読のまま見え続け、次の訪問から既読になる）
  const seenParam = searchParams.seen || ''
  const prevSeen = seenParam || profile?.last_seen_comments_at || new Date(0).toISOString()

  // 自分の作品
  const { data: myNovels } = await supabase.from('novels').select('id, title').eq('author_id', user.id)
  const novelIds = (myNovels || []).map((n: any) => n.id)
  const titleMap: Record<string, string> = {}
  ;(myNovels || []).forEach((n: any) => { titleMap[n.id] = n.title })

  // コメントと拡散を取得（直近200件ずつ）
  let items: any[] = []
  if (novelIds.length > 0) {
    const [cmRes, dcRes] = await Promise.all([
      supabase.from('comments')
        .select('id, novel_id, episode_id, user_id, body, rating, quoted_text, created_at')
        .in('novel_id', novelIds).neq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('discovers')
        .select('novel_id, user_id, comment, display_name, created_at')
        .in('novel_id', novelIds).eq('is_pending', false).neq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(200),
    ])
    // コメント投稿者名を取得
    const cmUserIds = Array.from(new Set((cmRes.data || []).map((c: any) => c.user_id).filter(Boolean)))
    const nameMap: Record<string, string> = {}
    if (cmUserIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id, display_name').in('user_id', cmUserIds)
      profs?.forEach((p: any) => { nameMap[p.user_id] = p.display_name })
    }
    const comments = (cmRes.data || []).map((c: any) => ({
      type: 'comment' as const,
      key: `c-${c.id}`,
      novelId: c.novel_id,
      episodeId: c.episode_id,
      fromUserId: c.user_id,
      name: nameMap[c.user_id] || '読者',
      body: c.body,
      rating: c.rating,
      quoted: c.quoted_text,
      created_at: c.created_at,
    }))
    const discovers = (dcRes.data || []).map((d: any, i: number) => ({
      type: 'discover' as const,
      key: `d-${d.novel_id}-${d.created_at}-${i}`,
      novelId: d.novel_id,
      episodeId: null,
      fromUserId: d.user_id,
      name: d.display_name || '読者',
      body: d.comment || '',
      rating: null,
      quoted: null,
      created_at: d.created_at,
    }))
    items = [...comments, ...discovers].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }

  // 未読/既読・種類で絞り込み
  const filtered = items.filter(it => {
    const isUnread = it.created_at > prevSeen
    if (tab === 'unread' && !isUnread) return false
    if (tab === 'read' && isUnread) return false
    if (kind === 'comment' && it.type !== 'comment') return false
    if (kind === 'discover' && it.type !== 'discover') return false
    return true
  })
  const unreadCount = items.filter(it => it.created_at > prevSeen).length

  // 初回アクセス時のみ既読時刻を更新（今回の未読は次回の訪問から既読になる）
  if (!seenParam) {
    await supabase.from('profiles').update({ last_seen_comments_at: new Date().toISOString() }).eq('user_id', user.id)
  }
  const seenQ = `&seen=${encodeURIComponent(prevSeen)}`

  const fmt = (s: string) => {
    const d = new Date(s)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const pill = (active: boolean) => ({
    fontSize: 12, fontWeight: active ? 700 : 500, padding: '6px 16px', borderRadius: 16, textDecoration: 'none',
    background: active ? 'var(--color-brand)' : 'var(--color-bg-card)',
    color: active ? '#fff' : 'var(--color-text-muted)',
    border: `1px solid ${active ? 'var(--color-brand)' : 'var(--color-brand-border)'}`,
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header profile={profile} user={user} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>感想・コメント</h1>
          <Link href="/mypage" style={{ fontSize: 13, color: 'var(--color-brand)', textDecoration: 'none' }}>← マイページ</Link>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 16 }}>あなたの作品に届いたコメントと拡散（推薦）の一覧です。</p>

        {/* 未読/既読タブ */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Link href={`/mypage/comments?tab=unread&kind=${kind}${seenQ}`} style={pill(tab === 'unread')}>未読{unreadCount > 0 ? `（${unreadCount}）` : ''}</Link>
          <Link href={`/mypage/comments?tab=read&kind=${kind}${seenQ}`} style={pill(tab === 'read')}>既読</Link>
        </div>
        {/* 種類絞り込み */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <Link href={`/mypage/comments?tab=${tab}&kind=all${seenQ}`} style={pill(kind === 'all')}>すべて</Link>
          <Link href={`/mypage/comments?tab=${tab}&kind=comment${seenQ}`} style={pill(kind === 'comment')}>コメント</Link>
          <Link href={`/mypage/comments?tab=${tab}&kind=discover${seenQ}`} style={pill(kind === 'discover')}>拡散</Link>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '48px 20px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-faint)' }}>
            {tab === 'unread' ? '未読の感想はありません' : 'まだ感想がありません'}
          </div>
        ) : (
          filtered.map(it => (
            <div key={it.key} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '13px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: it.type === 'discover' ? 'var(--color-brand-light)' : 'var(--color-info-bg, #eff6ff)', color: it.type === 'discover' ? 'var(--color-brand)' : 'var(--color-info, #2563eb)' }}>
                  {it.type === 'discover' ? '拡散' : 'コメント'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{it.name}さん</span>
                {it.rating && it.rating >= 1 ? (
                  <span>{[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: 12, color: s <= it.rating ? '#f5a623' : 'var(--color-brand-border)' }}>★</span>
                  ))}</span>
                ) : null}
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)', marginLeft: 'auto' }}>{fmt(it.created_at)}</span>
              </div>
              <Link href={it.episodeId ? `/novel/${it.novelId}/episode/${it.episodeId}` : `/novel/${it.novelId}`}
                style={{ fontSize: 11.5, color: 'var(--color-brand)', textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>
                「{titleMap[it.novelId] || '作品'}」→
              </Link>
              {it.quoted && (
                <div style={{ fontSize: 12, color: '#8a5a3a', background: '#FFF6EC', border: '1px solid #f0d9c0', borderLeft: '3px solid var(--color-brand)', borderRadius: '2px 6px 6px 2px', padding: '6px 10px', lineHeight: 1.6, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-brand)', fontWeight: 700, marginRight: 4 }}>引用</span>
                  {it.quoted.length > 60 ? it.quoted.slice(0, 60) + '…' : it.quoted}
                </div>
              )}
              {it.body && (
                <div style={{ fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{it.body}</div>
              )}
              {it.type === 'comment' && (
                <FeedbackReplyBox
                  parentCommentId={it.key.slice(2)}
                  novelId={it.novelId}
                  episodeId={it.episodeId}
                  targetUserId={it.fromUserId || ''}
                  targetName={it.name}
                  myUserId={user.id}
                  myName={profile?.display_name || ''}
                />
              )}
            </div>
          ))
        )}
      </div>
      <Footer user={user} />
    </div>
  )
}
