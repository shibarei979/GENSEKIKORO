import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'

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
    .from('contests')
    .select('*')
    .eq('id', params.id)
    .eq('is_published', true)
    .eq('is_site_contest', true)
    .maybeSingle()

  if (!contest) notFound()

  const status = getStatusLabel(contest.deadline, contest.judging_end)

  // 応募作品取得
  const { data: entries } = await supabase
    .from('contest_entries')
    .select('novel_id, created_at')
    .eq('contest_id', params.id)
    .order('created_at', { ascending: false })

  const novelIds = (entries||[]).map((e:any) => e.novel_id)
  let novels: any[] = []
  if (novelIds.length > 0) {
    const { data: novelData } = await supabase
      .from('novels')
      .select('id, title, genre, summary, novel_type, is_serial, author_id')
      .in('id', novelIds)
      .eq('published', true)

    // 作者名取得
    const authorIds = Array.from(new Set((novelData||[]).map((n:any) => n.author_id))]
    let authorMap: Record<string,string> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds)
      profiles?.forEach((p:any) => { authorMap[p.user_id] = p.display_name })
    }

    // いいね数取得
    const { data: likes } = await supabase.from('likes').select('novel_id').in('novel_id', novelIds)
    const likeMap: Record<string,number> = {}
    likes?.forEach((l:any) => { likeMap[l.novel_id] = (likeMap[l.novel_id]||0)+1 })

    novels = (novelData||[]).map((n:any) => ({
      ...n,
      display_name: authorMap[n.author_id] || '不明',
      like_count: likeMap[n.id] || 0,
    }))
  }

  // 自分が応募済みか
  let myEntryNovelIds: string[] = []
  if (user) {
    const { data: myEntries } = await supabase
      .from('contest_entries')
      .select('novel_id')
      .eq('contest_id', params.id)
      .eq('user_id', user.id)
    myEntryNovelIds = (myEntries||[]).map((e:any) => e.novel_id)
  }

  return (
    <div style={{minHeight:'100vh',background:'#FFF9F2',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:900,margin:'0 auto',padding:'32px 24px'}}>
        {/* パンくず */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:20,fontSize:12,color:'#94a3b8'}}>
          <Link href="/" style={{color:'#F26A21',textDecoration:'none'}}>ホーム</Link>
          <span>›</span>
          <span style={{color:'#77706A'}}>コンテスト</span>
        </div>

        {/* コンテストヘッダー */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden',marginBottom:24}}>
          {contest.image_url && (
            <div style={{padding:'20px 20px 0'}}>
              <img src={contest.image_url} alt={contest.title}
                style={{width:'100%',maxHeight:300,objectFit:'contain',display:'block',borderRadius:12}}/>
            </div>
          )}
          <div style={{padding:'24px 28px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <span style={{fontSize:11,fontWeight:700,color:status.color,background:status.bg,
                border:`1px solid ${status.border}`,padding:'2px 10px',borderRadius:10}}>
                {status.label}
              </span>
              {contest.deadline && (
                <span style={{fontSize:12,color:'#94a3b8'}}>
                  締切：{new Date(contest.deadline).toLocaleDateString('ja-JP')}
                </span>
              )}
            </div>
            <h1 style={{fontSize:24,fontWeight:700,color:'#2B211B',marginBottom:12,fontFamily:"'Noto Serif JP',serif"}}>
              {contest.title}
            </h1>
            {contest.description && (
              <div style={{fontSize:13,color:'#77706A',lineHeight:1.85,whiteSpace:'pre-wrap',marginBottom:16}}>
                {contest.description}
              </div>
            )}
            {/* 応募ボタン（募集中かつログイン済み） */}
            {status.label === '募集中' && user && (
              <Link href="/mypage" style={{
                display:'inline-block',padding:'10px 28px',background:'#F26A21',color:'#fff',
                fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none',
              }}>
                マイページから応募する →
              </Link>
            )}
            {status.label === '募集中' && !user && (
              <Link href="/auth/login" style={{
                display:'inline-block',padding:'10px 28px',background:'#F26A21',color:'#fff',
                fontWeight:700,fontSize:14,borderRadius:8,textDecoration:'none',
              }}>
                ログインして応募する →
              </Link>
            )}
          </div>
        </div>

        {/* 応募作品一覧 */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>
              応募作品一覧
              <span style={{fontSize:12,fontWeight:400,color:'#77706A',marginLeft:8}}>（{novels.length}作品）</span>
            </span>
          </div>
          {novels.length === 0 ? (
            <div style={{padding:'48px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
              まだ応募作品がありません
            </div>
          ) : novels.map((n:any, i:number) => (
            <Link key={n.id} href={`/novel/${n.id}`} style={{textDecoration:'none',display:'block'}}>
              <div style={{padding:'14px 20px',borderBottom:i<novels.length-1?'1px solid #FFF1E6':'none',
                background: myEntryNovelIds.includes(n.id) ? '#FFF9F2' : '#fff',cursor:'pointer'}}>
                <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
                  <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{n.novel_type}</span>
                  {n.is_serial
                    ? <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>
                    : <span style={{fontSize:10,background:'#f5f5f5',color:'#757575',border:'1px solid #e0e0e0',padding:'1px 6px',borderRadius:3}}>完結</span>
                  }
                  {myEntryNovelIds.includes(n.id) && (
                    <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>自分の応募作品</span>
                  )}
                </div>
                <div style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:3}}>{n.title}</div>
                <div style={{fontSize:12,color:'#77706A',marginBottom:n.summary?6:0}}>
                  作者：{n.display_name} · ♡ {n.like_count}
                </div>
                {n.summary && (
                  <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.8,overflow:'hidden',display:'-webkit-box',
                    WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                    {n.summary}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
