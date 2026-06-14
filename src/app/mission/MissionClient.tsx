'use client'
import { useState } from 'react'

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
  current: number
  target: number
  badgeName: string
}

export default function MissionClient({ user, stats }: Props) {
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set())
  const [modalMission, setModalMission] = useState<Mission | null>(null)

  const missions: Mission[] = [
    // 読者
    { id:'like_3',      category:'読者',   title:'作品を応援しよう',       description:'3作品にいいねする',        current:Math.min(stats.likeCount,3),      target:3,   badgeName:'読者バッジ Lv.1' },
    { id:'like_10',     category:'読者',   title:'いいね達人',             description:'10作品にいいねする',       current:Math.min(stats.likeCount,10),     target:10,  badgeName:'読者バッジ Lv.2' },
    { id:'like_50',     category:'読者',   title:'いいね名人',             description:'50作品にいいねする',       current:Math.min(stats.likeCount,50),     target:50,  badgeName:'読者バッジ Lv.3' },
    { id:'bookmark_5',  category:'読者',   title:'お気に入りを作ろう',      description:'5作品を保存する',          current:Math.min(stats.bookmarkCount,5),  target:5,   badgeName:'保存家バッジ' },
    { id:'comment_1',   category:'読者',   title:'初コメント',             description:'初めてコメントする',       current:Math.min(stats.commentCount,1),   target:1,   badgeName:'コメンテーターバッジ Lv.1' },
    { id:'comment_10',  category:'読者',   title:'コメント常連',           description:'10回コメントする',         current:Math.min(stats.commentCount,10),  target:10,  badgeName:'コメンテーターバッジ Lv.2' },
    // 拡散
    { id:'discover_1',  category:'拡散',   title:'初めての拡散',           description:'作品を1回拡散する',        current:Math.min(stats.discoverCount,1),  target:1,   badgeName:'拡散者バッジ Lv.1' },
    { id:'discover_3',  category:'拡散',   title:'拡散の達人',             description:'作品を3回拡散する',        current:Math.min(stats.discoverCount,3),  target:3,   badgeName:'拡散者バッジ Lv.2' },
    { id:'discover_10', category:'拡散',   title:'拡散の申し子',           description:'作品を10回拡散する',       current:Math.min(stats.discoverCount,10), target:10,  badgeName:'拡散者バッジ Lv.3' },
    // 作者
    { id:'novel_1',     category:'作者',   title:'デビュー作家',           description:'初めての作品を公開する',   current:Math.min(stats.novelCount,1),     target:1,   badgeName:'作家バッジ Lv.1' },
    { id:'novel_3',     category:'作者',   title:'多作家',                description:'3作品を公開する',          current:Math.min(stats.novelCount,3),     target:3,   badgeName:'作家バッジ Lv.2' },
    { id:'episode_5',   category:'作者',   title:'連載作家',              description:'5話以上投稿する',          current:Math.min(stats.episodeCount,5),   target:5,   badgeName:'連載バッジ' },
    { id:'episode_20',  category:'作者',   title:'長編作家',              description:'20話以上投稿する',         current:Math.min(stats.episodeCount,20),  target:20,  badgeName:'長編バッジ' },
    // フォロー
    { id:'follow_1',    category:'フォロー', title:'お気に入り作家を見つけよう', description:'作者を1人フォローする', current:Math.min(stats.followCount,1),    target:1,   badgeName:'ファンバッジ Lv.1' },
    { id:'follow_5',    category:'フォロー', title:'フォロワー',            description:'5人の作者をフォローする', current:Math.min(stats.followCount,5),    target:5,   badgeName:'ファンバッジ Lv.2' },
  ]

  const categories = ['読者', '拡散', '作者', 'フォロー']
  const categoryColors: Record<string, { bg: string; border: string; color: string; bar: string }> = {
    '読者':    { bg:'#FFF1E6', border:'#f5b080', color:'#F26A21', bar:'#F26A21' },
    '拡散':    { bg:'#f0fdf4', border:'#86efac', color:'#15803d', bar:'#22c55e' },
    '作者':    { bg:'#eff6ff', border:'#bfdbfe', color:'#2563eb', bar:'#3b82f6' },
    'フォロー': { bg:'#faf5ff', border:'#c4b5fd', color:'#7c3aed', bar:'#8b5cf6' },
  }

  const totalMissions = missions.length
  const completedMissions = missions.filter(m => m.current >= m.target).length

  function handleClaim(m: Mission) {
    setModalMission(m)
  }

  function handleCloseModal() {
    if (modalMission) {
      setClaimedIds(prev => new Set([...Array.from(prev), modalMission.id]))
    }
    setModalMission(null)
  }

  return (
    <div>
      {/* ページタイトル */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',margin:0,marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>
          ミッション
        </h1>
        <p style={{fontSize:13,color:'#77706A',margin:0,lineHeight:1.7}}>
          ミッションをクリアしてバッジを獲得しよう。バッジは連続クリア日数で進化します。
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
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:4,height:18,background:c.bar,borderRadius:2}}/>
              <span style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>{cat}ミッション</span>
              <span style={{fontSize:12,color:c.color,background:c.bg,border:`1px solid ${c.border}`,padding:'1px 8px',borderRadius:10,fontWeight:600}}>
                {catDone}/{catMissions.length} 完了
              </span>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {catMissions.map(m => {
                const done = m.current >= m.target
                const claimed = claimedIds.has(m.id)
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
                  }}>
                    {/* テキスト */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                        <span style={{fontSize:14,fontWeight:700,color: done ? c.color : '#2B211B'}}>{m.title}</span>
                      </div>
                      <div style={{fontSize:12,color:'#77706A',marginBottom:6}}>{m.description}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:5,background:'#F0D9C9',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',background:done?c.bar:'#F26A21',borderRadius:3,width:`${pct}%`,transition:'width .3s'}}/>
                        </div>
                        <span style={{fontSize:11,color:done?c.color:'#77706A',fontWeight:600,whiteSpace:'nowrap'}}>
                          {user ? `${m.current} / ${m.target}` : `? / ${m.target}`}
                        </span>
                      </div>
                    </div>

                    {/* 右側：クリアボタン or 獲得済み or 未達成 */}
                    <div style={{flexShrink:0}}>
                      {done && !claimed ? (
                        <button
                          onClick={() => handleClaim(m)}
                          style={{
                            padding:'8px 16px',
                            background:'#F26A21',
                            color:'#fff',
                            border:'none',
                            borderRadius:20,
                            fontSize:13,
                            fontWeight:700,
                            cursor:'pointer',
                            whiteSpace:'nowrap',
                            boxShadow:'0 2px 8px rgba(242,106,33,.3)',
                          }}>
                          クリア！
                        </button>
                      ) : claimed ? (
                        <div style={{
                          padding:'6px 12px',
                          background:'#f5f5f5',
                          color:'#B8AEA8',
                          border:'1px solid #e0e0e0',
                          borderRadius:20,
                          fontSize:12,
                          fontWeight:600,
                          whiteSpace:'nowrap',
                        }}>
                          獲得済み
                        </div>
                      ) : (
                        <div style={{
                          width:60,
                          height:5,
                          background:'#F0D9C9',
                          borderRadius:3,
                        }}/>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 近日公開予告 */}
      <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:14,padding:'16px 20px',marginTop:8}}>
        <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:6}}>近日公開予定</div>
        <div style={{fontSize:12,color:'#77706A',lineHeight:1.8}}>
          連続ログインバッジ（1日・3日・5日・7日・30日）<br/>
          推しバッジ（お気に入り作品への応援数）<br/>
          新人バッジ（登録から30日以内の特典）
        </div>
      </div>

      {/* バッジ獲得モーダル */}
      {modalMission && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}} onClick={handleCloseModal}/>
          <div style={{
            position:'relative',
            background:'#fff',
            borderRadius:20,
            padding:'32px 28px',
            maxWidth:320,
            width:'100%',
            textAlign:'center',
            boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
            zIndex:1,
          }}>
            {/* キラキラ演出 */}
            <div style={{fontSize:11,color:'#F26A21',fontWeight:700,letterSpacing:'0.15em',marginBottom:12}}>
              バッジ獲得
            </div>

            {/* バッジ仮置き */}
            <div style={{
              width:100,height:100,
              borderRadius:'50%',
              background:'linear-gradient(135deg,#F26A21,#f5a060)',
              margin:'0 auto 16px',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 8px 24px rgba(242,106,33,.35)',
              border:'4px solid #FFF1E6',
            }}>
              <span style={{fontSize:13,fontWeight:700,color:'#fff',textAlign:'center',lineHeight:1.4,padding:'0 8px'}}>
                仮バッジ
              </span>
            </div>

            <div style={{fontSize:18,fontWeight:700,color:'#2B211B',marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>
              {modalMission.badgeName}
            </div>
            <div style={{fontSize:13,color:'#77706A',marginBottom:8}}>
              「{modalMission.title}」をクリアしました！
            </div>
            <div style={{fontSize:11,color:'#B8AEA8',marginBottom:24}}>
              バッジは連続クリア日数で進化します
            </div>

            <button
              onClick={handleCloseModal}
              style={{
                width:'100%',
                padding:'12px',
                background:'#F26A21',
                color:'#fff',
                border:'none',
                borderRadius:12,
                fontSize:15,
                fontWeight:700,
                cursor:'pointer',
              }}>
              受け取る
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
