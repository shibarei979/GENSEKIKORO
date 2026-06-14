'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  initialClaimedIds: string[]
}

// 単体ミッション（1条件 → 1バッジ）
interface SingleMission {
  type: 'single'
  id: string
  category: string
  title: string
  description: string
  current: number
  target: number
  badgeName: string
}

// まとめミッション（複数条件を全部クリア → 1バッジ）
interface BundleMission {
  type: 'bundle'
  id: string
  category: string
  title: string
  badgeName: string
  steps: {
    label: string
    current: number
    target: number
  }[]
}

type Mission = SingleMission | BundleMission

// モーダル用の型
interface ClaimTarget {
  id: string
  badgeName: string
  title: string
  claimIds: string[] // DBに保存するID一覧（bundleは複数）
}

export default function MissionClient({ user, stats, initialClaimedIds }: Props) {
  const supabase = createClient()
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set(initialClaimedIds))
  const [claimTarget, setClaimTarget] = useState<ClaimTarget | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  const missions: Mission[] = [
    // ===== 読者カテゴリ =====
    // 単体：最初の一歩
    {
      type: 'single',
      id: 'like_3',
      category: '読者',
      title: '作品を応援しよう',
      description: '3作品にいいねする',
      current: Math.min(stats.likeCount, 3),
      target: 3,
      badgeName: '応援バッジ',
    },
    // まとめ：いいね3段階まとめて1バッジ
    {
      type: 'bundle',
      id: 'like_bundle',
      category: '読者',
      title: 'いいね名人',
      badgeName: 'いいね名人バッジ',
      steps: [
        { label: '10作品にいいねする',  current: Math.min(stats.likeCount, 10),  target: 10 },
        { label: '30作品にいいねする',  current: Math.min(stats.likeCount, 30),  target: 30 },
        { label: '50作品にいいねする',  current: Math.min(stats.likeCount, 50),  target: 50 },
      ],
    },
    // 単体：保存
    {
      type: 'single',
      id: 'bookmark_5',
      category: '読者',
      title: 'お気に入りを作ろう',
      description: '5作品を保存する',
      current: Math.min(stats.bookmarkCount, 5),
      target: 5,
      badgeName: '保存家バッジ',
    },
    // 単体：初コメント
    {
      type: 'single',
      id: 'comment_1',
      category: '読者',
      title: '初コメント',
      description: '初めてコメントする',
      current: Math.min(stats.commentCount, 1),
      target: 1,
      badgeName: 'コメンテーターバッジ Lv.1',
    },
    // まとめ：コメント3段階
    {
      type: 'bundle',
      id: 'comment_bundle',
      category: '読者',
      title: 'コメント常連',
      badgeName: 'コメンテーターバッジ Lv.2',
      steps: [
        { label: '5回コメントする',  current: Math.min(stats.commentCount, 5),  target: 5 },
        { label: '10回コメントする', current: Math.min(stats.commentCount, 10), target: 10 },
        { label: '20回コメントする', current: Math.min(stats.commentCount, 20), target: 20 },
      ],
    },

    // ===== 拡散カテゴリ =====
    // 単体：初拡散
    {
      type: 'single',
      id: 'discover_1',
      category: '拡散',
      title: '初めての拡散',
      description: '作品を1回拡散する',
      current: Math.min(stats.discoverCount, 1),
      target: 1,
      badgeName: '拡散者バッジ Lv.1',
    },
    // まとめ：拡散3段階
    {
      type: 'bundle',
      id: 'discover_bundle',
      category: '拡散',
      title: '拡散の申し子',
      badgeName: '拡散者バッジ Lv.2',
      steps: [
        { label: '3回拡散する',  current: Math.min(stats.discoverCount, 3),  target: 3 },
        { label: '5回拡散する',  current: Math.min(stats.discoverCount, 5),  target: 5 },
        { label: '10回拡散する', current: Math.min(stats.discoverCount, 10), target: 10 },
      ],
    },

    // ===== 作者カテゴリ =====
    // 単体：デビュー
    {
      type: 'single',
      id: 'novel_1',
      category: '作者',
      title: 'デビュー作家',
      description: '初めての作品を公開する',
      current: Math.min(stats.novelCount, 1),
      target: 1,
      badgeName: '作家バッジ Lv.1',
    },
    // まとめ：作品数＋話数まとめて1バッジ
    {
      type: 'bundle',
      id: 'author_bundle',
      category: '作者',
      title: 'ベテラン作家',
      badgeName: '作家バッジ Lv.2',
      steps: [
        { label: '3作品公開する',   current: Math.min(stats.novelCount,   3),  target: 3 },
        { label: '10話以上投稿する', current: Math.min(stats.episodeCount, 10), target: 10 },
        { label: '20話以上投稿する', current: Math.min(stats.episodeCount, 20), target: 20 },
      ],
    },
    // 単体：連載開始
    {
      type: 'single',
      id: 'episode_5',
      category: '作者',
      title: '連載作家',
      description: '5話以上投稿する',
      current: Math.min(stats.episodeCount, 5),
      target: 5,
      badgeName: '連載バッジ',
    },

    // ===== フォローカテゴリ =====
    // 単体：初フォロー
    {
      type: 'single',
      id: 'follow_1',
      category: 'フォロー',
      title: 'お気に入り作家を見つけよう',
      description: '作者を1人フォローする',
      current: Math.min(stats.followCount, 1),
      target: 1,
      badgeName: 'ファンバッジ Lv.1',
    },
    // まとめ：フォロー2段階
    {
      type: 'bundle',
      id: 'follow_bundle',
      category: 'フォロー',
      title: 'フォロー上手',
      badgeName: 'ファンバッジ Lv.2',
      steps: [
        { label: '3人フォローする', current: Math.min(stats.followCount, 3), target: 3 },
        { label: '5人フォローする', current: Math.min(stats.followCount, 5), target: 5 },
      ],
    },
  ]

  const categories = ['読者', '拡散', '作者', 'フォロー']
  const categoryColors: Record<string, { bg: string; border: string; color: string; bar: string }> = {
    '読者':    { bg:'#FFF1E6', border:'#f5b080', color:'#F26A21', bar:'#F26A21' },
    '拡散':    { bg:'#f0fdf4', border:'#86efac', color:'#15803d', bar:'#22c55e' },
    '作者':    { bg:'#eff6ff', border:'#bfdbfe', color:'#2563eb', bar:'#3b82f6' },
    'フォロー': { bg:'#faf5ff', border:'#c4b5fd', color:'#7c3aed', bar:'#8b5cf6' },
  }

  // 表示対象（獲得済みは非表示）
  const visibleMissions = missions.filter(m => !claimedIds.has(m.id))
  const totalMissions = missions.length
  const completedMissions = claimedIds.size

  // bundleミッションが全ステップクリアしているか
  function isBundleDone(m: BundleMission): boolean {
    return m.steps.every(s => s.current >= s.target)
  }

  // bundleの全体進捗（0〜1）
  function bundleProgress(m: BundleMission): number {
    const total = m.steps.reduce((s, step) => s + step.target, 0)
    const done  = m.steps.reduce((s, step) => s + step.current, 0)
    return Math.min(1, done / total)
  }

  function handleClaim(m: Mission) {
    setClaimError('')
    if (m.type === 'single') {
      setClaimTarget({ id: m.id, badgeName: m.badgeName, title: m.title, claimIds: [m.id] })
    } else {
      setClaimTarget({ id: m.id, badgeName: m.badgeName, title: m.title, claimIds: [m.id] })
    }
  }

  async function handleCloseModal() {
    if (!claimTarget) return
    setClaiming(true)
    setClaimError('')
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { setClaimError('ログインが必要です'); setClaiming(false); return }

      // 全IDをまとめてinsert
      const rows = claimTarget.claimIds.map(mid => ({ user_id: currentUser.id, mission_id: mid }))
      const { error } = await supabase.from('user_missions').insert(rows)
      if (error && error.code !== '23505') {
        setClaimError('保存に失敗しました: ' + error.message)
        setClaiming(false)
        return
      }
      setClaimedIds(prev => {
        const next = new Set(Array.from(prev))
        claimTarget.claimIds.forEach(id => next.add(id))
        return next
      })
      setClaimTarget(null)
    } catch (e: any) {
      setClaimError('エラーが発生しました')
    }
    setClaiming(false)
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',margin:0,marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>ミッション</h1>
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
            <a href="/auth/login" style={{color:'#F26A21',fontWeight:600}}>ログイン</a>すると進捗が保存されます
          </div>
        )}
      </div>

      {/* カテゴリ別ミッション */}
      {categories.map(cat => {
        const catMissions = visibleMissions.filter(m => m.category === cat)
        if (catMissions.length === 0) return null
        const c = categoryColors[cat]
        const catTotal   = missions.filter(m => m.category === cat).length
        const catClaimed = missions.filter(m => m.category === cat && claimedIds.has(m.id)).length
        return (
          <div key={cat} style={{marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:4,height:18,background:c.bar,borderRadius:2}}/>
              <span style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>{cat}ミッション</span>
              <span style={{fontSize:12,color:c.color,background:c.bg,border:`1px solid ${c.border}`,padding:'1px 8px',borderRadius:10,fontWeight:600}}>
                {catClaimed}/{catTotal} 完了
              </span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {catMissions.map(m => {
                if (m.type === 'single') {
                  const done = m.current >= m.target
                  const pct  = Math.min(100, (m.current / m.target) * 100)
                  return (
                    <div key={m.id} style={{background:done?c.bg:'#fff',border:`1px solid ${done?c.border:'#F0D9C9'}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:done?c.color:'#2B211B',marginBottom:3}}>{m.title}</div>
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
                      <div style={{flexShrink:0,minWidth:72,textAlign:'center'}}>
                        {done
                          ? <button onClick={()=>handleClaim(m)} style={{padding:'8px 16px',background:'#F26A21',color:'#fff',border:'none',borderRadius:20,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(242,106,33,.3)'}}>クリア！</button>
                          : <span style={{fontSize:11,color:'#B8AEA8'}}>あと{m.target - m.current}</span>
                        }
                      </div>
                    </div>
                  )
                } else {
                  // bundle
                  const done = isBundleDone(m)
                  const pct  = bundleProgress(m) * 100
                  return (
                    <div key={m.id} style={{background:done?c.bg:'#fff',border:`2px solid ${done?c.border:'#F0D9C9'}`,borderRadius:12,padding:'14px 16px'}}>
                      {/* ヘッダー */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                        <div>
                          <span style={{fontSize:10,background:'#2B211B',color:'#fff',padding:'1px 7px',borderRadius:6,marginRight:6,fontWeight:600}}>まとめ</span>
                          <span style={{fontSize:14,fontWeight:700,color:done?c.color:'#2B211B'}}>{m.title}</span>
                        </div>
                        {done
                          ? <button onClick={()=>handleClaim(m)} style={{padding:'8px 16px',background:'#F26A21',color:'#fff',border:'none',borderRadius:20,fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(242,106,33,.3)'}}>クリア！</button>
                          : <span style={{fontSize:11,color:'#B8AEA8',whiteSpace:'nowrap'}}>全部クリアでバッジ獲得</span>
                        }
                      </div>
                      {/* ステップ一覧 */}
                      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
                        {m.steps.map((step, i) => {
                          const stepDone = step.current >= step.target
                          const stepPct  = Math.min(100, (step.current / step.target) * 100)
                          return (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:16,height:16,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                                background:stepDone?c.bar:'#F0D9C9',fontSize:9,color:'#fff',fontWeight:700}}>
                                {stepDone ? '✓' : i+1}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,color:stepDone?c.color:'#77706A',marginBottom:3,fontWeight:stepDone?600:400}}>{step.label}</div>
                                <div style={{height:4,background:'#F0D9C9',borderRadius:2,overflow:'hidden'}}>
                                  <div style={{height:'100%',background:stepDone?c.bar:'#F26A21',borderRadius:2,width:`${stepPct}%`,transition:'width .3s'}}/>
                                </div>
                              </div>
                              <span style={{fontSize:10,color:stepDone?c.color:'#B8AEA8',fontWeight:600,whiteSpace:'nowrap',flexShrink:0}}>
                                {user ? `${step.current}/${step.target}` : `?/${step.target}`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {/* 全体進捗バー */}
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{flex:1,height:6,background:'#F0D9C9',borderRadius:3,overflow:'hidden'}}>
                          <div style={{height:'100%',background:done?c.bar:'#F26A21',borderRadius:3,width:`${pct}%`,transition:'width .4s'}}/>
                        </div>
                        <span style={{fontSize:11,color:done?c.color:'#77706A',fontWeight:600,whiteSpace:'nowrap'}}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          </div>
        )
      })}

      {visibleMissions.length === 0 && (
        <div style={{background:'#FFF1E6',border:'1px solid #f5b080',borderRadius:14,padding:'40px',textAlign:'center',marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:'#F26A21',marginBottom:6}}>全ミッション達成！</div>
          <div style={{fontSize:13,color:'#77706A'}}>新しいミッションが追加されるまでお待ちください</div>
        </div>
      )}

      <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:14,padding:'16px 20px',marginTop:8}}>
        <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:6}}>近日公開予定</div>
        <div style={{fontSize:12,color:'#77706A',lineHeight:1.8}}>
          連続ログインバッジ（1日・3日・5日・7日・30日）<br/>
          推しバッジ（お気に入り作品への応援数）<br/>
          新人バッジ（登録から30日以内の特典）
        </div>
      </div>

      {/* バッジ獲得モーダル */}
      {claimTarget && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
          <div style={{position:'relative',background:'#fff',borderRadius:20,padding:'32px 28px',maxWidth:320,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',zIndex:1}}>
            <div style={{fontSize:11,color:'#F26A21',fontWeight:700,letterSpacing:'0.15em',marginBottom:16}}>バッジ獲得</div>
            <div style={{width:100,height:100,borderRadius:'50%',background:'linear-gradient(135deg,#F26A21,#f5a060)',margin:'0 auto 20px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(242,106,33,.35)',border:'4px solid #FFF1E6'}}>
              <span style={{fontSize:13,fontWeight:700,color:'#fff',lineHeight:1.4,padding:'0 8px'}}>仮バッジ</span>
            </div>
            <div style={{fontSize:18,fontWeight:700,color:'#2B211B',marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>
              {claimTarget.badgeName}
            </div>
            <div style={{fontSize:13,color:'#77706A',marginBottom:6}}>「{claimTarget.title}」をクリアしました！</div>
            <div style={{fontSize:11,color:'#B8AEA8',marginBottom:24}}>バッジは連続クリア日数で進化します</div>
            {claimError && (
              <div style={{fontSize:12,color:'#dc2626',marginBottom:12,background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'8px 12px'}}>
                {claimError}
              </div>
            )}
            <button onClick={handleCloseModal} disabled={claiming} style={{width:'100%',padding:'12px',background:'#F26A21',color:'#fff',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:claiming?'not-allowed':'pointer',opacity:claiming?0.6:1}}>
              {claiming ? '保存中...' : '受け取る'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
