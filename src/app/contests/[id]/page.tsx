import { createClient } from '@/lib/supabase/server'
export const revalidate = 10
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import ContestClient from './ContestClient'

interface Props { params: { id: string } }

function getStatusLabel(deadline: string | null, judging_end: string | null) {
  const now = new Date()
  if (!deadline) return { label: '募集中', color: '#10b981', bg: '#f0fdf4', border: '#86efac' }
  const d = new Date(deadline)
  if (now < d) return { label: '募集中', color: '#10b981', bg: '#f0fdf4', border: '#86efac' }
  if (!judging_end) return { label: '選考中', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' }
  const j = new Date(judging_end)
  if (now < j) return { label: '選考中', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' }
  const expire = new Date(j.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (now < expire) return { label: '結果発表', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' }
  return { label: '終了', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' }
}

export default async function ContestPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: contest } = await supabase
    .from('contests').select('*')
    .eq('id', params.id).eq('is_published', true).eq('is_site_contest', true).maybeSingle()

  if (!contest) notFound()

  const status = getStatusLabel(contest.deadline, contest.judging_end)

  const { data: entries } = await supabase
    .from('contest_entries').select('novel_id, created_at')
    .eq('contest_id', params.id).order('created_at', { ascending: false })

  const novelIds = (entries||[]).map((e:any) => e.novel_id)
  let novels: any[] = []
  if (novelIds.length > 0) {
    const { data: novelData } = await supabase
      .from('novels').select('id, title, genre, summary, novel_type, is_serial, author_id')
      .in('id', novelIds).eq('published', true)
    const authorIds = Array.from(new Set((novelData||[]).map((n:any) => n.author_id)))
    let authorMap: Record<string,string> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds)
      profiles?.forEach((p:any) => { authorMap[p.user_id] = p.display_name })
    }
    const { data: likes } = await supabase.from('likes').select('novel_id').in('novel_id', novelIds)
    const likeMap: Record<string,number> = {}
    likes?.forEach((l:any) => { likeMap[l.novel_id] = (likeMap[l.novel_id]||0)+1 })
    novels = (novelData||[]).map((n:any) => ({ ...n, display_name: authorMap[n.author_id]||'不明', like_count: likeMap[n.id]||0 }))
  }

  let myEntryNovelIds: string[] = []
  if (user) {
    const { data: myEntries } = await supabase
      .from('contest_entries').select('novel_id').eq('contest_id', params.id).eq('user_id', user.id)
    myEntryNovelIds = (myEntries||[]).map((e:any) => e.novel_id)
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:900,margin:'0 auto',padding:'32px 24px'}}>
        {/* パンくず */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:20,fontSize:12,color:'#94a3b8'}}>
          <Link href="/" style={{color:'var(--color-brand)',textDecoration:'none'}}>ホーム</Link>
          <span>›</span>
          <Link href="/contests" style={{color:'var(--color-brand)',textDecoration:'none'}}>コンテスト</Link>
          <span>›</span>
          <span style={{color:'var(--color-text-muted)'}}>{contest.title}</span>
        </div>

        {/* コンテストヘッダー */}
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:16,overflow:'hidden',marginBottom:24}}>
          {/* デスクトップ：padding付きで表示 */}
          {contest.image_url && (
            <>
              <div className="desktop-only" style={{padding:'20px 20px 0'}}>
                <img src={contest.image_url} alt={contest.title}
                  style={{width:'100%',maxHeight:300,objectFit:'contain',display:'block',borderRadius:12}}/>
              </div>
              {/* モバイル：全幅 */}
              <div className="mobile-only">
                <img src={contest.image_url} alt={contest.title}
                  style={{width:'100%',maxHeight:200,objectFit:'cover',display:'block'}}/>
              </div>
            </>
          )}
          <div style={{padding:'24px 28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
              <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>{status.label}</span>
              {contest.deadline && <span style={{fontSize:12,color:'#94a3b8'}}>締切：{new Date(contest.deadline).toLocaleDateString('ja-JP')}</span>}
              {contest.judging_end && <span style={{fontSize:12,color:'#94a3b8'}}>選考終了：{new Date(contest.judging_end).toLocaleDateString('ja-JP')}</span>}
              <span style={{fontSize:12,color:'var(--color-text-muted)',marginLeft:'auto',fontWeight:600}}>応募数：{novels.length}作品</span>
            </div>
            <h1 style={{fontSize:24,fontWeight:700,color:'var(--color-text)',marginBottom:12,fontFamily:"'Noto Serif JP',serif"}}>{contest.title}</h1>
            {contest.description && (
              <div style={{fontSize:13,color:'var(--color-text-muted)',lineHeight:1.85,whiteSpace:'pre-wrap',marginBottom:16}}>{contest.description}</div>
            )}
            {/* デスクトップ：inline-block */}
            {status.label === '募集中' && user && (
              <>
                <Link href="/mypage" className="desktop-only" style={{display:'inline-block',padding:'10px 28px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none'}}>
                  マイページから応募する →
                </Link>
                <Link href="/mypage" className="mobile-only" style={{display:'block',padding:'12px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none',textAlign:'center'}}>
                  マイページから応募する →
                </Link>
              </>
            )}
            {status.label === '募集中' && !user && (
              <>
                <Link href="/auth/login" className="desktop-only" style={{display:'inline-block',padding:'10px 28px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none'}}>
                  ログインして応募する →
                </Link>
                <Link href="/auth/login" className="mobile-only" style={{display:'block',padding:'12px',background:'var(--color-brand)',color:'var(--color-bg-card)',fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none',textAlign:'center'}}>
                  ログインして応募する →
                </Link>
              </>
            )}
          </div>
        </div>

        <ContestClient novels={novels} myEntryNovelIds={myEntryNovelIds} contestId={params.id} />

        <div className="mobile-only" style={{height:80}}/>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
