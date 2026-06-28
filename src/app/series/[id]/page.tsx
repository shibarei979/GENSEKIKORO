import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default async function SeriesPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: series } = await supabase.from('series').select('*').eq('id', params.id).single()
  if (!series) notFound()

  const { data: author } = await supabase.from('profiles').select('display_name, user_id').eq('user_id', series.user_id).single()

  const { data: seriesNovels } = await supabase
    .from('series_novels')
    .select('id, novel_id, order_num, novels(id, title, genre, summary, novel_type, cover_url)')
    .eq('series_id', params.id)
    .order('order_num')

  const novels = (seriesNovels || []).map((sn: any) => ({ ...sn.novels, order_num: sn.order_num }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: "'Noto Sans JP',sans-serif" }}>
      <Header profile={profile} user={user} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
        {/* パンくず */}
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link href="/" style={{ color: 'var(--color-brand)', textDecoration: 'none' }}>ホーム</Link>
          <span>›</span>
          <Link href={`/author/${series.user_id}`} style={{ color: 'var(--color-brand)', textDecoration: 'none' }}>{author?.display_name}</Link>
          <span>›</span>
          <span>{series.title}</span>
        </div>

        {/* シリーズヘッダー */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 16, padding: '24px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'var(--color-brand)', fontWeight: 700, marginBottom: 6 }}>シリーズ</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, fontFamily: "'Noto Serif JP',serif" }}>{series.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            作者：<Link href={`/author/${series.user_id}`} style={{ color: 'var(--color-brand)', textDecoration: 'none' }}>{author?.display_name}</Link>
            　全{novels.length}作品
          </div>
          {series.description && (
            <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{series.description}</div>
          )}
        </div>

        {/* 作品一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {novels.map((novel: any, idx: number) => (
            <Link key={novel.id} href={`/novel/${novel.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, background: 'var(--color-brand-light)', color: 'var(--color-brand)', border: '1px solid var(--color-tag-border)', padding: '1px 6px', borderRadius: 3 }}>{novel.genre}</span>
                    {novel.novel_type && <span style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{novel.novel_type}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, fontFamily: "'Noto Serif JP',serif" }}>{novel.title}</div>
                  {novel.summary && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {novel.summary}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer user={user} />
    </div>
  )
}
