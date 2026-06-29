'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Header from '@/components/layout/Header'

const GENRES = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','官能','その他']

const TAG_EXAMPLES: string[] = [
  '異世界転生','現代ファンタジー','魔法','ドラゴン','剣と魔法','近未来','宇宙','学園','王宮','戦国時代',
  '最強主人公','無自覚チート','悪役令嬢','聖女','騎士','魔王','勇者','転生者','無能から覚醒','英雄',
  'スローライフ','復讐','溺愛','ざまぁ','ハーレム','純愛','友情','成長','逆転','バディもの',
  'ほのぼの','シリアス','コメディ','ダーク','謎解き','バトル','恋愛メイン','群像劇','日常系','感動',
  'BL','GL','百合','兄妹','姉弟','師匠と弟子','年上ヒロイン','年下ヒロイン','メンヘラ','ヤンデレ',
  'ループ','タイムリープ','記憶喪失','どんでん返し','伏線回収','ハッピーエンド','鬱展開','残酷描写','泣ける',
]

function toVerticalText(text: string): string {
  return text
    .replace(/0/g,'０').replace(/1/g,'１').replace(/2/g,'２')
    .replace(/3/g,'３').replace(/4/g,'４').replace(/5/g,'５')
    .replace(/6/g,'６').replace(/7/g,'７').replace(/8/g,'８')
    .replace(/9/g,'９')
    .replace(/ー/g,'｜').replace(/－/g,'｜').replace(/—/g,'｜')
    .replace(/（/g,'︵').replace(/）/g,'︶')
    .replace(/\(/g,'︵').replace(/\)/g,'︶')
    .replace(/「/g,'﹁').replace(/」/g,'﹂')
    .replace(/『/g,'﹃').replace(/』/g,'﹄')
}

function isHorizontalCharPC(ch: string): boolean {
  return ['〜','…','‥','─'].includes(ch)
}

