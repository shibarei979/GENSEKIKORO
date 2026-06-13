'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const GENRES_BASE = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','その他']

const MOODS = [
  { emoji: '💘', label: '胸きゅんしたい',   tags: ['恋愛','ときめき','胸キュン','片思い','ラブコメ'] },
  { emoji: '😢', label: '切ない物語が読みたい', tags: ['切ない','悲恋','別れ','涙','感動'] },
  { emoji: '😂', label: '笑いたい',         tags: ['ギャグ','コメディ','ほのぼの','笑える'] },
  { emoji: '😱', label: 'ぞくっとしたい',   tags: ['ホラー','ミステリー','謎解き','サスペンス','怖い'] },
  { emoji: '🔥', label: '熱い展開が読みたい', tags: ['バトル','熱い','友情','成長','無双'] },
  { emoji: '🌿', label: '癒されたい',       tags: ['ほのぼの','スローライフ','日常','癒し','ふわふわ'] },
  { emoji: '🧠', label: '考察したい',       tags: ['謎解き','伏線','考察','ミステリー','哲学'] },
  { emoji: '🌙', label: '余韻に浸りたい',   tags: ['余韻','文学','詩的','感動','純文学'] },
  { emoji: '⏱️', label: '短時間で読みたい', tags: ['短編','読み切り','1話完結'] },
  { emoji: '📖', label: '一気読みしたい',   tags: ['続きが気になる','完結','長編','怒涛'] },
  { emoji: '✨', label: '異世界に行きたい', tags: ['異世界','転生','ファンタジー','冒険'] },
  { emoji: '💪', label: '主人公に憧れたい', tags: ['最強','チート','成長','主人公'] },
]

const KEYWORD_CATEGORIES = [
  { label: '作品傾向', items: ['ギャグ','シリアス','ほのぼの','ダーク','感動','スローライフ','復讐','ループ','群像劇','バトル','冒険','成長物語','友情','ヒューマンドラマ','謎解き','サスペンス'] },
  { label: '主人公',   items: ['チート','最強','天才','悪役令嬢','転落令嬢','影の実力者','暗殺者','追放','記憶喪失','勘当','冤罪','転生者','召喚された','孤独な主人公','女主人公','男主人公'] },
  { label: '職業・種族', items: ['魔法使い','ヒーラー','騎士','錬金術師','精霊使い','竜騎士','薬師','剣士','吸血鬼','獣人','エルフ','ドワーフ','竜','神','悪魔','魔族'] },
  { label: '舞台・世界観', items: ['異世界','学園','ダンジョン','王宮','魔法学校','近未来','宇宙','和風','中世ヨーロッパ','海洋','砂漠','地下世界','神話世界','現代日本','戦国'] },
  { label: '恋愛・人間関係', items: ['幼馴染','許嫁','政略結婚','契約結婚','初恋','片思い','三角関係','ハーレム','逆ハーレム','BL','百合','禁断の恋','年の差','身分差'] },
  { label: '要素', items: ['魔王討伐','内政','転生','転移','タイムトラベル','ゲーム世界','タイムリープ','獣耳','魔法少女','精霊','神様','鑑定スキル','無双','ざまぁ','婚約破棄'] },
]

interface Props {
  defaultQ?: string; defaultExclude?: string; defaultGenre?: string
  defaultType?: string; defaultSerial?: string; defaultTag?: string
  defaultSort?: string; ageVerified?: boolean; defaultDiscover?: boolean
  defaultAuthor?: string; defaultLikeMin?: string; defaultLikeMax?: string
}

