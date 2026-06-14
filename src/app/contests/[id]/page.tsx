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
    .eq('id', params.id).eq('is_published', true).eq('is_site_contest', true)
    .maybeSingle()

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

    novels = (novelData||[]).map((n:any) => ({
      ...n,
      display_name: authorMap[n.author_id] || '不明',
      like_count: likeMap[n.id] || 0,
    }))
  }

  let myEntryNovelIds: string[] = []
  if (user) {
    const { data: myEntries } = await supabase
      .from('contest_entries').select('novel_id')
      .eq('contest_id', params.id).eq('user_id', user.id)
    myEntryNovelIds = (myEntries||[]).map((e:any) => e.novel_id)
  }

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:900,margin:'0 auto',padding:'20px 16px'}}>
        {/* パンくず */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:16,fontSize:12,color:'#94a3b8'}}>
          <Link href="/" style={{color:'#F26A21',textDecoration:'none'}}>ホーム</Link>
          <span>›</span>
          <Link href="/contests" style={{color:'#F26A21',textDecoration:'none'}}>コンテスト</Link>
          <span>›</span>
          <span style={{color:'#77706A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{contest.title}</span>
        </div>

        {/* コンテストヘッダー */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden',marginBottom:16}}>
          {contest.image_url && (
            <img src={contest.image_url} alt={contest.title}
              style={{width:'100%',maxHeight:280,objectFit:'cover',display:'block'}}/>
          )}
          <div style={{padding:'16px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
              <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,
                border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>
                {status.label}
              </span>
              {contest.deadline && (
                <span style={{fontSize:12,color:'#94a3b8'}}>
                  締切：{new Date(contest.deadline).toLocaleDateString('ja-JP')}
                </span>
              )}
              {contest.judging_end && (
                <span style={{fontSize:12,color:'#94a3b8'}}>
                  選考終了：{new Date(contest.judging_end).toLocaleDateString('ja-JP')}
                </span>
              )}
              <span style={{fontSize:12,color:'#77706A',fontWeight:600}}>
                応募数：{novels.length}作品
              </span>
            </div>
            <h1 style={{fontSize:20,fontWeight:700,color:'#2B211B',marginBottom:10,fontFamily:"'Noto Serif JP',serif",lineHeight:1.4}}>
              {contest.title}
            </h1>
            {contest.description && (
              <div style={{fontSize:13,color:'#77706A',lineHeight:1.85,whiteSpace:'pre-wrap',marginBottom:14}}>
                {contest.description}
              </div>
            )}
            {status.label === '募集中' && user && (
              <Link href="/mypage" style={{
                display:'block',padding:'12px',background:'#F26A21',color:'#fff',
                fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none',textAlign:'center',
              }}>
                マイページから応募する →
              </Link>
            )}
            {status.label === '募集中' && !user && (
              <Link href="/auth/login" style={{
                display:'block',padding:'12px',background:'#F26A21',color:'#fff',
                fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none',textAlign:'center',
              }}>
                ログインして応募する →
              </Link>
            )}
          </div>
        </div>

        {/* 応募作品一覧 */}
        <ContestClient novels={novels} myEntryNovelIds={myEntryNovelIds} contestId={params.id} />

        <div className="mobile-only" style={{height:80}}/>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