export default function PostSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState(null as any)
  const [userId, setUserId] = useState('')
  const [myNovels, setMyNovels] = useState([] as any[])
  const [contests, setContests] = useState([] as any[])
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  // フォーム
  const [step, setStep] = useState('select' as 'select' | 'new' | 'existing')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [catchcopy, setCatchcopy] = useState('')
  const [genre, setGenre] = useState('')
  const [tags, setTags] = useState([] as string[])
  const [tagInput, setTagInput] = useState('')
  const [novelType, setNovelType] = useState('長編' as '長編'|'短編')
  const [isR18, setIsR18] = useState(false)
  const [isR15, setIsR15] = useState(false)
  const [aimsPublishing, setAimsPublishing] = useState(false)
  const [selectedContestIds, setSelectedContestIds] = useState([] as string[])
  const [showTagExamples, setShowTagExamples] = useState(false)
  const [showCatchcopyHint, setShowCatchcopyHint] = useState(false)
  const [errors, setErrors] = useState({} as Record<string,string>)
  const [selectedNovelId, setSelectedNovelId] = useState('')

  useEffect(() => {
    setMounted(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      supabase.from('profiles').select('*').eq('user_id', user.id).single()
        .then(({ data }) => setProfile(data))
      supabase.from('novels').select('id,title,genre,novel_type').eq('author_id', user.id).eq('published', true)
        .then(({ data }) => setMyNovels(data || []))
    })
    const now = new Date().toISOString()
    supabase.from('contests')
      .select('id,title,deadline,is_site_contest,exclusive')
      .eq('is_published', true).eq('is_site_contest', true)
      .or(`deadline.is.null,deadline.gt.${now}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setContests(data || []))
  }, [])

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 10) { setTags([...tags,t]); setTagInput('') }
  }

  function validateNew() {
    const errs: Record<string,string> = {}
    if (!title.trim()) errs.title = 'タイトルを入力してください'
    if (!genre) errs.genre = 'ジャンルを選択してください'
    return errs
  }

  async function handleCreateAndGo() {
    const errs = validateNew()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    const { data: novel, error } = await supabase.from('novels').insert({
      author_id: userId,
      title: title.trim(),
      summary: summary.trim() || null,
      catchcopy: catchcopy.trim() || null,
      genre, tags,
      novel_type: novelType,
      is_r18: isR18, is_r15: isR15,
      aims_publishing: aimsPublishing,
      is_serial: true,
      published: false,
    }).select().single()
    if (error || !novel) { setErrors({ submit: '作品の作成に失敗しました' }); setLoading(false); return }

    // コンテスト応募
    if (selectedContestIds.length > 0) {
      await supabase.from('contest_entries').upsert(
        selectedContestIds.map(cid => ({ contest_id: cid, novel_id: novel.id, user_id: userId })),
        { onConflict: 'contest_id,novel_id' }
      )
    }

    router.push(`/post?novel=${novel.id}`)
  }

  function handleExistingGo() {
    if (!selectedNovelId) { setErrors({ novel: '作品を選択してください' }); return }
    router.push(`/post?novel=${selectedNovelId}`)
  }

  const inp = {width:'100%',padding:'9px 12px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,background:'var(--color-bg-card)',color:'var(--color-text)',outline:'none',boxSizing:'border-box'} as const
  const lbl = {fontSize:12,fontWeight:600,color:'var(--color-text-muted)',display:'block',marginBottom:5} as const
  const er  = {fontSize:11,color:'var(--color-danger)',marginTop:3} as const
  const fg  = {marginBottom:18} as const

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)'}}>
      <Header profile={profile} user={!!userId} />

      <div style={{maxWidth:640,margin:'0 auto',padding:'32px 20px 80px'}}>

        {/* ステップ：選択 */}
        {step === 'select' && (
          <>
            <h1 style={{fontSize:20,fontWeight:700,color:'var(--color-text)',marginBottom:6}}>投稿する作品を選択</h1>
            <p style={{fontSize:13,color:'var(--color-text-muted)',marginBottom:24}}>新しい作品を始めますか？それとも続きを書きますか？</p>

            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <button onClick={() => setStep('new')}
                style={{padding:'20px 24px',borderRadius:12,border:'2px solid var(--color-brand-border)',background:'var(--color-bg-card)',cursor:'pointer',textAlign:'left' as const}}>
                <div style={{fontSize:15,fontWeight:700,color:'var(--color-brand)',marginBottom:4}}>新しい作品を書く</div>
                <div style={{fontSize:12,color:'var(--color-text-muted)'}}>新連載・短編など、新しい作品を始める</div>
              </button>

              <button onClick={() => setStep('existing')} disabled={myNovels.length === 0}
                style={{padding:'20px 24px',borderRadius:12,border:'2px solid var(--color-brand-border)',background:'var(--color-bg-card)',cursor:myNovels.length===0?'not-allowed':'pointer',textAlign:'left' as const,opacity:myNovels.length===0?0.5:1}}>
                <div style={{fontSize:15,fontWeight:700,color:'var(--color-text)',marginBottom:4}}>連載中の作品に続きを追加</div>
                <div style={{fontSize:12,color:'var(--color-text-muted)'}}>{myNovels.length===0 ? '公開中の連載作品がありません' : `${myNovels.length}件の作品から選択`}</div>
              </button>
            </div>

            <div style={{textAlign:'center',marginTop:20}}>
              <Link href="/mypage" style={{fontSize:13,color:'var(--color-text-faint)',textDecoration:'none'}}>キャンセル</Link>
            </div>
          </>
        )}

        {/* ステップ：連載中の作品を選択 */}
        {step === 'existing' && (
          <>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
              <button onClick={() => setStep('select')} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--color-brand)',padding:0}}>← 戻る</button>
              <h1 style={{fontSize:20,fontWeight:700,color:'var(--color-text)',margin:0}}>作品を選択</h1>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {myNovels.map(n => (
                <button key={n.id} onClick={() => setSelectedNovelId(n.id)}
                  style={{padding:'14px 18px',borderRadius:10,border:`2px solid ${selectedNovelId===n.id?'var(--color-brand)':'var(--color-brand-border)'}`,background:selectedNovelId===n.id?'var(--color-brand-light)':'var(--color-bg-card)',cursor:'pointer',textAlign:'left' as const,display:'flex',alignItems:'center',gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:selectedNovelId===n.id?'var(--color-brand)':'var(--color-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.title}</div>
                    <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>{n.genre} · {n.novel_type}</div>
                  </div>
                  {selectedNovelId===n.id && <span style={{color:'var(--color-brand)',fontSize:18,flexShrink:0}}>✓</span>}
                </button>
              ))}
            </div>
            {errors.novel && <div style={{...er,marginTop:8}}>{errors.novel}</div>}
            <button onClick={handleExistingGo}
              style={{width:'100%',marginTop:20,padding:'13px',background:'var(--color-brand)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
              この作品に追加する
            </button>
          </>
        )}

        {/* ステップ：新作情報入力 */}
        {step === 'new' && (
          <>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
              <button onClick={() => setStep('select')} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--color-brand)',padding:0}}>← 戻る</button>
              <h1 style={{fontSize:20,fontWeight:700,color:'var(--color-text)',margin:0}}>作品情報</h1>
            </div>

            {/* タイトル */}
            <div style={fg}>
              <label style={lbl}>作品タイトル <span style={{color:'var(--color-danger)'}}>*</span></label>
              <input value={title} onChange={e=>setTitle(e.target.value)}
                style={{...inp,borderColor:errors.title?'var(--color-danger)':'var(--color-brand-border)'}}
                placeholder="作品タイトル（必須）"/>
              {errors.title && <div style={er}>{errors.title}</div>}
            </div>

            {/* あらすじ */}
            <div style={fg}>
              <label style={lbl}>あらすじ</label>
              <textarea value={summary} onChange={e=>setSummary(e.target.value)}
                style={{...inp,resize:'vertical',minHeight:80}} placeholder="作品のあらすじ（省略可）"/>
            </div>

            {/* キャッチコピー */}
            <div style={fg}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                <label style={{...lbl,marginBottom:0}}>キャッチコピー</label>
                <span style={{fontSize:11,color:'var(--color-text-faint)'}}>作品カードに表示（省略可・100文字以内）</span>
                <button type="button" onClick={()=>setShowCatchcopyHint(!showCatchcopyHint)}
                  style={{width:18,height:18,borderRadius:'50%',border:'1.5px solid var(--color-brand-border)',background:showCatchcopyHint?'var(--color-brand)':'var(--color-bg-card)',color:showCatchcopyHint?'#fff':'var(--color-text-muted)',fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0}}>
                  ？
                </button>
              </div>
              {showCatchcopyHint && mounted && (
                <div style={{background:'var(--color-brand-light)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'12px 14px',marginBottom:8,fontSize:12,color:'var(--color-text-muted)',lineHeight:1.7}}>
                  作品カードのポップアップに縦書きで表示されます。入力しない場合はあらすじが表示されます。
                </div>
              )}
              <textarea value={catchcopy} onChange={e=>setCatchcopy(e.target.value.slice(0,100))}
                style={{...inp,resize:'vertical',minHeight:60}} placeholder="例：「私は絶対に、あなたを守ってみせる」"/>
              <div style={{fontSize:10,color:'var(--color-text-faint)',textAlign:'right',marginTop:2}}>{catchcopy.length}/100</div>
            </div>

            {/* 作品の長さ */}
            <div style={fg}>
              <label style={lbl}>作品の長さ <span style={{color:'var(--color-danger)'}}>*</span></label>
              <div style={{display:'flex',gap:10}}>
                {(['長編','短編'] as const).map(t=>(
                  <button key={t} type="button" onClick={()=>setNovelType(t)}
                    style={{flex:1,padding:'12px',borderRadius:10,border:`2px solid ${novelType===t?'var(--color-brand)':'var(--color-brand-border)'}`,cursor:'pointer',textAlign:'center' as const,background:novelType===t?'var(--color-brand-light)':'var(--color-bg-card)'}}>
                    <div style={{fontSize:14,fontWeight:700,color:novelType===t?'var(--color-brand)':'var(--color-text)'}}>{t}</div>
                    <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>{t==='長編'?'複数話にわたる作品':'1話完結の作品'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ジャンル */}
            <div style={fg}>
              <label style={lbl}>ジャンル <span style={{color:'var(--color-danger)'}}>*</span></label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {GENRES.map(g=>(
                  <button key={g} type="button" onClick={()=>setGenre(g)}
                    style={{padding:'5px 14px',borderRadius:16,fontSize:12,border:`1.5px solid ${genre===g?'var(--color-brand)':'var(--color-brand-border)'}`,cursor:'pointer',background:genre===g?'var(--color-brand)':'var(--color-bg-card)',color:genre===g?'#fff':'var(--color-text-muted)'}}>
                    {g}
                  </button>
                ))}
              </div>
              {errors.genre && <div style={er}>{errors.genre}</div>}
            </div>

            {/* タグ */}
            <div style={fg}>
              <label style={lbl}>タグ（最大10個）</label>
              <div style={{display:'flex',gap:6}}>
                <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag()}}}
                  style={{...inp,flex:1}} placeholder="タグを入力してEnter"/>
                <button onClick={addTag} type="button"
                  style={{padding:'8px 14px',border:'1px solid var(--color-brand-border)',borderRadius:8,fontSize:12,color:'var(--color-text-muted)',background:'var(--color-bg-card)',cursor:'pointer',whiteSpace:'nowrap'}}>
                  追加
                </button>
                <button onClick={()=>setShowTagExamples(!showTagExamples)} type="button"
                  style={{padding:'8px 12px',border:'1px solid var(--color-brand-border)',borderRadius:8,fontSize:14,fontWeight:700,color:showTagExamples?'#fff':'var(--color-brand)',background:showTagExamples?'var(--color-brand)':'var(--color-bg-card)',cursor:'pointer'}}>
                  ＋
                </button>
              </div>
              {showTagExamples && (
                <div style={{marginTop:8,background:'var(--color-brand-light)',border:'1px solid var(--color-brand-border)',borderRadius:8,padding:'12px 14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--color-brand)',marginBottom:8}}>タグの例（クリックで追加）</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {TAG_EXAMPLES.map(ex => {
                      const added = tags.includes(ex)
                      return (
                        <button key={ex} type="button" onClick={()=>{ if(!added&&tags.length<10) setTags([...tags,ex]) }}
                          disabled={added||tags.length>=10}
                          style={{padding:'3px 10px',fontSize:11,border:'1.5px solid',borderRadius:12,cursor:added||tags.length>=10?'default':'pointer',borderColor:added?'var(--color-success)':'var(--color-brand-border)',background:added?'#f0fdf4':'var(--color-bg-card)',color:added?'var(--color-success)':'var(--color-text-muted)',opacity:tags.length>=10&&!added?0.4:1}}>
                          {added?'✓ ':''}{ex}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div style={{fontSize:10,color:'var(--color-text-faint)',marginTop:6}}>{tags.length}/10</div>
              {tags.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                  {tags.map(t=>(
                    <span key={t} style={{display:'inline-flex',alignItems:'center',gap:4,background:'var(--color-brand-light)',color:'var(--color-brand)',fontSize:12,padding:'2px 8px',borderRadius:12}}>
                      {t}<button onClick={()=>setTags(tags.filter(x=>x!==t))} style={{border:'none',background:'none',color:'#f5a060',fontSize:14,cursor:'pointer',padding:0,lineHeight:1}}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* コンテスト */}
            {contests.length > 0 && (
              <div style={{...fg,background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'16px'}}>
                <label style={lbl}>コンテストに応募する（任意）</label>
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:10}}>投稿と同時にコンテストに応募できます。複数選択可。</div>
                {selectedContestIds.some(id => contests.find(c=>c.id===id)?.exclusive) && (
                  <div style={{background:'#fffbeb',border:'1px solid #f59e0b',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#92400e'}}>
                    専任コンテストに応募中です。他のコンテストには同時応募できません。
                  </div>
                )}
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {contests.map(c => {
                    const checked = selectedContestIds.includes(c.id)
                    const otherExclusive = selectedContestIds.some(id=>id!==c.id&&contests.find(cc=>cc.id===id)?.exclusive)
                    const disabled = !checked&&(otherExclusive||(c.exclusive&&selectedContestIds.length>0))
                    return (
                      <label key={c.id} style={{display:'flex',alignItems:'flex-start' as const,gap:10,cursor:disabled?'not-allowed':'pointer',padding:'10px 12px',borderRadius:8,border:`1.5px solid ${checked?'var(--color-brand)':'var(--color-brand-border)'}`,background:checked?'var(--color-brand-light)':'var(--color-bg-card)',opacity:disabled?0.5:1}}>
                        <input type="checkbox" checked={checked} disabled={disabled}
                          onChange={e=>{
                            if(e.target.checked){ if(c.exclusive){setSelectedContestIds([c.id])}else{setSelectedContestIds(p=>[...p,c.id])} }
                            else{ setSelectedContestIds(p=>p.filter(id=>id!==c.id)) }
                          }}
                          style={{width:16,height:16,accentColor:'var(--color-brand)',marginTop:2,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--color-text)'}}>{c.title}</div>
                            {c.exclusive&&<span style={{fontSize:10,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',padding:'1px 6px',borderRadius:8,fontWeight:700}}>専任</span>}
                          </div>
                          {c.deadline&&<div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>締切：{new Date(c.deadline).toLocaleDateString('ja-JP')}</div>}
                          {c.exclusive&&!checked&&!disabled&&<div style={{fontSize:10,color:'#dc2626',marginTop:2}}>※ 選ぶと他のコンテストには応募できません</div>}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 年齢制限 */}
            <div style={{...fg,background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'16px'}}>
              <label style={lbl}>年齢制限</label>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:10}}>性的描写・過激な暴力描写・残酷描写が含まれる場合は選択してください。</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[
                  {label:'全年齢',active:!isR18&&!isR15,onClick:()=>{setIsR18(false);setIsR15(false)},color:'var(--color-brand)'},
                  {label:'R15',active:isR15&&!isR18,onClick:()=>{setIsR15(true);setIsR18(false)},color:'#f59e0b'},
                  {label:'R18',active:isR18,onClick:()=>{setIsR18(true);setIsR15(false)},color:'var(--color-danger)'},
                ].map(btn=>(
                  <button key={btn.label} type="button" onClick={btn.onClick}
                    style={{padding:'5px 16px',borderRadius:16,border:`1.5px solid ${btn.active?btn.color:'var(--color-brand-border)'}`,fontSize:12,fontWeight:600,cursor:'pointer',background:btn.active?btn.color:'var(--color-bg-card)',color:btn.active?'#fff':btn.color}}>
                    {btn.label}
                  </button>
                ))}
              </div>
              {isR18&&<div style={{fontSize:11,color:'var(--color-danger)',marginTop:8}}>ログイン済み18歳以上のユーザーにのみ表示されます</div>}
            </div>

            {/* 書籍化 */}
            <div style={{...fg,background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'16px'}}>
              <label style={lbl}>書籍化について</label>
              <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                <input type="checkbox" checked={aimsPublishing} onChange={e=>setAimsPublishing(e.target.checked)}
                  style={{width:18,height:18,accentColor:'var(--color-brand)',cursor:'pointer'}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--color-text)'}}>この作品の書籍化を目指している</div>
                  <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>チェックすると、運営からのサポート情報をお届けしやすくなります</div>
                </div>
              </label>
            </div>

            {errors.submit && (
              <div style={{background:'#fff0f0',border:'1px solid #fca5a5',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--color-danger)',marginBottom:12}}>
                {errors.submit}
              </div>
            )}

            {/* 読まれやすさ警告 */}
            {(() => {
              const warns: string[] = []
              if (summary.trim().length < 200) warns.push(`あらすじが短い（${summary.trim().length}文字 / 推奨200文字以上）`)
              if (catchcopy.trim().length < 30) warns.push(`キャッチコピーが短い（${catchcopy.trim().length}文字 / 推奨30文字以上）`)
              if (tags.length < 8) warns.push(`タグが少ない（${tags.length}個 / 推奨8個以上）`)
              if (warns.length === 0) return null
              return (
                <div style={{background:'#fff1f1',border:'1.5px solid var(--color-danger)',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--color-danger)',marginBottom:8}}>⚠️ このままだと読まれにくい可能性があります</div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {warns.map((w,i) => (
                      <div key={i} style={{fontSize:12,color:'#b91c1c',display:'flex',alignItems:'flex-start',gap:6}}>
                        <span style={{flexShrink:0}}>・</span><span>{w}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:'#9f1239',marginTop:8}}>改善してから投稿すると、より多くの読者に届きます。このまま進むこともできます。</div>
                </div>
              )
            })()}

            <button onClick={handleCreateAndGo} disabled={loading}
              style={{width:'100%',padding:'14px',background:'var(--color-brand)',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:700,cursor:'pointer',opacity:loading?0.6:1}}>
              {loading ? '作成中...' : '作品を作成して執筆へ'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
