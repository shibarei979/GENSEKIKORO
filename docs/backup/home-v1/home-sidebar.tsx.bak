import Link from 'next/link'

const GENRES = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','その他']

interface Props {
  announcements: any[]
  contests: any[]
}

const TYPE_OPTIONS: Record<string, { label: string; color: string }> = {
  info:      { label: 'お知らせ',       color: '#3b82f6' },
  important: { label: '重要なお知らせ', color: '#ef4444' },
  contest:   { label: 'コンテスト',     color: '#F26A21' },
}

function getAnnouncementType(t: string) {
  return TYPE_OPTIONS[t] ?? TYPE_OPTIONS['info']
}

type StatusKey = '募集中' | '選考中' | '結果発表'

const STATUS_ORDER: StatusKey[] = ['募集中', '選考中', '結果発表']

const STATUS_STYLE: Record<StatusKey, { color: string; bg: string; border: string }> = {
  '募集中':  { color: '#10b981', bg: '#f0fdf4', border: '#86efac' },
  '選考中':  { color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  '結果発表': { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
}

function getContestStatusKey(deadline: string | null, judging_end: string | null): StatusKey | null {
  const now = new Date()
  if (!deadline) return '募集中'
  const d = new Date(deadline)
  if (now < d) return '募集中'
  if (!judging_end) return '選考中'
  const j = new Date(judging_end)
  if (now < j) return '選考中'
  const expire = new Date(j.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (now < expire) return '結果発表'
  return null
}

export default function HomeSidebar({ announcements, contests }: Props) {
  // ステータスごとにグループ化
  const grouped: Record<StatusKey, any[]> = { '募集中': [], '選考中': [], '結果発表': [] }
  for (const c of contests) {
    const key = getContestStatusKey(c.deadline, c.judging_end)
    if (key) grouped[key].push(c)
  }
  const hasAnyContest = STATUS_ORDER.some(k => grouped[k].length > 0)

  return (
    <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>

      {/* お知らせ */}
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
        <div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#2B211B',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          お知らせ
          <a href="/announcements" style={{fontSize:10,color:'#F26A21',textDecoration:'none'}}>もっと見る ›</a>
        </div>
        {announcements.length > 0 ? announcements.map((n: any) => {
          const t = getAnnouncementType(n.type)
          return (
            <div key={n.id} style={{padding:'9px 12px',borderBottom:'1px solid #FFF1E6'}}>

              <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                <span style={{fontSize:9,fontWeight:700,color:t.color,background:`${t.color}15`,border:`1px solid ${t.color}40`,padding:'1px 6px',borderRadius:4,flexShrink:0,whiteSpace:'nowrap'}}>
                  {t.label}
                </span>
                <div style={{fontSize:10,color:'#B8AEA8',flexShrink:0}}>{new Date(n.created_at).toLocaleDateString('ja-JP')}</div>
              </div>
              {n.link ? (
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="announcement-title-link">
                  {n.title}
                </a>
              ) : (
                <div style={{fontSize:11,color:'#2B211B',lineHeight:1.5}}>{n.title}</div>
              )}
            </div>
          )
        }) : (
          <div style={{padding:'12px',fontSize:11,color:'#B8AEA8',textAlign:'center'}}>お知らせはまだありません</div>
        )}
      </div>

      {/* コンテスト：ステータスごとにグループ表示 */}
      {hasAnyContest && (
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
          <div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#2B211B',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
            コンテスト
          </div>
          <div style={{padding:'8px',display:'flex',flexDirection:'column',gap:12}}>
            {STATUS_ORDER.map(statusKey => {
              const group = grouped[statusKey]
              if (group.length === 0) return null
              const s = STATUS_STYLE[statusKey]
              return (
                <div key={statusKey}>
                  {/* ステータスバッジ（グループヘッダー） */}
                  <div style={{marginBottom:6}}>
                    <span style={{fontSize:10,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.border}`,padding:'2px 10px',borderRadius:10,display:'inline-block'}}>
                      {statusKey}
                    </span>
                  </div>
                  {/* そのステータスの画像一覧 */}
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {group.map((contest: any) => {
                      const linkUrl = contest.is_site_contest ? `/contests/${contest.id}` : contest.apply_url
                      const img = contest.image_url ? (
                        <img src={contest.image_url} alt={contest.title} style={{width:'100%',aspectRatio:'2/1',objectFit:'cover',display:'block',borderRadius:8}}/>
                      ) : (
                        <div style={{width:'100%',height:80,display:'flex',alignItems:'center',justifyContent:'center',background:'#FFF1E6',borderRadius:8,fontSize:28}}>🏆</div>
                      )
                      return linkUrl ? (
                        <a key={contest.id} href={linkUrl}
                          target={contest.is_site_contest ? '_self' : '_blank'}
                          rel="noopener noreferrer"
                          style={{textDecoration:'none',display:'block'}}>
                          {img}
                        </a>
                      ) : (
                        <div key={contest.id}>{img}</div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ジャンルから探す */}
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
        <div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:'#2B211B',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
          ジャンルから探す
        </div>
        <div style={{padding:'10px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
          {GENRES.map(g => (
            <Link key={g} href={`/search?genre=${encodeURIComponent(g)}`}
              style={{fontSize:11,padding:'3px 10px',borderRadius:12,border:'1px solid #F0D9C9',
                background:'#FFF9F2',color:'#77706A',textDecoration:'none'}}>
              {g}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
