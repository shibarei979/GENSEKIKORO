import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import AdBanner from '@/components/layout/ad-banner'
import Sidebar from '@/components/layout/sidebar'

const PER_PAGE = 50

interface Props {
  params: { genre: string }
  searchParams: { page?: string; sort?: string }
}

export default async function GenrePage({ params, searchParams }: Props) {
  const genre = decodeURIComponent(params.genre)
  const page  = Number(searchParams.page || 1)
  const sort  = searchParams.sort || 'likes'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  // 人気作（likes順）
  const { data: popularNovels, count: popularCount } = await supabase
    .from('novels')
    .select('*, profiles(display_name)', { count: 'exact' })
    .eq('published', true)
    .eq('genre', genre)
    .order('created_at', { ascending: false })
    .range((page-1)*PER_PAGE, page*PER_PAGE-1)

  // 新作（投稿日順）
  const { data: newNovels } = await supabase
    .from('novels')
    .select('*, profiles(display_name)')
    .eq('published', true)
    .eq('genre', genre)
    .order('created_at', { ascending: false })
    .limit(PER_PAGE)

  const total = popularCount ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)

  function NovelRow({ novel, rank }: { novel: any; rank?: number }) {
    return (
      <a href={`/novel/${novel.id}`} style={{textDecoration:'none'}}>
        <div style={{display:'flex',gap:8,padding:'10px 16px',cursor:'pointer',borderBottom:'1px solid var(--color-brand-light)',alignItems:'flex-start'}}
          onMouseEnter={(e: any) => e.currentTarget.style.background='var(--color-bg)'}
          onMouseLeave={(e: any) => e.currentTarget.style.background='transparent'}>
          {rank != null && (
            <span style={{fontSize:15,minWidth:22,flexShrink:0,fontWeight:700,fontFamily:"'Noto Serif JP',serif",
              color:rank===1?'var(--color-brand)':rank===2?'#9ca3af':rank===3?'#cd7f32':'#E8C8B0'}}>
              {rank}
            </span>
          )}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',gap:4,marginBottom:2,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:9,background:'#e8f5e9',color:'#2e7d32',border:'1px solid #a5d6a7',padding:'1px 5px',borderRadius:3}}>{novel.is_serial?'連載中':'完結'}</span>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:'var(--color-text)',lineHeight:1.4,marginBottom:2}}>{novel.title}</div>
            <div style={{fontSize:11,color:'var(--color-brand)',fontWeight:500}}>{(novel.profiles as any)?.display_name}</div>
          </div>
        </div>
      </a>
    )
  }

  return (
    <div style={{minHeight:'100vh'}}>
      <Header profile={profile} user={user} activeGenre={genre} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'16px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        {/* メイン */}
        <div style={{flex:1,minWidth:0}}>
          {/* パンくず */}
          <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:10,display:'flex',alignItems:'center',gap:4}}>
            <a href="/" style={{color:'var(--color-brand)',textDecoration:'none'}}>ホーム</a>
            <span>›</span>
            <span style={{color:'var(--color-text)',fontWeight:600}}>{genre}</span>
            <span style={{fontSize:11,color:'var(--color-text-muted)'}}>（{total}作品）</span>
          </div>

          {/* ジャンル見出し */}
          <div style={{background:'linear-gradient(135deg,#fff8f0,var(--color-brand-light))',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'12px 16px',marginBottom:14}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--color-text)',fontFamily:"'Noto Serif JP',serif"}}>{genre}</div>
            <div style={{fontSize:11,color:'var(--color-text-muted)'}}>{total}作品掲載中</div>
          </div>

          {/* 人気作・新作 2列 */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* 人気作 */}
            <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--color-bg)'}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>人気作</span>
                <span style={{fontSize:11,color:'var(--color-text-muted)'}}>いいね数順</span>
              </div>
              {popularNovels && popularNovels.length > 0
                ? popularNovels.map((n: any, i: number) => <NovelRow key={n.id} novel={n} rank={i+1+(page-1)*PER_PAGE}/>)
                : <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'var(--color-text-faint)'}}>作品がまだありません</div>
              }
              {/* ページネーション */}
              {totalPages > 1 && (
                <div style={{display:'flex',justifyContent:'center',gap:4,padding:'10px 0',flexWrap:'wrap'}}>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                    <a key={p} href={`/genre/${encodeURIComponent(genre)}?page=${p}`}
                      style={{padding:'4px 9px',borderRadius:6,border:'1px solid',fontSize:12,textDecoration:'none',fontWeight:p===page?700:400,
                        background:p===page?'var(--color-brand)':'var(--base-color-1)',color:p===page?'var(--base-color-1)':'var(--color-text-muted)',borderColor:p===page?'var(--color-brand)':'var(--color-brand-border)'}}>
                      {p}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 新作 */}
            <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,overflow:'hidden'}}>
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--color-bg)'}}>
                <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>新作</span>
                <span style={{fontSize:11,color:'var(--color-text-muted)'}}>投稿日時順</span>
              </div>
              {newNovels && newNovels.length > 0
                ? newNovels.map((n: any) => <NovelRow key={n.id} novel={n}/>)
                : <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'var(--color-text-faint)'}}>作品がまだありません</div>
              }
            </div>
          </div>
        </div>

        {/* サイドバー */}
        <Sidebar />
      </div>
      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
