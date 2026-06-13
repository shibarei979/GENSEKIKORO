import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TweetSection from '@/components/TweetSection'
import AdBanner from '@/components/layout/AdBanner'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import FollowButton from '@/components/FollowButton'

interface Props { params: { id: string } }

export default async function AuthorPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  const { data: author } = await supabase
    .from('profiles')
    .select('user_id, display_name, icon_url, bio, user_number, created_at')
    .eq('user_id', params.id)
    .single()

  if (!author) notFound()

  const { data: novels } = await supabase
    .from('novels')
    .select('id, title, genre, summary, tags, novel_type, is_serial, created_at, is_r18')
    .eq('author_id', params.id)
    .eq('published', true)
    .order('created_at', { ascending: false })

  const filteredNovels = (novels || []).filter((n: any) =>
    user ? true : !n.is_r18
  )

  const novelIds = filteredNovels.map((n: any) => n.id)
  const likeMap: Record<string, number> = {}
  if (novelIds.length > 0) {
    const { data: likes } = await supabase.from('likes').select('novel_id').in('novel_id', novelIds)
    likes?.forEach((l: any) => { likeMap[l.novel_id] = (likeMap[l.novel_id] || 0) + 1 })
  }

  const { count: followerCount } = await supabase
    .from('follows').select('*', { count: 'exact', head: true })
    .eq('following_id', params.id)

  let isFollowing = false
  if (user && user.id !== params.id) {
    const { data: myFollow } = await supabase
      .from('follows').select('id')
      .eq('follower_id', user.id).eq('following_id', params.id).maybeSingle()
    isFollowing = !!myFollow
  }

  const isMe = user?.id === params.id
  const joinDate = new Date(author.created_at)
  const joinStr = `${joinDate.getFullYear()}年${joinDate.getMonth() + 1}月`
  const totalLikes = Object.values(likeMap).reduce((a, b) => a + b, 0)

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px',display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>

          {/* プロフィールカード */}
          <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:16,padding:'28px',marginBottom:20}}>
            <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
              <div style={{flexShrink:0}}>
                {author.icon_url
                  ? <img src={author.icon_url} style={{width:80,height:80,borderRadius:'50%',objectFit:'cover'}} alt=""/>
                  : <div style={{width:80,height:80,borderRadius:'50%',background:'#F0D9C9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,color:'#F26A21',fontWeight:700}}>
                      {author.display_name?.[0] || '?'}
                    </div>
                }
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:6}}>
                  <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',margin:0}}>{author.display_name}</h1>
                  {!isMe && user && (
                    <FollowButton
                      authorId={params.id}
                      userId={user.id}
                      initialFollowing={isFollowing}
                      followerCount={followerCount || 0}
                    />
                  )}
                </div>
                <div style={{display:'flex',gap:20,marginBottom:12,fontSize:13}}>
                  <div style={{color:'#2B211B'}}>
                    <strong style={{fontSize:16}}>{(followerCount || 0).toLocaleString()}</strong>
                    <span style={{color:'#77706A',marginLeft:4}}>フォロワー</span>
                  </div>
                  <div style={{color:'#2B211B'}}>
                    <strong style={{fontSize:16}}>{filteredNovels.length}</strong>
                    <span style={{color:'#77706A',marginLeft:4}}>作品</span>
                  </div>
                  <div style={{color:'#2B211B'}}>
                    <strong style={{fontSize:16}}>{totalLikes.toLocaleString()}</strong>
                    <span style={{color:'#77706A',marginLeft:4}}>総いいね</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:'#B8AEA8',marginBottom:author.bio?10:0}}>{joinStr}から活動中</div>
                {author.bio && (
                  <p style={{fontSize:13,color:'#5a3a20',lineHeight:1.8,margin:0,whiteSpace:'pre-wrap'}}>{author.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* 作品一覧 */}
          <div style={{marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontSize:17,fontWeight:700,color:'#2B211B',margin:0}}>
              投稿作品 <span style={{fontSize:13,fontWeight:400,color:'#77706A'}}>（{filteredNovels.length}作品）</span>
            </h2>
          </div>

          <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden'}}>
            {filteredNovels.length === 0 ? (
              <div style={{padding:'48px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
                公開中の作品はありません
              </div>
            ) : filteredNovels.map((n: any, i: number) => (
              <Link key={n.id} href={`/novel/${n.id}`} style={{textDecoration:'none',display:'block'}}>
                <div style={{padding:'16px 20px',borderBottom:i<filteredNovels.length-1?'1px solid #FFF1E6':'none',background:i%2===0?'#fff':'#fffcfa',cursor:'pointer'}}>
                  <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 6px',borderRadius:3}}>{n.genre}</span>
                    <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:3}}>{n.novel_type}</span>
                    {n.is_serial
                      ? <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>
                      : <span style={{fontSize:10,background:'#f5f5f5',color:'#757575',border:'1px solid #e0e0e0',padding:'1px 6px',borderRadius:3}}>完結</span>}
                    {n.is_r18 && <span style={{fontSize:10,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',padding:'1px 6px',borderRadius:3}}>R18</span>}
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:4}}>{n.title}</div>
                  <div style={{fontSize:12,color:'#77706A',marginBottom:n.summary?6:0}}>♡ {likeMap[n.id]||0}</div>
                  {n.summary && (
                    <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.8,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                      {n.summary}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {/* つぶやき */}
          <TweetSection
            authorId={author.user_id}
            currentUserId={user?.id || null}
            currentUserName={profile?.display_name || null}
            currentUserIconUrl={profile?.icon_url || null}
            isOwner={false}
          />
        </div>

        <Sidebar />
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
