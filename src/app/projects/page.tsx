import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, description, theme, deadline, host_id, created_at')
    .order('created_at', { ascending: false })

  // 主催者名と参加数を取得
  const projectIds = (projects || []).map((p: any) => p.id)
  const hostIds = Array.from(new Set((projects || []).map((p: any) => p.host_id)))
  const hostMap: Record<string, string> = {}
  const entryCountMap: Record<string, number> = {}

  if (hostIds.length > 0) {
    const { data: hosts } = await supabase.from('profiles').select('user_id, display_name').in('user_id', hostIds)
    hosts?.forEach((h: any) => { hostMap[h.user_id] = h.display_name })
  }
  if (projectIds.length > 0) {
    const { data: entries } = await supabase.from('project_entries').select('project_id').in('project_id', projectIds)
    entries?.forEach((e: any) => { entryCountMap[e.project_id] = (entryCountMap[e.project_id] || 0) + 1 })
  }

  const now = Date.now()
  function isOpen(deadline: string | null) {
    if (!deadline) return true
    return new Date(deadline).getTime() > now
  }
  function fmtDate(s: string | null) {
    if (!s) return '期限なし'
    const d = new Date(s)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  const openProjects = (projects || []).filter((p: any) => isOpen(p.deadline))
  const closedProjects = (projects || []).filter((p: any) => !isOpen(p.deadline))

  const ProjectCard = ({ p }: { p: any }) => (
    <Link href={`/projects/${p.id}`} style={{ display: 'block', background: 'var(--color-bg-card)', border: '1px solid var(--color-brand-border)', borderRadius: 12, padding: '16px 18px', textDecoration: 'none' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {p.theme && <span style={{ fontSize: 11, background: 'var(--color-brand-light)', color: 'var(--color-brand)', border: '1px solid var(--color-tag-border)', padding: '2px 10px', borderRadius: 4 }}>{p.theme}</span>}
        <span style={{ fontSize: 11, color: isOpen(p.deadline) ? 'var(--color-success)' : 'var(--color-text-faint)', fontWeight: 600 }}>
          {isOpen(p.deadline) ? '募集中' : '締切'}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.4 }}>{p.title}</div>
      {p.description && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--color-text-faint)' }}>
        <span>主催：{hostMap[p.host_id] || '名無し'}</span>
        <span>参加 {entryCountMap[p.id] || 0}作品</span>
        <span style={{ marginLeft: 'auto' }}>締切：{fmtDate(p.deadline)}</span>
      </div>
    </Link>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header profile={profile} user={user} />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>お題企画</h1>
          {user && (
            <Link href="/projects/new" style={{ background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 18, textDecoration: 'none' }}>
              ＋ 企画を立てる
            </Link>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
          テーマに沿った作品を募る、ユーザー主催の企画です。お題に参加したり、自分で企画を立てて仲間を集めましょう。
        </p>

        {(projects || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            まだ企画がありません。最初の企画を立ててみませんか？
          </div>
        ) : (
          <>
            {openProjects.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12 }}>募集中の企画</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {openProjects.map((p: any) => <ProjectCard key={p.id} p={p} />)}
                </div>
              </div>
            )}
            {closedProjects.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12 }}>締切した企画</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.7 }}>
                  {closedProjects.map((p: any) => <ProjectCard key={p.id} p={p} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer user={user} />
    </div>
  )
}