export default function SearchForm({
  defaultQ='', defaultExclude='', defaultGenre='', defaultType='',
  defaultSerial='', defaultTag='', defaultSort='new', ageVerified=false, defaultDiscover=false,
  defaultAuthor='', defaultLikeMin='', defaultLikeMax=''
}: Props) {
  const router = useRouter()
  const GENRES = ageVerified ? [...GENRES_BASE, '官能'] : GENRES_BASE

  const [q,                  setQ]                  = useState(defaultQ)
  const [author,             setAuthor]             = useState(defaultAuthor)
  const [likeMin,            setLikeMin]            = useState(defaultLikeMin)
  const [likeMax,            setLikeMax]            = useState(defaultLikeMax)
  const [exclude,            setExclude]            = useState(defaultExclude)
  const [genre,              setGenre]              = useState(defaultGenre)
  const [type,               setType]               = useState(defaultType)
  const [serial,             setSerial]             = useState(defaultSerial)
  const [tags,               setTags]               = useState<string[]>(defaultTag ? defaultTag.split(',').filter(Boolean) : [])
  const [sort,               setSort]               = useState(defaultSort)
  const [discoverMode,       setDiscoverMode]       = useState(defaultDiscover)
  const [showDetail,         setShowDetail]         = useState(!!(defaultGenre||defaultType||defaultSerial||defaultTag))
  const [showSearchExamples, setShowSearchExamples] = useState(false)
  const [showExcludeExamples,setShowExcludeExamples]= useState(false)
  const [history,            setHistory]            = useState<string[]>([])
  const [showHistory,        setShowHistory]        = useState(false)
  const [exHistory,          setExHistory]          = useState<string[]>([])
  const [showExHistory,      setShowExHistory]      = useState(false)
  const [showMoods,          setShowMoods]          = useState(false)
  const [activeMood,         setActiveMood]         = useState<string|null>(null)
  const MAX_HISTORY = 10

  useEffect(() => {
    try {
      const saved = localStorage.getItem('search_history')
      if (saved) setHistory(JSON.parse(saved))
      const savedEx = localStorage.getItem('exclude_history')
      if (savedEx) setExHistory(JSON.parse(savedEx))
    } catch {}
  }, [])

  function handleMoodSelect(mood: typeof MOODS[0]) {
    if (activeMood === mood.label) {
      setActiveMood(null)
      setTags(tags.filter(t => !mood.tags.includes(t)))
    } else {
      setActiveMood(mood.label)
      const newTags = Array.from(new Set([...tags.filter(t => !MOODS.some(m => m.tags.includes(t))), ...mood.tags.slice(0,3)]))
      setTags(newTags)
    }
  }

  function handleSearch() {
    const params = new URLSearchParams()
    if (q)               params.set('q',       q)
    if (author)          params.set('author',  author)
    if (likeMin)         params.set('likeMin', likeMin)
    if (likeMax)         params.set('likeMax', likeMax)
    if (exclude)         params.set('exclude', exclude)
    if (genre)           params.set('genre',   genre)
    if (type)            params.set('type',    type)
    if (serial)          params.set('serial',  serial)
    if (tags.length > 0) params.set('tag',     tags.join(','))
    if (discoverMode)    params.set('sort',    'discover')
    else if (sort)       params.set('sort',    sort)
    if (q.trim()) {
      try {
        const nh = [q.trim(), ...history.filter(h => h !== q.trim())].slice(0, MAX_HISTORY)
        setHistory(nh)
        localStorage.setItem('search_history', JSON.stringify(nh))
      } catch {}
    }
    if (exclude.trim()) {
      try {
        const neh = [exclude.trim(), ...exHistory.filter(h => h !== exclude.trim())].slice(0, MAX_HISTORY)
        setExHistory(neh)
        localStorage.setItem('exclude_history', JSON.stringify(neh))
      } catch {}
    }
    router.push(`/search?${params.toString()}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  const pill = (active: boolean) => ({
    padding: '5px 14px', borderRadius: 16, fontSize: 12,
    fontWeight: 600 as const, cursor: 'pointer' as const,
    border: `1px solid ${active ? '#F26A21' : '#F0D9C9'}`,
    background: active ? '#F26A21' : '#fff',
    color: active ? '#fff' : '#77706A',
    transition: 'all .15s',
  })

  const inp = {
    width: '100%', padding: '9px 14px', border: '1.5px solid #F0D9C9',
    borderRadius: 8, fontSize: 13, color: '#2B211B', outline: 'none', background: '#fff',
  } as const

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'20px',marginBottom:16}}>
      <div style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        作品を探す
      </div>

      <div style={{display:'flex',gap:10,marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:4}}>キーワード</div>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="作品名・あらすじで検索" style={inp}/>
          <div style={{marginTop:4}}>
            <button type="button" onClick={()=>setShowHistory(!showHistory)}
              style={{fontSize:10,color:'#77706A',background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:3}}>
              検索履歴
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{transition:'transform .15s',transform:showHistory?'rotate(180deg)':'rotate(0deg)'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showHistory && (
              <div style={{marginTop:4,padding:'8px',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:10,color:'#B8AEA8'}}>最近の検索</span>
                  <button type="button" onClick={()=>{setHistory([]);try{localStorage.removeItem('search_history')}catch{}}}
                    style={{fontSize:10,color:'#B8AEA8',background:'none',border:'none',cursor:'pointer',padding:0}}>クリア</button>
                </div>
                {history.length === 0
                  ? <div style={{fontSize:11,color:'#B8AEA8'}}>まだ検索履歴がありません</div>
                  : <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {history.map((h,i) => (
                      <button key={i} type="button" onClick={()=>setQ(h)}
                        style={{padding:'2px 9px',borderRadius:10,fontSize:11,cursor:'pointer',
                          background:q===h?'#F26A21':'#fff',color:q===h?'#fff':'#77706A',
                          border:`1px solid ${q===h?'#F26A21':'#F0D9C9'}`}}>{h}</button>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>
          <button type="button" onClick={()=>setShowSearchExamples(!showSearchExamples)}
            style={{marginTop:4,fontSize:10,color:'#F26A21',background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:3}}>
            検索ワード例
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{transition:'transform .15s',transform:showSearchExamples?'rotate(180deg)':'rotate(0deg)'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showSearchExamples && (
            <div style={{marginTop:6,padding:'12px',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:8}}>
              {KEYWORD_CATEGORIES.map(cat => (
                <div key={cat.label} style={{display:'flex',gap:6,marginBottom:8,alignItems:'flex-start'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#77706A',minWidth:72,paddingTop:4,flexShrink:0}}>{cat.label}</div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {cat.items.map(ex => (
                      <button key={ex} type="button" onClick={()=>setQ(q===ex?'':ex)}
                        style={{padding:'3px 10px',borderRadius:10,fontSize:11,cursor:'pointer',
                          background:q===ex?'#F26A21':'#fff',color:q===ex?'#fff':'#77706A',
                          border:`1px solid ${q===ex?'#F26A21':'#F0D9C9'}`}}>{ex}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{flex:1}}>
          <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:4}}>除外キーワード</div>
          <input value={exclude} onChange={e=>setExclude(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="含まない言葉を入力" style={inp}/>
          <div style={{marginTop:4}}>
            <button type="button" onClick={()=>setShowExHistory(!showExHistory)}
              style={{fontSize:10,color:'#77706A',background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:3}}>
              除外履歴
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{transition:'transform .15s',transform:showExHistory?'rotate(180deg)':'rotate(0deg)'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showExHistory && (
              <div style={{marginTop:4,padding:'8px',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:10,color:'#B8AEA8'}}>最近の除外</span>
                  <button type="button" onClick={()=>{setExHistory([]);try{localStorage.removeItem('exclude_history')}catch{}}}
                    style={{fontSize:10,color:'#B8AEA8',background:'none',border:'none',cursor:'pointer',padding:0}}>クリア</button>
                </div>
                {exHistory.length === 0
                  ? <div style={{fontSize:11,color:'#B8AEA8'}}>まだ除外履歴がありません</div>
                  : <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {exHistory.map((h,i) => (
                      <button key={i} type="button" onClick={()=>setExclude(h)}
                        style={{padding:'2px 9px',borderRadius:10,fontSize:11,cursor:'pointer',
                          background:exclude===h?'#F26A21':'#fff',color:exclude===h?'#fff':'#77706A',
                          border:`1px solid ${exclude===h?'#F26A21':'#F0D9C9'}`}}>{h}</button>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>
          <button type="button" onClick={()=>setShowExcludeExamples(!showExcludeExamples)}
            style={{marginTop:4,fontSize:10,color:'#F26A21',background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',gap:3}}>
            除外ワード例
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{transition:'transform .15s',transform:showExcludeExamples?'rotate(180deg)':'rotate(0deg)'}}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showExcludeExamples && (
            <div style={{marginTop:6,padding:'12px',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:8}}>
              {KEYWORD_CATEGORIES.map(cat => (
                <div key={cat.label} style={{display:'flex',gap:6,marginBottom:8,alignItems:'flex-start'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#77706A',minWidth:72,paddingTop:4,flexShrink:0}}>{cat.label}</div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {cat.items.map(ex => (
                      <button key={ex} type="button" onClick={()=>setExclude(exclude===ex?'':ex)}
                        style={{padding:'3px 10px',borderRadius:10,fontSize:11,cursor:'pointer',
                          background:exclude===ex?'#F26A21':'#fff',color:exclude===ex?'#fff':'#77706A',
                          border:`1px solid ${exclude===ex?'#F26A21':'#F0D9C9'}`}}>{ex}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <button type="button" onClick={()=>setShowMoods(!showMoods)}
          style={{display:'flex',alignItems:'center',gap:6,width:'100%',padding:'7px 14px',border:'1.5px solid #F0D9C9',
            borderRadius:8,background:'#FFF9F2',color:'#77706A',fontSize:12,fontWeight:600,cursor:'pointer',justifyContent:'space-between'}}>
          <span>気分で探す{activeMood ? ` ● ${activeMood}` : ''}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{transition:'transform .2s',transform:showMoods?'rotate(180deg)':'rotate(0deg)'}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {showMoods && (
          <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:6}}>
            {MOODS.map(mood => (
              <button key={mood.label} type="button" onClick={()=>handleMoodSelect(mood)}
                style={{padding:'6px 14px',borderRadius:16,fontSize:12,cursor:'pointer',
                  whiteSpace:'nowrap' as const,
                  border:`1.5px solid ${activeMood===mood.label?'#F26A21':'#F0D9C9'}`,
                  background:activeMood===mood.label?'#F26A21':'#fff',
                  color:activeMood===mood.label?'#fff':'#2B211B',
                  fontWeight:activeMood===mood.label?700:400,
                  transition:'all .15s'}}>
                {mood.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={()=>setShowDetail(!showDetail)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'1.5px solid #F0D9C9',
          borderRadius:8,background:'#FFF9F2',color:'#77706A',fontSize:12,fontWeight:600,cursor:'pointer',
          marginBottom:showDetail?12:0,width:'100%',justifyContent:'space-between'}}>
        <span>詳細条件設定{(genre||type||serial||tags.length>0||author||likeMin) ? ' ●' : ''}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{transition:'transform .2s',transform:showDetail?'rotate(180deg)':'rotate(0deg)'}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {showDetail && (
        <div style={{border:'1px solid #F0D9C9',borderRadius:8,padding:'14px',marginBottom:12,background:'#FFF9F2'}}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:6}}>ジャンル</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button onClick={()=>setGenre('')} style={pill(!genre)}>すべて</button>
              {GENRES.map(g => (
                <button key={g} onClick={()=>setGenre(genre===g?'':g)} style={pill(genre===g)}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:6}}>作品の長さ</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setType('')}    style={pill(!type)}>すべて</button>
                <button onClick={()=>setType(type==='長編'?'':'長編')} style={pill(type==='長編')}>長編</button>
                <button onClick={()=>setType(type==='短編'?'':'短編')} style={pill(type==='短編')}>短編</button>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:6}}>連載状況</div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setSerial('')}                          style={pill(!serial)}>すべて</button>
                <button onClick={()=>setSerial(serial==='serial'?'':'serial')}     style={pill(serial==='serial')}>連載中</button>
                <button onClick={()=>setSerial(serial==='complete'?'':'complete')} style={pill(serial==='complete')}>完結</button>
              </div>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:6}}>タグ</div>
            <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
              <input
                onKeyDown={e=>{
                  if(e.key==='Enter'&&(e.target as HTMLInputElement).value.trim()){
                    const v=(e.target as HTMLInputElement).value.trim()
                    if(!tags.includes(v))setTags([...tags,v])
                    ;(e.target as HTMLInputElement).value=''
                  }
                }}
                placeholder="タグを入力してEnter" style={{...inp,width:'40%'}}/>
              {tags.length > 0 && (
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {tags.map(t => (
                    <span key={t} style={{display:'inline-flex',alignItems:'center',gap:3,padding:'3px 8px',background:'#F26A21',color:'#fff',borderRadius:12,fontSize:11,fontWeight:600}}>
                      #{t}
                      <button onClick={()=>setTags(tags.filter(x=>x!==t))} style={{background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',padding:'0 2px',fontSize:13,lineHeight:1}}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {KEYWORD_CATEGORIES.map(cat => cat.items).flat().slice(0,25).map(t => (
                <button key={t} type="button" onClick={()=>setTags(tags.includes(t)?tags.filter(x=>x!==t):[...tags,t])}
                  style={{padding:'3px 10px',borderRadius:12,fontSize:11,cursor:'pointer',transition:'all .15s',
                    border:`1px solid ${tags.includes(t)?'#F26A21':'#F0D9C9'}`,
                    background:tags.includes(t)?'#F26A21':'#FFF9F2',
                    color:tags.includes(t)?'#fff':'#77706A'}}>
                  #{t}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:6}}>作者名で検索</div>
            <input value={author} onChange={e=>setAuthor(e.target.value)}
              placeholder="作者名を入力..."
              style={{width:'100%',padding:'7px 10px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:12,outline:'none'}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:'#77706A',fontWeight:600,marginBottom:6}}>
              いいね数 {likeMin||likeMax ? `(${likeMin||'0'}〜${likeMax||'∞'})` : ''}
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {[
                {label:'指定なし', min:'', max:''},
                {label:'10以上',  min:'10', max:''},
                {label:'50以上',  min:'50', max:''},
                {label:'100以上', min:'100', max:''},
                {label:'200以上', min:'200', max:''},
                {label:'500以上', min:'500', max:''},
              ].map(r => (
                <button key={r.label} onClick={()=>{setLikeMin(r.min);setLikeMax(r.max)}}
                  style={{padding:'4px 10px',borderRadius:14,fontSize:11,fontWeight:500,border:'1px solid',cursor:'pointer',
                    background:likeMin===r.min&&likeMax===r.max?'#F26A21':'#FFF1E6',
                    color:likeMin===r.min&&likeMax===r.max?'#fff':'#F26A21',
                    borderColor:likeMin===r.min&&likeMax===r.max?'#F26A21':'#f5b080'}}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:10,alignItems:'center',justifyContent:'space-between',marginTop:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,color:'#77706A',fontWeight:600}}>並び順</span>
          <button onClick={()=>setSort('new')}  style={pill(sort==='new'&&!discoverMode)}>新着順</button>
          <button onClick={()=>setSort('like')} style={pill(sort==='like'&&!discoverMode)}>いいね順</button>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {(q||exclude||genre||type||serial||tags.length>0||author||likeMin) && (
            <button onClick={()=>{setQ('');setExclude('');setGenre('');setType('');setSerial('');setTags([]);setSort('new');setDiscoverMode(false);setAuthor('');setLikeMin('');setLikeMax('');router.push('/search')}}
              style={{fontSize:12,color:'#B8AEA8',background:'none',border:'none',cursor:'pointer'}}>
              条件クリア ×
            </button>
          )}
          <button onClick={handleSearch}
            style={{padding:'10px 32px',background:'#F26A21',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer'}}>
            検　索
          </button>
        </div>
      </div>
    </div>
  )
}
