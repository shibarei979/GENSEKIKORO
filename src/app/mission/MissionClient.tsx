'use client'

interface Stats {
  likeCount: number
  discoverCount: number
  commentCount: number
  bookmarkCount: number
  novelCount: number
  episodeCount: number
  followCount: number
}

interface Props {
  user: any
  stats: Stats
}

interface Mission {
  id: string
  category: string
  title: string
  description: string
  icon: string
  current: number
  target: number
  reward: string
}

export default function MissionClient({ user, stats }: Props) {
  const missions: Mission[] = [
    // 読者ミッション
    {
      id: 'like_3',
      category: '読者',
      title: '作品を応援しよう',
      description: '3作品にいいねする',
      icon: '♡',
      current: Math.min(stats.likeCount, 3),
      target: 3,
      reward: '読者バッジ Lv.1',
    },
    {
      id: 'like_10',
      category: '読者',
      title: 'いいね達人',
      description: '10作品にいいねする',
      icon: '♡',
      current: Math.min(stats.likeCount, 10),
      target: 10,
      reward: '読者バッジ Lv.2',
    },
    {
      id: 'like_50',
      category: '読者',
      title: 'いいね名人',
      description: '50作品にいいねする',
      icon: '♡',
      current: Math.min(stats.likeCount, 50),
      target: 50,
      reward: '読者バッジ Lv.3',
    },
    {
      id: 'bookmark_5',
      category: '読者',
      title: 'お気に入りを作ろう',
      description: '5作品を保存する',
      icon: '🔖',
      current: Math.min(stats.bookmarkCount, 5),
      target: 5,
      reward: '保存家バッジ',
    },
    {
      id: 'comment_1',
      category: '読者',
      title: '初コメント',
      description: '初めてコメントする',
      icon: '💬',
      current: Math.min(stats.commentCount, 1),
      target: 1,
      reward: 'コメンテーターバッジ Lv.1',
    },
    {
      id: 'comment_10',
      category: '読者',
      title: 'コメント常連',
      description: '10回コメントする',
      icon: '💬',
      current: Math.min(stats.commentCount, 10),
      target: 10,
      reward: 'コメンテーターバッジ Lv.2',
    },
    // 拡散ミッション
    {
      id: 'discover_1',
      category: '拡散',
      title: '初めての拡散',
      description: '作品を1回拡散する',
      icon: '📢',
      current: Math.min(stats.discoverCount, 1),
      target: 1,
      reward: '拡散者バッジ Lv.1',
    },
    {
      id: 'discover_3',
      category: '拡散',
      title: '拡散の達人',
      description: '作品を3回拡散する',
      icon: '📢',
      current: Math.min(stats.discoverCount, 3),
      target: 3,
      reward: '拡散者バッジ Lv.2',
    },
    {
      id: 'discover_10',
      category: '拡散',
      title: '拡散の申し子',
      description: '作品を10回拡散する',
      icon: '📢',
      current: Math.min(stats.discoverCount, 10),
      target: 10,
      reward: '拡散者バッジ Lv.3',
    },
    // 作者ミッション
    {
      id: 'novel_1',
      category: '作者',
      title: 'デビュー作家',
      description: '初めての作品を公開する',
      icon: '✍️',
      current: Math.min(stats.novelCount, 1),
      target: 1,
      reward: '作家バッジ Lv.1',
    },
    {
      id: 'novel_3',
      category: '作者',
      title: '多作家',
      description: '3作品を公開する',
      icon: '✍️',
      current: Math.min(stats.novelCount, 3),
      target: 3,
      reward: '作家バッジ Lv.2',
    },
    {
      id: 'episode_5',
      category: '作者',
      title: '連載作家',
      description: '5話以上投稿する',
      icon: '📖',
      current: Math.min(stats.episodeCount, 5),
      target: 5,
      reward: '連載バッジ',
    },
    {
      id: 'episode_20',
      category: '作者',
      title: '長編作家',
      description: '20話以上投稿する',
      icon: '📖',
      current: Math.min(stats.episodeCount, 20),
      target: 20,
      reward: '長編バッジ',
    },
    // フォローミッション
    {
      id: 'follow_1',
      category: 'フォロー',
      title: 'お気に入り作家を見つけよう',
      description: '作者を1人フォローする',
      icon: '👤',
      current: Math.min(stats.followCount, 1),
      target: 1,
      reward: 'ファンバッジ Lv.1',
    },
    {
      id: 'follow_5',
      category: 'フォロー',
      title: 'フォロワー',
      description: '5人の作者をフォローする',
      icon: '👤',
      current: Math.min(stats.followCount, 5),
      target: 5,
      reward: 'ファンバッジ Lv.2',
    },
  ]

  const categories = ['読者', '拡散', '作者', 'フォロー']
  const categoryColors: Record<string, { bg: string; border: string; color: string; bar: string }> = {
    '読者':   { bg:'#FFF1E6', border:'#f5b080', color:'#F26A21', bar:'#F26A21' },
    '拡散':   { bg:'#f0fdf4', border:'#86efac', color:'#15803d', bar:'#22c55e' },
    '作者':   { bg:'#eff6ff', border:'#bfdbfe', color:'#2563eb', bar:'#3b82f6' },
    'フォロー': { bg:'#faf5ff', border:'#c4b5fd', color:'#7c3aed', bar:'#8b5cf6' },
  }

  const totalMissions = missions.length
  const completedMissions = missions.filter(m => m.current >= m.target).length

  return (
    <div>
      {/* ページタイトル */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',margin:0,marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>
          🎯 ミッション
        </h1>
        <p style={{fontSize:13,color:'#77706A',margin:0,lineHeight:1.7}}>
          ミッションをクリアしてバッジを獲得しよう！バッジは連続クリア日数で進化します。
        </p>
      </div>

      {/* 全体進捗 */}
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:14,padding:'16px 20px',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>全体の達成状況</span>
          <span style={{fontSize:13,color:'#F26A21',fontWeight:700}}>{completedMissions} / {totalMissions}</span>
        </div>
        <div style={{height:8,background:'#F0D9C9',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',background:'#F26A21',borderRadius:4,width:`${(completedMissions/totalMissions)*100}%`,transition:'width .4s'}}/>
        </div>
        {!user && (
          <div style={{marginTop:12,fontSize:12,color:'#77706A',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:8,padding:'8px 12px'}}>
            <a href="/auth/login" style={{color:'#F26A21',fontWeight:600}}>ログイン</a>すると進捗が記録されます
          </div>
        )}
      </div>

      {/* カテゴリ別ミッション */}
      {categories.map(cat => {
        const catMissions = missions.filter(m => m.category === cat)
        const catDone = catMissions.filter(m => m.current >= m.target).length
        const c = categoryColors[cat]
        return (
          <div key={cat} style={{marginBottom:16}}>
            {/* カテゴリヘッダー */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:4,height:18,background:c.bar,borderRadius:2}}/>
              <span style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>{cat}ミッション</span>
              <span style={{fontSize:12,color:c.color,background:c.bg,border:`1px solid ${c.border}`,padding:'1px 8px',borderRadius:10,fontWeight:600}}>
                {catDone}/{catMissions.length} 完了
              </span>
            </div>

            {/* ミッションカード一覧 */}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {catMissions.map(m => {
                const done = m.current >= m.target
                const pct = Math.min(100, (m.current / m.target) * 100)
                return (
                  <div key={m.id} style={{
                    background: done ? c.bg : '#fff',
                    border: `1px solid ${done ? c.border : '#F0D9C9'}`,
                    borderRadius:12,
                    padding:'14px 16px',
                    display:'flex',
                    alignItems:'center',
                    gap:14,
                    opacity: done ? 1 : 1,
                  }}>
                    {/* アイコン */}
                    <div style={{
                      width:44,height:44,borderRadius:12,flexShrink:0,
                      background: done ? c.bar : '#F0D9C9',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:20,
                    }}>
                      {done ? '✅' : m.icon}
                    </div>

                    {/* テキスト */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                        <span style={{fontSize:14,fontWeight:700,color: done ? c.color : '#2B211B'}}>{m.title}</span>
                        {done && (
                          <span style={{fontSize:10,background:c.bar,color:'#fff',padding:'1px 7px',borderRadius:8,fontWeight:700}}>達成！</span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:'#77706A',marginBottom:6}}>{m.description}</div>
                      {/* プログレスバー */}
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:5,background:'#F0D9C9',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',background: done ? c.bar : '#F26A21',borderRadius:3,width:`${pct}%`,transition:'width .3s'}}/>
                        </div>
                        <span style={{fontSize:11,color: done ? c.color : '#77706A',fontWeight:600,whiteSpace:'nowrap'}}>
                          {user ? `${m.current} / ${m.target}` : `? / ${m.target}`}
                        </span>
                      </div>
                    </div>

                    {/* 報酬 */}
                    <div style={{flexShrink:0,textAlign:'center',minWidth:72}}>
                      <div style={{fontSize:9,color:'#B8AEA8',marginBottom:3}}>獲得バッジ</div>
                      <div style={{
                        fontSize:10,fontWeight:700,
                        color: done ? c.color : '#B8AEA8',
                        background: done ? c.bg : '#f5f5f5',
                        border:`1px solid ${done ? c.border : '#e0e0e0'}`,
                        borderRadius:8,padding:'3px 6px',lineHeight:1.4,
                      }}>
                        {m.reward}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 今後の予告 */}
      <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:14,padding:'16px 20px',marginTop:8}}>
        <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:6}}>🚀 近日公開予定</div>
        <div style={{fontSize:12,color:'#77706A',lineHeight:1.8}}>
          連続ログインバッジ（1日・3日・5日・7日・30日）<br/>
          推しバッジ（お気に入り作品への応援数）<br/>
          新人バッジ（登録から30日以内の特典）
        </div>
      </div>
    </div>
  )
}
