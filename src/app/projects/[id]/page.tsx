import { createClient } from '@/lib/supabase/server'
import { checkFeature } from '@/lib/feature-flags'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import ProjectJoinButton from '@/components/projects/project-join-button'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  // フィーチャーフラグ：off=非表示 / preview=アドミンのみ / on=全員
  const visible = await checkFeature('projects', profile?.is_admin || false)
  if (!visible) notFound()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description, theme, deadline, host_id, created_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!project) notFound()

  const { data: host } = await supabase.from('profiles').select('display_name').eq('user_id', project.host_id).maybeSingle()

  // 参加作品を取得
  const { data: entries } = await supabase
    .from('project_entries')
    .select('novel_id, user_id, created_at')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false })

  const novelIds = (entries || []).map((e: any) => e.novel_id)
  let entryNovels: any[] = []
  if (novelIds.length > 0) {
    const { data: novels } = await supabase
      .from('novels')
      .select('id, title, genre, novel_type, author_id, catchcopy, summary')
      .in('id', novelIds)
      .eq('published', true)
    const authorIds = Array.from(new Set((novels || []).map((n: any) => n.author_id)))
    const authorMap: Record<string, string> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds)
      authors?.forEach((a: any) => { authorMap[a.user_id] = a.display_name })
    }
    entryNovels = (novels || []).map((n: any) => ({ ...n, author_name: authorMap[n.author_id] || '' }))
  }

  const now = Date.now()
  const isOpen = !project.deadline || new Date(project.deadline).getTime() > now
  const isHost = user?.id === project.host_id

  function fmtDate(s: string | null) {
    if (!s) return '期限なし'
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  // 自分の作品（参加用）を取得
  let myNovels: any[] = []
  if (user) {
    const { data } = await supabase.from('novels').select('id, title').eq('author_id', user.id).eq('published', true)
    myNovels = data || []
  }
  const enteredNovelIds = (entries || []).map((e: any) => e.novel_id)

  return (
    <div style={{ minHeight:'100vh'}}>
      <Header profile={profile} user={user} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <Link href="/projects" style={{ fontSize: 13, color: 'var(--color-brand)', textDecoration: 'none' }}>← お題企画一覧</Link>

        {/* 企画情報 */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '20px', marginTop: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {project.theme && <span style={{ fontSize: 12, background: 'var(--color-brand-light)', color: 'var(--color-brand)', border: '1px solid var(--color-tag-border)', padding: '3px 12px', borderRadius: 4 }}>{project.theme}</span>}
            <span style={{ fontSize: 12, color: isOpen ? 'var(--color-success)' : 'var(--color-text-faint)', fontWeight: 700 }}>{isOpen ? '募集中' : '締切'}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4, marginBottom: 12 }}>{project.title}</h1>
          {project.description && (
            <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 16, padding: '12px 14px', background: 'var(--color-bg)', borderRadius: 8 }}>
              {project.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
            <span>主催：{host?.display_name || '名無し'}</span>
            <span>参加 {entryNovels.length}作品</span>
            <span>締切：{fmtDate(project.deadline)}</span>
          </div>
        </div>

        {/* 参加ボタン */}
        {user && !isHost && isOpen && (
          <ProjectJoinButton
            projectId={params.id}
            userId={user.id}
            myNovels={myNovels}
            enteredNovelIds={enteredNovelIds}
          />
        )}

        {/* 参加作品一覧 */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>参加作品（{entryNovels.length}）</div>
          {entryNovels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>
              まだ参加作品がありません
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entryNovels.map((n: any) => (
                <Link key={n.id} href={`/novel/${n.id}`} style={{ display: 'block', background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '14px 16px', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, background: 'var(--color-brand-light)', color: 'var(--color-brand)', border: '1px solid var(--color-tag-border)', padding: '1px 8px', borderRadius: 4 }}>{n.genre}</span>
                    {n.novel_type && <span style={{ fontSize: 10, background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid var(--color-info-border)', padding: '1px 8px', borderRadius: 4 }}>{n.novel_type}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{n.title}</div>
                  {(n.catchcopy || n.summary) && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.catchcopy || n.summary}</div>}
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 6 }}>{n.author_name}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer user={user} />
    </div>
  )
}
