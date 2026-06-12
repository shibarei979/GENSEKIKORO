'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const GENRES = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','官能','その他']
const FONT_SIZES = [{label:'小',size:13},{label:'標準',size:15},{label:'大',size:18},{label:'特大',size:22}]

interface Props { profile: any; userId: string }

export default function PostClient({ profile, userId }: Props) {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const editNovelId   = searchParams.get('edit')
  const supabase      = createClient()
  const bodyRef    = useRef<HTMLTextAreaElement>(null)
  const illustRef   = useRef<HTMLInputElement>(null)
  const [illustFile, setIllustFile] = useState<File|null>(null)
  const [illustPreview, setIllustPreview] = useState<string>('')
  const [illustUploading, setIllustUploading] = useState(false)

  const [mode, setMode] = useState<'new'|'existing'>('new')
  const [myNovels, setMyNovels] = useState<any[]>([])
  const [selectedNovelId, setSelectedNovelId] = useState('')
  const [nextEpNum, setNextEpNum] = useState(1)

  const [title,   setTitle]   = useState('')
  const [summary, setSummary] = useState('')
  const [catchcopy, setCatchcopy] = useState('')
  const [genre,   setGenre]   = useState('')
  const [tags,      setTags]      = useState<string[]>([])
  const [tagInput,  setTagInput]  = useState('')
  const [novelType, setNovelType] = useState<'長編'|'短編'>('長編')

  const [epTitle,   setEpTitle]   = useState('')
  const [preface,   setPreface]   = useState('')
  const [body,      setBody]      = useState('')
  const [afterword, setAfterword] = useState('')

  const [fontSize,     setFontSize]     = useState(15)
  const [showReplace,  setShowReplace]  = useState(false)
  const [replaceFrom,  setReplaceFrom]  = useState('')
  const [replaceTo,    setReplaceTo]    = useState('')
  const [replaceCount, setReplaceCount] = useState<number|null>(null)

  const [errors,  setErrors]  = useState<Record<string,string>>({})
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState('')
  const [draftSaved,  setDraftSaved]  = useState(false)
  const [savedNovelId,  setSavedNovelId]  = useState<string>('')
  const [isR18,         setIsR18]         = useState(false)
  const [isR15,         setIsR15]         = useState(false)
  const [editMode,      setEditMode]      = useState(false)
  const [editEpisodes,  setEditEpisodes]  = useState<any[]>([])
  const [editEpId,      setEditEpId]      = useState<string>('')

  useEffect(() => {
    supabase.from('novels').select('id,title,genre').eq('author_id', userId).eq('published', true)
      .then(({ data }) => setMyNovels(data || []))
  }, [userId])

  useEffect(() => {
    if (!editNovelId) return
    setEditMode(true)
    supabase.from('novels').select('*').eq('id', editNovelId).single()
      .then(({ data: novel }) => {
        if (!novel) return
        setTitle(novel.title || '')
        setSummary(novel.summary || '')
        setCatchcopy(novel.catchcopy || '')
        setGenre(novel.genre || '')
        setTags(novel.tags || [])
        setNovelType(novel.novel_type || '長編')
        setIsR18(novel.is_r18 || false)
        setIsR15(novel.is_r15 || false)
        setSavedNovelId(novel.id)
      })
    supabase.from('episodes').select('id,title,ep_number,body,preface,afterword,illust_url')
      .eq('novel_id', editNovelId).order('ep_number', { ascending: true })
      .then(({ data }) => setEditEpisodes(data || []))
  }, [editNovelId])

  useEffect(() => {
    if (!editEpId) return
    const ep = editEpisodes.find(e => e.id === editEpId)
    if (!ep) return
    setEpTitle(ep.title || '')
    setPreface(ep.preface || '')
    setBody(ep.body || '')
    setAfterword(ep.afterword || '')
    setIllustPreview(ep.illust_url || '')
  }, [editEpId, editEpisodes])

  useEffect(() => {
    if (!selectedNovelId) return
    supabase.from('episodes').select('ep_number').eq('novel_id', selectedNovelId)
      .order('ep_number', { ascending: false }).limit(1)
      .then(({ data }) => {
        const last = data?.[0]?.ep_number ?? 0
        setNextEpNum(last + 1)
      })
  }, [selectedNovelId])

  const prefaceLen = preface.length
  const bodyLen    = body.length
  const afterLen   = afterword.length
  const bodyPct    = Math.min(100, (bodyLen / 100000) * 100)
  const bodyColor  = bodyLen < 500 ? '#dc2626' : bodyLen > 90000 ? '#f59e0b' : '#22c55e'

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 10) { setTags([...tags,t]); setTagInput('') }
  }

  function insertText(before: string, after = '') {
    const el = bodyRef.current; if (!el) return
    const s = el.selectionStart, e2 = el.selectionEnd
    const sel = body.substring(s, e2)
    const newVal = body.substring(0,s) + before + sel + after + body.substring(e2)
    setBody(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    }, 0)
  }

  function insertRuby() {
    const el = bodyRef.current; if (!el) return
    const s = el.selectionStart, e2 = el.selectionEnd
    const sel = body.substring(s, e2)
    if (sel) {
      const newVal = body.substring(0,s) + '｜' + sel + '《》' + body.substring(e2)
      setBody(newVal)
      const rubyPos = s + 1 + sel.length + 1
      setTimeout(() => { el.focus(); el.setSelectionRange(rubyPos, rubyPos) }, 0)
    } else {
      const newVal = body.substring(0,s) + '｜《》' + body.substring(e2)
      setBody(newVal)
      setTimeout(() => { el.focus(); el.setSelectionRange(s+1, s+1) }, 0)
    }
  }

  async function handleIllustUpload(file: File) {
    setIllustUploading(true)
    const ext = file.name.split('.').pop()
    const path = `illustrations/${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('illustrations').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('illustrations').getPublicUrl(path)
      setIllustPreview(data.publicUrl)
      setIllustFile(file)
    }
    setIllustUploading(false)
  }

  function indentNonDialogue() {
    const lines = body.split('\n')
    const result = lines.map(line => {
      const trimmed = line.trimStart()
      if (trimmed === '') return line
      if (line.startsWith('\u3000')) return line
      if (trimmed.startsWith('\u300c') || trimmed.startsWith('\u300e') || trimmed.startsWith('\u3010')) return line
      return '\u3000' + line
    })
    setBody(result.join('\n'))
  }

  function handleReplace() {
    if (!replaceFrom) return
    const count = body.split(replaceFrom).length - 1
    setBody(body.replaceAll(replaceFrom, replaceTo))
    setReplaceCount(count)
    setTimeout(() => setReplaceCount(null), 2500)
  }

  function validate(publish: boolean) {
    const errs: Record<string,string> = {}
    if (mode === 'new') {
      if (!title.trim()) errs.title = 'タイトルを入力してください'
      if (!genre) errs.genre = 'ジャンルを選択してください'
    } else {
      if (!selectedNovelId) errs.novel = '作品を選択してください'
    }
    if (!epTitle.trim()) errs.ep = 'タイトルを入力してください'
    if (prefaceLen > 20000) errs.preface = '前書きは20,000文字以内にしてください'
    if (afterLen > 20000)   errs.afterword = 'あとがきは20,000文字以内にしてください'
    if (bodyLen > 100000)   errs.body = '本文は100,000文字以内にしてください'
    if (publish && bodyLen < 500) errs.body = `公開には本文500文字以上必要です（現在${bodyLen}文字）`
    return errs
  }

  async function handleSubmit(publish: boolean) {
    const errs = validate(publish)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setLoading(true)

    try {
      let novelId = savedNovelId || selectedNovelId

      if (mode === 'new' && !savedNovelId) {
        const { data: novel, error: nErr } = await supabase.from('novels').insert({
          author_id: userId, title: title.trim(),
          summary: summary.trim() || null, genre, tags,
          is_serial: true, published: publish,
          novel_type: novelType,
          is_r18: isR18, is_r15: isR15,
          catchcopy: catchcopy.trim() || null,
        }).select().single()
        if (nErr) throw nErr
        novelId = novel.id
        setSavedNovelId(novel.id)
      } else if (mode === 'new' && savedNovelId && publish) {
        await supabase.from('novels').update({ published: true }).eq('id', savedNovelId)
      }

      let epErr
      if (editMode && editEpId) {
        await supabase.from('novels').update({
          title: title.trim(), summary: summary.trim()||null, genre, tags,
          is_r18: isR18, is_r15: isR15,
          catchcopy: catchcopy.trim() || null,
        }).eq('id', savedNovelId)
        const res = await supabase.from('episodes')
          .update({ title: epTitle.trim(), body, preface: preface.trim()||null, afterword: afterword.trim()||null, illust_url: illustPreview||null })
          .eq('id', editEpId)
        epErr = res.error
      } else if (draftSaved && savedNovelId) {
        const res = await supabase.from('episodes')
          .update({ title: epTitle.trim(), body, preface: preface.trim()||null, afterword: afterword.trim()||null, illust_url: illustPreview||null })
          .eq('novel_id', savedNovelId).eq('ep_number', mode==='new'?1:nextEpNum)
        epErr = res.error
      } else {
        if (novelId) {
          await supabase.from('novels').update({ is_r18: isR18, is_r15: isR15 }).eq('id', novelId)
        }
        const res = await supabase.from('episodes').insert({
          novel_id:   novelId,
          title:      epTitle.trim(),
          body,
          preface:    preface.trim() || null,
          afterword:  afterword.trim() || null,
          ep_number:  mode === 'new' ? 1 : nextEpNum,
          illust_url: illustPreview || null,
        })
        epErr = res.error
      }
      if (epErr) throw epErr

      if (publish) {
        fetch('/api/originality', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novel_id: novelId }),
        }).catch(() => {})

        setToast(editMode ? '変更を保存しました！反映まで1分前後かかります' : '投稿しました！反映まで1分前後かかります')

        if (!editMode && novelId) {
          fetch('/api/notify-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novel_id: novelId, ep_title: epTitle.trim() }),
          }).catch(() => {})
        }

        setTimeout(() => router.push(`/novel/${novelId}`), 1500)
      } else {
        setDraftSaved(true)
        setToast('連載中（下書き）として保存しました')
        setLoading(false)
        setTimeout(() => setToast(''), 3000)
      }
    } catch (e: any) {
      setErrors({ submit: '保存に失敗しました: ' + e.message })
      setLoading(false)
    }
  }

  const inp = {width:'100%',padding:'8px 10px',border:'1.5px solid #F0D9C9',borderRadius:6,fontSize:13,background:'#fff',color:'#2B211B',outline:'none',boxSizing:'border-box'} as const
  const sec = {background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,marginBottom:12,overflow:'hidden'} as const
  const sh  = {padding:'10px 14px',fontSize:13,fontWeight:700,color:'#2B211B',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'} as const
  const sb  = {padding:16} as const
  const lbl = {fontSize:12,fontWeight:500,color:'#77706A',display:'block',marginBottom:4} as const
  const fg  = {marginBottom:14} as const
  const er  = {fontSize:11,color:'#dc2626',marginTop:3} as const
  const toolBtn = {padding:'3px 9px',fontSize:11,border:'1px solid #F0D9C9',borderRadius:4,background:'#fff',color:'#77706A',cursor:'pointer'} as const

  return (
    <div style={{minHeight:'100vh',background:'#fff'}}>
      <Header profile={profile} user={true} />

      <div style={{maxWidth:760,margin:'0 auto',padding:'24px 24px 60px'}}>

        {editMode && (
          <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,marginBottom:12,overflow:'hidden'}}>
            <div style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#2B211B',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
              編集する話を選択
            </div>
            <div style={{padding:'14px 18px'}}>
              <div style={{fontSize:12,color:'#77706A',marginBottom:10}}>編集したい話を選んでください</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {editEpisodes.map(ep => (
                  <button key={ep.id} type="button" onClick={()=>setEditEpId(ep.id)}
                    style={{padding:'10px 14px',borderRadius:8,textAlign:'left',cursor:'pointer',
                      border:`1.5px solid ${editEpId===ep.id?'#F26A21':'#F0D9C9'}`,
                      background:editEpId===ep.id?'#FFF1E6':'#fff',
                      fontSize:13,fontWeight:editEpId===ep.id?700:400,color:'#2B211B'}}>
                    {ep.title}
                  </button>
                ))}
                {editEpisodes.length === 0 && (
                  <div style={{fontSize:12,color:'#B8AEA8'}}>話がありません</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!editMode && (<div style={sec}>
          <div style={sh}>投稿タイプ</div>
          <div style={sb}>
            <div style={{display:'flex',gap:12}}>
              {[{v:'new' as const,l:'新連載',d:'新しい作品の第1話を投稿する'},
                {v:'existing' as const,l:'連載中の作品に追加',d:'既存の連載作品に新しい話を追加する'}].map(({v,l,d})=>(
                <button key={v} type="button" onClick={()=>setMode(v)}
                  style={{flex:1,padding:'14px',borderRadius:10,border:'2px solid',cursor:'pointer',textAlign:'left',
                    background:mode===v?'#FFF1E6':'#fff',
                    borderColor:mode===v?'#F26A21':'#F0D9C9'}}>
                  <div style={{fontSize:14,fontWeight:700,color:mode===v?'#F26A21':'#2B211B',marginBottom:4}}>{l}</div>
                  <div style={{fontSize:11,color:'#77706A'}}>{d}</div>
                </button>
              ))}
            </div>
          </div>
        </div>)}

        {(mode === 'new' || editMode) && (
          <div style={sec}>
            <div style={sh}>作品情報</div>
            <div style={sb}>
              <div style={fg}>
                <label style={lbl}>作品タイトル <span style={{color:'#dc2626'}}>*</span></label>
                <input style={{...inp,borderColor:errors.title?'#dc2626':'#F0D9C9'}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="作品タイトル（必須）"/>
                {errors.title && <div style={er}>{errors.title}</div>}
              </div>
              <div style={fg}>
                <label style={lbl}>あらすじ</label>
                <textarea style={{...inp,resize:'vertical',minHeight:80}} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="作品のあらすじ（省略可）"/>
              </div>
              <div style={fg}>
                <label style={lbl}>
                  キャッチコピー
                  <span style={{fontWeight:400,color:'#B8AEA8',fontSize:11,marginLeft:6}}>作品カードに表示されます（省略可・100文字以内）</span>
                </label>
                <textarea style={{...inp,resize:'vertical',minHeight:60}} value={catchcopy}
                  onChange={e=>setCatchcopy(e.target.value.slice(0,100))}
                  placeholder="例：「私は絶対に、あなたを守ってみせる」"/>
                <div style={{fontSize:10,color:'#B8AEA8',textAlign:'right',marginTop:2}}>{catchcopy.length}/100</div>
              </div>
              <div style={fg}>
                <label style={lbl}>作品の長さ <span style={{color:'#dc2626'}}>*</span></label>
                <div style={{display:'flex',gap:10}}>
                  {(['長編','短編'] as const).map(t=>(
                    <button key={t} type="button" onClick={()=>setNovelType(t)}
                      style={{flex:1,padding:'10px',borderRadius:10,border:'2px solid',cursor:'pointer',textAlign:'center' as const,
                        background:novelType===t?'#FFF1E6':'#fff',
                        borderColor:novelType===t?'#F26A21':'#F0D9C9'}}>
                      <div style={{fontSize:14,fontWeight:700,color:novelType===t?'#F26A21':'#2B211B'}}>{t}</div>
                      <div style={{fontSize:11,color:'#77706A',marginTop:2}}>{t==='長編'?'複数話にわたる作品':'1話完結の作品'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={fg}>
                <label style={lbl}>ジャンル <span style={{color:'#dc2626'}}>*</span></label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                  {GENRES.map(g=>(
                    <button key={g} type="button" onClick={()=>setGenre(g)}
                      style={{padding:'4px 12px',borderRadius:16,fontSize:12,border:'1.5px solid',cursor:'pointer',
                        background:genre===g?'#F26A21':'#fff',color:genre===g?'#fff':'#77706A',
                        borderColor:genre===g?'#F26A21':'#F0D9C9'}}>
                      {g}
                    </button>
                  ))}
                </div>
                {errors.genre && <div style={er}>{errors.genre}</div>}
              </div>
              <div>
                <label style={lbl}>タグ（最大10個）</label>
                <div style={{display:'flex',gap:6}}>
                  <input style={{...inp,flex:1}} value={tagInput} onChange={e=>setTagInput(e.target.value)}
                    placeholder="タグを入力してEnter"
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag()}}}/>
                  <button onClick={addTag} type="button"
                    style={{padding:'8px 14px',border:'1px solid #F0D9C9',borderRadius:6,fontSize:12,color:'#77706A',background:'#fff',cursor:'pointer',whiteSpace:'nowrap'}}>
                    追加
                  </button>
                </div>
                <div style={{fontSize:10,color:'#B8AEA8',marginTop:2}}>{tags.length}/10</div>
                {tags.length > 0 && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                    {tags.map(t=>(
                      <span key={t} style={{display:'inline-flex',alignItems:'center',gap:4,background:'#FFF1E6',color:'#F26A21',fontSize:12,padding:'2px 8px',borderRadius:12}}>
                        {t}<button onClick={()=>setTags(tags.filter(x=>x!==t))} style={{border:'none',background:'none',color:'#f5a060',fontSize:14,cursor:'pointer',padding:0,lineHeight:1}}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === 'existing' && (
          <div style={sec}>
            <div style={sh}>作品を選択</div>
            <div style={sb}>
              {myNovels.length === 0 ? (
                <div style={{textAlign:'center',padding:'20px',color:'#B8AEA8',fontSize:13}}>
                  公開中の連載作品がありません
                </div>
              ) : (
                <>
                  <label style={lbl}>連載中の作品 <span style={{color:'#dc2626'}}>*</span></label>
                  <select value={selectedNovelId} onChange={e=>setSelectedNovelId(e.target.value)}
                    style={{...inp,cursor:'pointer',borderColor:errors.novel?'#dc2626':'#F0D9C9'}}>
                    <option value="">作品を選択してください</option>
                    {myNovels.map(n=>(
                      <option key={n.id} value={n.id}>{n.title}（{n.genre}）</option>
                    ))}
                  </select>
                  {errors.novel && <div style={er}>{errors.novel}</div>}
                </>
              )}
            </div>
          </div>
        )}

        <div style={sec}>
          <div style={sh}>年齢制限</div>
          <div style={{padding:'14px 18px'}}>
            <div style={{fontSize:12,color:'#77706A',marginBottom:10}}>性的描写・過激な暴力描写・残酷描写が含まれる場合は選択してください。</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[
                {label:'全年齢', active:!isR18&&!isR15, onClick:()=>{setIsR18(false);setIsR15(false)}, color:'#F26A21'},
                {label:'R15', active:isR15&&!isR18, onClick:()=>{setIsR15(true);setIsR18(false)}, color:'#f59e0b'},
                {label:'R18', active:isR18, onClick:()=>{setIsR18(true);setIsR15(false)}, color:'#dc2626'},
              ].map(btn=>(
                <button key={btn.label} type="button" onClick={btn.onClick}
                  style={{padding:'5px 16px',borderRadius:16,border:`1.5px solid ${btn.active?btn.color:'#F0D9C9'}`,
                    fontSize:12,fontWeight:600,cursor:'pointer',
                    background:btn.active?btn.color:'#fff',
                    color:btn.active?'#fff':btn.color}}>
                  {btn.label}
                </button>
              ))}
            </div>
            {isR18 && <div style={{fontSize:11,color:'#dc2626',marginTop:8}}>⚠ ログイン済み18歳以上のユーザーにのみ表示されます</div>}
          </div>
        </div>

        {(!editMode || editEpId) && (<div style={sec}>
          <div style={sh}>話の内容</div>
          <div style={sb}>
            <div style={fg}>
              <label style={lbl}>
                タイトル <span style={{color:'#dc2626'}}>*</span>
                <span style={{fontWeight:400,color:'#B8AEA8',fontSize:11,marginLeft:6}}>例：第1話 始まりの朝</span>
              </label>
              <input style={{...inp,borderColor:errors.ep?'#dc2626':'#F0D9C9'}} value={epTitle} onChange={e=>setEpTitle(e.target.value)} placeholder="例：第1話 始まりの朝"/>
              {errors.ep && <div style={er}>{errors.ep}</div>}
            </div>

            <div style={fg}>
              <label style={lbl}>前書き<span style={{fontWeight:400,color:'#B8AEA8',fontSize:11,marginLeft:6}}>{prefaceLen.toLocaleString()} / 20,000文字</span></label>
              <textarea style={{...inp,resize:'vertical',minHeight:60,borderColor:errors.preface?'#dc2626':'#F0D9C9'}}
                value={preface} onChange={e=>setPreface(e.target.value)} placeholder="前書き（省略可）"/>
              {errors.preface && <div style={er}>{errors.preface}</div>}
            </div>

            <div style={fg}>
              <label style={lbl}>挿絵（本文の上に表示）</label>
              <div style={{border:'2px dashed #F0D9C9',borderRadius:10,padding:'16px',textAlign:'center',background:'#FFF9F2',cursor:'pointer',position:'relative'}}
                onClick={()=>illustRef.current?.click()}
                onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='#F26A21'}}
                onDragLeave={e=>{e.currentTarget.style.borderColor='#F0D9C9'}}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/')){handleIllustUpload(f);e.currentTarget.style.borderColor='#F0D9C9'}}}>
                <input ref={illustRef} type="file" accept="image/*" style={{display:'none'}}
                  onChange={e=>{const f=e.target.files?.[0];if(f)handleIllustUpload(f)}}/>
                {illustPreview ? (
                  <div>
                    <img src={illustPreview} alt="挿絵プレビュー" style={{maxWidth:'100%',maxHeight:300,borderRadius:8,objectFit:'contain'}}/>
                    <div style={{marginTop:8,display:'flex',gap:8,justifyContent:'center'}}>
                      <button type="button" onClick={e=>{e.stopPropagation();setIllustPreview('');setIllustFile(null)}}
                        style={{padding:'4px 12px',fontSize:11,border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',cursor:'pointer'}}>
                        削除
                      </button>
                      <button type="button" onClick={e=>{e.stopPropagation();illustRef.current?.click()}}
                        style={{padding:'4px 12px',fontSize:11,border:'1px solid #F26A21',borderRadius:8,background:'#fff',color:'#F26A21',cursor:'pointer'}}>
                        変更
                      </button>
                    </div>
                  </div>
                ) : illustUploading ? (
                  <div style={{color:'#F26A21',fontSize:13}}>アップロード中...</div>
                ) : (
                  <div>
                    <div style={{fontSize:32,marginBottom:8}}></div>
                    <div style={{fontSize:13,color:'#77706A',marginBottom:4}}>クリックまたはドラッグ＆ドロップで画像を追加</div>
                    <div style={{fontSize:11,color:'#B8AEA8'}}>JPG・PNG・GIF・WEBP対応</div>
                  </div>
                )}
              </div>
            </div>

            <div style={fg}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                <label style={{...lbl,marginBottom:0}}>
                  本文 <span style={{color:'#dc2626'}}>*</span>
                  <span style={{fontWeight:400,color:'#B8AEA8',fontSize:11,marginLeft:6}}>（公開時は500文字以上）</span>
                </label>
                <div style={{display:'flex',gap:3,alignItems:'center'}}>
                  <span style={{fontSize:11,color:'#77706A',marginRight:3}}>文字サイズ：</span>
                  {FONT_SIZES.map(f=>(
                    <button key={f.label} type="button" onClick={()=>setFontSize(f.size)}
                      style={{padding:'2px 7px',fontSize:11,border:'1px solid',cursor:'pointer',borderRadius:4,
                        background:fontSize===f.size?'#F26A21':'#fff',
                        color:fontSize===f.size?'#fff':'#77706A',
                        borderColor:fontSize===f.size?'#F26A21':'#F0D9C9'}}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:5,padding:5,background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:6}}>
                <button type="button" onClick={insertRuby} style={toolBtn}>ルビ　｜漢字《かんじ》</button>
                <button type="button" onClick={()=>insertText('《《','》》')} style={toolBtn}>《《強調》》</button>
                <button type="button" onClick={()=>insertText('\n────────────\n')} style={toolBtn}>─ 区切り線</button>
                <button type="button" onClick={indentNonDialogue} style={toolBtn} title="「」以外の行頭に全角スペースを追加">一文字下げ（「」以外）</button>
                <button type="button" onClick={()=>insertText('\n\n')} style={toolBtn}>改行</button>
                <div style={{width:1,background:'#F0D9C9',margin:'0 2px'}}/>
                <button type="button" onClick={()=>setShowReplace(!showReplace)}
                  style={{...toolBtn,background:showReplace?'#F26A21':'#fff',color:showReplace?'#fff':'#77706A',borderColor:showReplace?'#F26A21':'#F0D9C9'}}>
                  一括置換
                </button>
              </div>

              {showReplace && (
                <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:6,padding:'10px 12px',marginBottom:6,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <input value={replaceFrom} onChange={e=>setReplaceFrom(e.target.value)} placeholder="置換前のテキスト"
                    style={{...inp,flex:1,minWidth:120,fontSize:12}}/>
                  <span style={{color:'#77706A'}}>→</span>
                  <input value={replaceTo} onChange={e=>setReplaceTo(e.target.value)} placeholder="置換後のテキスト"
                    style={{...inp,flex:1,minWidth:120,fontSize:12}}/>
                  <button type="button" onClick={handleReplace}
                    style={{padding:'7px 14px',background:'#F26A21',color:'#fff',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                    置換する
                  </button>
                  {replaceCount !== null && (
                    <span style={{fontSize:11,color:'#2e7d32',fontWeight:600}}>{replaceCount}箇所を置換しました</span>
                  )}
                </div>
              )}

              <textarea ref={bodyRef}
                style={{...inp,resize:'vertical',minHeight:400,fontSize,lineHeight:1.95,
                  fontFamily:"'Noto Serif JP',serif",borderColor:errors.body?'#dc2626':'#F0D9C9'}}
                value={body} onChange={e=>setBody(e.target.value)}
                placeholder="本文を入力してください"/>

              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                <div style={{flex:1,height:4,background:'#F0D9C9',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:2,background:bodyColor,width:`${bodyPct}%`,transition:'width .2s'}}/>
                </div>
                <span style={{fontSize:11,color:bodyColor,fontWeight:600,whiteSpace:'nowrap'}}>{bodyLen.toLocaleString()} / 100,000文字</span>
              </div>
              {errors.body && <div style={er}>{errors.body}</div>}
            </div>

            <div>
              <label style={lbl}>あとがき<span style={{fontWeight:400,color:'#B8AEA8',fontSize:11,marginLeft:6}}>{afterLen.toLocaleString()} / 20,000文字</span></label>
              <textarea style={{...inp,resize:'vertical',minHeight:60,borderColor:errors.afterword?'#dc2626':'#F0D9C9'}}
                value={afterword} onChange={e=>setAfterword(e.target.value)} placeholder="あとがき（省略可）"/>
              {errors.afterword && <div style={er}>{errors.afterword}</div>}
            </div>
          </div>
        </div>)}

        {errors.submit && (
          <div style={{background:'#fff0f0',border:'1px solid #f5c0c0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626',marginBottom:12}}>
            {errors.submit}
          </div>
        )}

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <Link href="/mypage" style={{border:'1px solid #F0D9C9',color:'#77706A',padding:'9px 20px',borderRadius:20,fontSize:13,background:'#fff'}}>キャンセル</Link>
          <button onClick={()=>handleSubmit(false)} disabled={loading||draftSaved}
            style={{border:'1.5px solid #F26A21',color:draftSaved?'#2e7d32':'#F26A21',padding:'9px 20px',borderRadius:20,fontSize:13,background:draftSaved?'#e8f5e9':'#fff',cursor:draftSaved?'default':'pointer',opacity:loading?.5:1,transition:'all .3s'}}>
            {draftSaved?'✓ 保存しました':'下書き保存'}
          </button>
          <button onClick={()=>handleSubmit(true)} disabled={loading}
            style={{background:'#F26A21',color:'#fff',padding:'10px 24px',borderRadius:20,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',opacity:loading?.5:1}}>
            {loading?'保存中...':(editMode?'変更を保存':'投稿する')}
          </button>
        </div>
      </div>

      <Footer user={true} />

      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,background:'#F26A21',color:'#fff',padding:'12px 20px',borderRadius:12,fontSize:14,fontWeight:600,zIndex:9999,boxShadow:'0 4px 16px rgba(242,106,33,.35)'}}>
          {toast}
        </div>
      )}
    </div>
  )
}
