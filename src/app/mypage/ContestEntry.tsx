'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Contest {
  id: string
  title: string
  deadline: string | null
  is_site_contest: boolean
}

interface Novel {
  id: string
  title: string
  published: boolean
}

interface Entry {
  contest_id: string
  novel_id: string
}

interface Props {
  novels: Novel[]
  contests: Contest[]
  initialEntries: Entry[]
  userId: string
}

export default function ContestEntry({ novels, contests, initialEntries, userId }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [selectedContest, setSelectedContest] = useState('')
  const [selectedNovel, setSelectedNovel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const publishedNovels = novels.filter(n => n.published)
  const siteContests = contests.filter(c => c.is_site_contest)

  // 選択中のコンテストに既に応募している作品
  const entriedNovelIds = entries
    .filter(e => e.contest_id === selectedContest)
    .map(e => e.novel_id)

  async function handleEntry() {
    setError(''); setSuccess('')
    if (!selectedContest) { setError('コンテストを選択してください'); return }
    if (!selectedNovel) { setError('作品を選択してください'); return }
    if (entriedNovelIds.includes(selectedNovel)) { setError('この作品はすでに応募済みです'); return }

    setLoading(true)
    const { error: err } = await supabase.from('contest_entries').insert({
      contest_id: selectedContest,
      novel_id: selectedNovel,
      user_id: userId,
    })
    setLoading(false)

    if (err) {
      setError('応募に失敗しました: ' + err.message)
      return
    }

    setEntries(prev => [...prev, { contest_id: selectedContest, novel_id: selectedNovel }])
    setSuccess('応募が完了しました！')
    setSelectedNovel('')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleCancel(contestId: string, novelId: string) {
    if (!confirm('応募を取り消しますか？')) return
    await supabase.from('contest_entries')
      .delete()
      .eq('contest_id', contestId)
      .eq('novel_id', novelId)
      .eq('user_id', userId)
    setEntries(prev => prev.filter(e => !(e.contest_id === contestId && e.novel_id === novelId)))
  }

  const contestMap = Object.fromEntries(contests.map(c => [c.id, c]))
  const novelMap   = Object.fromEntries(novels.map(n => [n.id, n]))

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden',marginTop:12}}>
      <div style={{padding:'14px 20px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
        <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>コンテスト応募</span>
      </div>

      {contests.length === 0 ? (
        <div style={{padding:'32px',textAlign:'center',color:'#B8AEA8',fontSize:13}}>
          現在募集中のコンテストはありません
        </div>
      ) : (
        <div style={{padding:'16px 20px'}}>
          {/* 応募フォーム */}
          <div style={{display:'grid',gap:10,marginBottom:16}}>
            <div>
              <label style={{fontSize:11,color:'#64748b',fontWeight:600,display:'block',marginBottom:4}}>コンテストを選択</label>
              <select value={selectedContest} onChange={e=>{setSelectedContest(e.target.value);setSelectedNovel('');setError('')}}
                style={{width:'100%',padding:'8px 12px',border:'1px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',background:'#fff'}}>
                <option value="">選択してください</option>
                {siteContests.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}{c.deadline ? `（締切：${new Date(c.deadline).toLocaleDateString('ja-JP')}）` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedContest && (
              <div>
                <label style={{fontSize:11,color:'#64748b',fontWeight:600,display:'block',marginBottom:4}}>応募する作品を選択</label>
                {publishedNovels.length === 0 ? (
                  <div style={{fontSize:12,color:'#B8AEA8',padding:'8px 0'}}>公開中の作品がありません</div>
                ) : (
                  <select value={selectedNovel} onChange={e=>{setSelectedNovel(e.target.value);setError('')}}
                    style={{width:'100%',padding:'8px 12px',border:'1px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',background:'#fff'}}>
                    <option value="">選択してください</option>
                    {publishedNovels.map(n => (
                      <option key={n.id} value={n.id} disabled={entriedNovelIds.includes(n.id)}>
                        {n.title}{entriedNovelIds.includes(n.id) ? '（応募済み）' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {error   && <div style={{fontSize:11,color:'#ef4444'}}>{error}</div>}
            {success && <div style={{fontSize:11,color:'#10b981',fontWeight:600}}>{success}</div>}

            {selectedContest && (
              <button onClick={handleEntry} disabled={loading||!selectedNovel}
                style={{padding:'8px 20px',background:'#F26A21',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',opacity:loading||!selectedNovel?0.5:1,alignSelf:'flex-start'}}>
                {loading?'応募中...':'応募する'}
              </button>
            )}
          </div>

          {/* 応募済み一覧 */}
          {entries.length > 0 && (
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#2B211B',marginBottom:8}}>応募済み一覧</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {entries.map((e, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#FFF9F2',borderRadius:8,border:'1px solid #F0D9C9'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#F26A21',marginBottom:2}}>{contestMap[e.contest_id]?.title || 'コンテスト'}</div>
                      <div style={{fontSize:12,color:'#2B211B'}}>{novelMap[e.novel_id]?.title || '作品'}</div>
                    </div>
                    <button onClick={()=>handleCancel(e.contest_id, e.novel_id)}
                      style={{fontSize:11,color:'#dc2626',background:'none',border:'1px solid #fca5a5',borderRadius:6,padding:'3px 10px',cursor:'pointer'}}>
                      取り消す
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
