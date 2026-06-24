'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const GENRES = ['異世界','ファンタジー','SF','恋愛','学園','ミステリー','ホラー','歴史・時代','日常','アクション','コメディ','官能','その他']
const FONT_SIZES = [{label:'小',size:13},{label:'標準',size:15},{label:'大',size:18},{label:'特大',size:22}]

// （S2用定数は削除：ヒントはインラインで表示）

interface Props { profile: any; userId: string }

function detectAiMarkers(text: string): string[] {
  const patterns: string[] = []
  const boldMatches = text.match(/\*\*[^*]+\*\*/g) || []
  if (boldMatches.length > 0) patterns.push(`**太字**パターン ${boldMatches.length}箇所（例：${(boldMatches[0] ?? '').slice(0,30)}）`)
  const headingMatches = text.match(/^#{1,3}\s+.+/gm) || []
  if (headingMatches.length > 0) patterns.push(`Markdown見出しパターン ${headingMatches.length}箇所`)
  const lines = text.split('\n')
  let listCount = 0, maxList = 0
  for (const line of lines) {
    if (/^[-*]\s+/.test(line)) { listCount++; maxList = Math.max(maxList, listCount) } else listCount = 0
  }
  if (maxList >= 3) patterns.push(`Markdownリストパターン（連続${maxList}行）`)
  return patterns
}

function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
  const [isMobile, setIsMobile] = useState(false)
  // S2: キャッチコピーのヒント表示
  const [showCatchcopyHint, setShowCatchcopyHint] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  const [useSchedule,    setUseSchedule]    = useState(false)
  const [scheduleValue,  setScheduleValue]  = useState(defaultScheduleValue())
  const [scheduledAtSaved, setScheduledAtSaved] = useState<string | null>(null)

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

  const aiMarkers = detectAiMarkers(body)
  const hasAiMarkers = aiMarkers.length > 0

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
    supabase.from('episodes').select('id,title,ep_number,body,preface,afterword,illust_url,scheduled_at,published')
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
    if (ep.scheduled_at && ep.published === false) {
      setUseSchedule(true)
      const d = new Date(ep.scheduled_at)
      const pad = (n: number) => String(n).padStart(2, '0')
      setScheduleValue(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
      setScheduledAtSaved(ep.scheduled_at)
    } else {
      setUseSchedule(false)
      setScheduledAtSaved(null)
    }
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
  const bodyColor  = bodyLen < 500 ? 'var(--color-danger)' : bodyLen > 90000 ? '#f59e0b' : '#22c55e'

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
    if (publish && useSchedule) {
      if (!scheduleValue) {
        errs.schedule = '公開日時を指定してください'
      } else {
        const scheduledDate = new Date(scheduleValue)
        if (scheduledDate.getTime() <= Date.now()) {
          errs.schedule = '未来の日時を指定してください'
        }
      }
    }
    return errs
  }

  async function handleSubmit(publish: boolean) {
    const errs = validate(publish)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setLoading(true)

    const isScheduled = publish && useSchedule
    const scheduledIso = isScheduled ? new Date(scheduleValue).toISOString() : null

    try {
      let novelId = savedNovelId || selectedNovelId
      let novelTitle = title.trim()

      if (mode === 'new' && !savedNovelId) {
        const { data: novel, error: nErr } = await supabase.from('novels').insert({
          author_id: userId, title: title.trim(),
          summary: summary.trim() || null, genre, tags,
          is_serial: true, published: publish && !isScheduled,
          novel_type: novelType,
          is_r18: isR18, is_r15: isR15,
          catchcopy: catchcopy.trim() || null,
        }).select().single()
        if (nErr) throw nErr
        novelId = novel.id
        novelTitle = novel.title
        setSavedNovelId(novel.id)
      } else if (mode === 'new' && savedNovelId && publish && !isScheduled) {
        await supabase.from('novels').update({ published: true }).eq('id', savedNovelId)
      } else if (mode === 'existing' && selectedNovelId) {
        const found = myNovels.find(n => n.id === selectedNovelId)
        if (found) novelTitle = found.title
      }

      let epErr
      let episodeId = ''

      const epPublished = publish && !isScheduled
      const epScheduledAt = scheduledIso

      if (editMode && editEpId) {
        await supabase.from('novels').update({
          title: title.trim(), summary: summary.trim()||null, genre, tags,
          is_r18: isR18, is_r15: isR15,
          catchcopy: catchcopy.trim() || null,
        }).eq('id', savedNovelId)
        const res = await supabase.from('episodes')
          .update({
            title: epTitle.trim(), body, preface: preface.trim()||null, afterword: afterword.trim()||null,
            illust_url: illustPreview||null,
            ...(publish ? { published: epPublished, scheduled_at: epScheduledAt } : {}),
          })
          .eq('id', editEpId).select('id').single()
        epErr = res.error
        episodeId = editEpId
      } else if (draftSaved && savedNovelId) {
        const res = await supabase.from('episodes')
          .update({
            title: epTitle.trim(), body, preface: preface.trim()||null, afterword: afterword.trim()||null,
            illust_url: illustPreview||null,
            ...(publish ? { published: epPublished, scheduled_at: epScheduledAt } : {}),
          })
          .eq('novel_id', savedNovelId).eq('ep_number', mode==='new'?1:nextEpNum)
          .select('id').single()
        epErr = res.error
        episodeId = res.data?.id || ''
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
          published:  publish ? epPublished : false,
          scheduled_at: publish ? epScheduledAt : null,
        }).select('id').single()
        epErr = res.error
        episodeId = res.data?.id || ''
      }
      if (epErr) throw epErr

      if (publish && !isScheduled && hasAiMarkers && novelId && episodeId) {
        void supabase.from('ai_reviews').insert({
          novel_id:     novelId,
          episode_id:   episodeId,
          user_id:      userId,
          episode_title: epTitle.trim(),
          novel_title:   novelTitle,
          author_name:   profile?.display_name || '不明',
          reason:        aiMarkers.join(' / '),
          status:        'pending',
        })
      }

      if (isScheduled) {
        const d = new Date(scheduleValue)
        const fmt = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
        setToast(`予約投稿を設定しました（${fmt}に公開されます）`)
        setTimeout(() => router.push('/mypage'), 1800)
      } else if (publish) {
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
        setToast('下書き保存しました！反映まで1分前後かかります')
        setLoading(false)
        setTimeout(() => router.push('/mypage'), 1500)
      }
    } catch (e: any) {
      setErrors({ submit: '保存に失敗しました: ' + e.message })
      setLoading(false)
    }
  }

  const inp = {width:'100%',padding:'8px 10px',border:'1.5px solid var(--color-brand-border)',borderRadius:6,fontSize:13,background:'var(--color-bg-card)',color:'var(--color-text)',outline:'none',boxSizing:'border-box'} as const
  const sec = {background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,marginBottom:12,overflow:'hidden'} as const
  const sh  = {padding:'10px 14px',fontSize:13,fontWeight:700,color:'var(--color-text)',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'} as const
  const sb  = {padding:16} as const
  const lbl = {fontSize:12,fontWeight:500,color:'var(--color-text-muted)',display:'block',marginBottom:4} as const
  const fg  = {marginBottom:14} as const
  const er  = {fontSize:11,color:'var(--color-danger)',marginTop:3} as const
  const toolBtn = {padding:'3px 9px',fontSize:11,border:'1px solid var(--color-brand-border)',borderRadius:4,background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'} as const

  const submitButtonLabel = loading
    ? '保存中...'
    : useSchedule
      ? '予約投稿する'
      : (editMode ? '変更を保存' : '投稿する')

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg-card)'}}>
      <Header profile={profile} user={true} />

      <div style={{maxWidth:760,margin:'0 auto',padding: isMobile ? '16px 16px 80px' : '24px 24px 60px'}}>

        {/* 編集：話選択 */}
        {editMode && (
          <div style={sec}>
            <div style={sh}>編集する話を選択</div>
            <div style={{padding:'14px 18px'}}>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:10}}>編集したい話を選んでください</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {editEpisodes.map(ep => (
                  <button key={ep.id} type="button" onClick={()=>setEditEpId(ep.id)}
                    style={{padding:'10px 14px',borderRadius:8,textAlign:'left',cursor:'pointer',
                      border:`1.5px solid ${editEpId===ep.id?'var(--color-brand)':'var(--color-brand-border)'}`,
                      background:editEpId===ep.id?'var(--color-brand-light)':'var(--color-bg-card)',
                      fontSize:13,fontWeight:editEpId===ep.id?700:400,color:'var(--color-text)',
                      display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                    <span>{ep.title}</span>
                    {ep.scheduled_at && ep.published === false && (
                      <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'2px 8px',borderRadius:10,whiteSpace:'nowrap'}}>
                        予約投稿中
                      </span>
                    )}
                  </button>
                ))}
                {editEpisodes.length === 0 && <div style={{fontSize:12,color:'var(--color-text-faint)'}}>話がありません</div>}
              </div>
            </div>
          </div>
        )}

        {/* 投稿タイプ */}
        {!editMode && (
          <div style={sec}>
            <div style={sh}>投稿タイプ</div>
            <div style={sb}>
              <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:12}}>
                {[{v:'new' as const,l:'新連載',d:'新しい作品の第1話を投稿する'},
                  {v:'existing' as const,l:'連載中の作品に追加',d:'既存の連載作品に新しい話を追加する'}].map(({v,l,d})=>(
                  <button key={v} type="button" onClick={()=>setMode(v)}
                    style={{flex:1,padding:'14px',borderRadius:10,border:'2px solid',cursor:'pointer',textAlign:'left',
                      background:mode===v?'var(--color-brand-light)':'var(--color-bg-card)',
                      borderColor:mode===v?'var(--color-brand)':'var(--color-brand-border)'}}>
                    <div style={{fontSize:14,fontWeight:700,color:mode===v?'var(--color-brand)':'var(--color-text)',marginBottom:4}}>{l}</div>
                    <div style={{fontSize:11,color:'var(--color-text-muted)'}}>{d}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 作品情報 */}
        {(mode === 'new' || editMode) && (
          <div style={sec}>
            <div style={sh}>作品情報</div>
            <div style={sb}>
              <div style={fg}>
                <label style={lbl}>作品タイトル <span style={{color:'var(--color-danger)'}}>*</span></label>
                <input style={{...inp,borderColor:errors.title?'var(--color-danger)':'var(--color-brand-border)'}} value={title} onChange={e=>setTitle(e.target.value)} placeholder="作品タイトル（必須）"/>
                {errors.title && <div style={er}>{errors.title}</div>}
              </div>
              <div style={fg}>
                <label style={lbl}>あらすじ</label>
                <textarea style={{...inp,resize:'vertical',minHeight:80}} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="作品のあらすじ（省略可）"/>
              </div>

              {/* ===== S2: キャッチコピー欄 with ？ヒント ===== */}
              <div style={fg}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                  <label style={{...lbl,marginBottom:0}}>キャッチコピー</label>
                  <span style={{fontWeight:400,color:'var(--color-text-faint)',fontSize:11}}>作品カードに表示（省略可・100文字以内）</span>
                  <button
                    type="button"
                    onClick={()=>setShowCatchcopyHint(!showCatchcopyHint)}
                    title="キャッチコピーの例を見る"
                    style={{
                      width:18, height:18, borderRadius:'50%',
                      border:'1.5px solid var(--color-brand-border)',
                      background: showCatchcopyHint ? 'var(--color-brand)' : 'var(--color-bg-card)',
                      color: showCatchcopyHint ? 'var(--color-bg-card)' : 'var(--color-text-muted)',
                      fontSize:11, fontWeight:700, cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0, lineHeight:1, padding:0,
                    }}>
                    ？
                  </button>
                </div>

                {/* S2: キャッチコピー位置確認モーダル（実際のポップアップと同じ表示） */}
                {showCatchcopyHint && mounted && createPortal(
                  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:isMobile?'16px':20}}
                    onClick={()=>setShowCatchcopyHint(false)}>
                    <div onClick={e=>e.stopPropagation()} style={{
                      background:'var(--color-bg-card)',
                      border:'2px solid var(--color-brand)',
                      borderRadius:16,
                      boxShadow:'0 8px 24px rgba(0,0,0,0.15)',
                      overflow:'hidden',
                      width: isMobile ? 320 : 500,
                      maxWidth:'95vw',
                      maxHeight: isMobile ? '85vh' : '90vh',
                      display:'flex', flexDirection:'column',
                      animation:'modalIn .2s ease',
                    }}>
                      {/* ヘッダー */}
                      <div style={{background:'var(--color-brand-light)',padding:'10px 14px',borderBottom:'1px solid var(--color-brand-border)',position:'relative',flexShrink:0}}>
                        <button onClick={()=>setShowCatchcopyHint(false)}
                          style={{position:'absolute',top:8,right:10,background:'none',border:'none',fontSize:18,color:'var(--color-text-faint)',cursor:'pointer'}}>×</button>
                        <div style={{display:'flex',gap:5,marginBottom:3,flexWrap:'wrap'}}>
                          <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'1px 6px',borderRadius:3}}>{genre||'ジャンル'}</span>
                          <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 6px',borderRadius:3}}>{novelType}</span>
                        </div>
                        <div style={{fontSize:isMobile?13:15,fontWeight:700,color:'var(--color-text)',lineHeight:1.4,fontFamily:"'Noto Serif JP',serif",paddingRight:20}}>{title||'作品タイトル'}</div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:3}}>
                          <span style={{fontSize:11,color:'var(--color-text-muted)'}}>作者：{profile?.display_name||'作者名'}</span>
                        </div>
                        {tags.length > 0 && (
                          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
                            {tags.slice(0,5).map((t:string)=>(
                              <span key={t} style={{fontSize:9,background:'var(--color-bg)',color:'var(--color-text-muted)',border:'1px solid var(--color-brand-border)',padding:'1px 5px',borderRadius:3}}>#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 本文エリア */}
                      <div style={{flex:1,overflowY:'auto',minHeight:0,padding:'12px 0',background:'var(--color-bg-card)'}}>
                        {/* キャッチコピー表示位置を示すラベル */}
                        <div style={{
                          margin:'0 14px 10px',
                          background:'var(--color-brand)',
                          color:'#fff', fontSize:10, fontWeight:700,
                          padding:'4px 10px', borderRadius:6,
                          textAlign:'center',
                        }}>
                          👆 キャッチコピーはここに縦書きで表示されます
                        </div>
                        <div style={{fontSize:10,color:'#999',marginBottom:6,textAlign:'center',letterSpacing:'0.1em'}}>
                          {catchcopy ? '― キャッチコピー ―' : '― あらすじ ―'}
                        </div>
                        {/* 縦書きテキスト（本物と同じロジック） */}
                        <div style={{margin:isMobile?'0 8px':'0 28px'}}>
                          <div style={{display:'flex',flexDirection:'row',border:'1px solid #ccc',borderRadius:3,overflow:'hidden',padding:'8px 0'}}>
                            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
                              {Array.from({length:20},(_,row)=>(
                                <div key={row} style={{flex:1,height:27,borderBottom:row<19?'1px solid #eee':'none',borderRight:'1px solid #ddd'}}/>
                              ))}
                            </div>
                            {Array.from({length:5},(_,col)=>{
                              const text = catchcopy||summary||'（キャッチコピーまたはあらすじがここに縦書きで表示されます）'
                              const chars = text.split('')
                              const actualCol = 4-col
                              return (
                                <div key={col} style={{display:'flex',flexDirection:'column',borderRight:'1px solid #ddd'}}>
                                  {Array.from({length:20},(_,row)=>{
                                    const ch = chars[actualCol*20+row]||null
                                    return (
                                      <div key={row} style={{width:27,height:27,borderBottom:row<19?'1px solid #eee':'none',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:ch?'#111':'transparent',fontFamily:"'Noto Serif JP',serif",lineHeight:1,flexShrink:0}}>
                                        {ch||'　'}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })}
                            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
                              {Array.from({length:20},(_,row)=>(
                                <div key={row} style={{flex:1,height:27,borderBottom:row<19?'1px solid #eee':'none'}}/>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* ボタン */}
                      <div style={{padding:'10px 14px',borderTop:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',gap:8,flexShrink:0}}>
                        <button onClick={()=>setShowCatchcopyHint(false)}
                          style={{flex:1,padding:'9px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>
                          閉じる
                        </button>
                        <div style={{flex:2,padding:'9px 0',background:'var(--color-brand)',color:'#fff',fontWeight:700,fontSize:14,borderRadius:8,textAlign:'center'}}>
                          作品を読む →
                        </div>
                      </div>
                    </div>
                    <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
                  </div>,
                  document.body
                )}

                <textarea style={{...inp,resize:'vertical',minHeight:60}} value={catchcopy}
                  onChange={e=>setCatchcopy(e.target.value.slice(0,100))}
                  placeholder="例：「私は絶対に、あなたを守ってみせる」"/>
                <div style={{fontSize:10,color:'var(--color-text-faint)',textAlign:'right',marginTop:2}}>{catchcopy.length}/100</div>
              </div>

              <div style={fg}>
                <label style={lbl}>作品の長さ <span style={{color:'var(--color-danger)'}}>*</span></label>
                <div style={{display:'flex',gap:10}}>
                  {(['長編','短編'] as const).map(t=>(
                    <button key={t} type="button" onClick={()=>setNovelType(t)}
                      style={{flex:1,padding:'10px',borderRadius:10,border:'2px solid',cursor:'pointer',textAlign:'center' as const,
                        background:novelType===t?'var(--color-brand-light)':'var(--color-bg-card)',
                        borderColor:novelType===t?'var(--color-brand)':'var(--color-brand-border)'}}>
                      <div style={{fontSize:14,fontWeight:700,color:novelType===t?'var(--color-brand)':'var(--color-text)'}}>{t}</div>
                      <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>{t==='長編'?'複数話にわたる作品':'1話完結の作品'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={fg}>
                <label style={lbl}>ジャンル <span style={{color:'var(--color-danger)'}}>*</span></label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                  {GENRES.map(g=>(
                    <button key={g} type="button" onClick={()=>setGenre(g)}
                      style={{padding:'4px 12px',borderRadius:16,fontSize:12,border:'1.5px solid',cursor:'pointer',
                        background:genre===g?'var(--color-brand)':'var(--color-bg-card)',color:genre===g?'var(--color-bg-card)':'var(--color-text-muted)',
                        borderColor:genre===g?'var(--color-brand)':'var(--color-brand-border)'}}>
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
                    style={{padding:'8px 14px',border:'1px solid var(--color-brand-border)',borderRadius:6,fontSize:12,color:'var(--color-text-muted)',background:'var(--color-bg-card)',cursor:'pointer',whiteSpace:'nowrap'}}>
                    追加
                  </button>
                </div>
                <div style={{fontSize:10,color:'var(--color-text-faint)',marginTop:2}}>{tags.length}/10</div>
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
            </div>
          </div>
        )}

        {/* 既存作品選択 */}
        {mode === 'existing' && (
          <div style={sec}>
            <div style={sh}>作品を選択</div>
            <div style={sb}>
              {myNovels.length === 0 ? (
                <div style={{textAlign:'center',padding:'20px',color:'var(--color-text-faint)',fontSize:13}}>公開中の連載作品がありません</div>
              ) : (
                <>
                  <label style={lbl}>連載中の作品 <span style={{color:'var(--color-danger)'}}>*</span></label>
                  <select value={selectedNovelId} onChange={e=>setSelectedNovelId(e.target.value)}
                    style={{...inp,cursor:'pointer',borderColor:errors.novel?'var(--color-danger)':'var(--color-brand-border)'}}>
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

        {/* 年齢制限 */}
        <div style={sec}>
          <div style={sh}>年齢制限</div>
          <div style={{padding:'14px 18px'}}>
            <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:10}}>性的描写・過激な暴力描写・残酷描写が含まれる場合は選択してください。</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[
                {label:'全年齢', active:!isR18&&!isR15, onClick:()=>{setIsR18(false);setIsR15(false)}, color:'var(--color-brand)'},
                {label:'R15', active:isR15&&!isR18, onClick:()=>{setIsR15(true);setIsR18(false)}, color:'#f59e0b'},
                {label:'R18', active:isR18, onClick:()=>{setIsR18(true);setIsR15(false)}, color:'var(--color-danger)'},
              ].map(btn=>(
                <button key={btn.label} type="button" onClick={btn.onClick}
                  style={{padding:'5px 16px',borderRadius:16,border:`1.5px solid ${btn.active?btn.color:'var(--color-brand-border)'}`,
                    fontSize:12,fontWeight:600,cursor:'pointer',
                    background:btn.active?btn.color:'var(--color-bg-card)',
                    color:btn.active?'var(--color-bg-card)':btn.color}}>
                  {btn.label}
                </button>
              ))}
            </div>
            {isR18 && <div style={{fontSize:11,color:'var(--color-danger)',marginTop:8}}>⚠ ログイン済み18歳以上のユーザーにのみ表示されます</div>}
          </div>
        </div>

        {/* 話の内容 */}
        {(!editMode || editEpId) && (
          <div style={sec}>
            <div style={sh}>話の内容</div>
            <div style={sb}>
              <div style={fg}>
                <label style={lbl}>
                  タイトル <span style={{color:'var(--color-danger)'}}>*</span>
                  <span style={{fontWeight:400,color:'var(--color-text-faint)',fontSize:11,marginLeft:6}}>例：第1話 始まりの朝</span>
                </label>
                <input style={{...inp,borderColor:errors.ep?'var(--color-danger)':'var(--color-brand-border)'}} value={epTitle} onChange={e=>setEpTitle(e.target.value)} placeholder="例：第1話 始まりの朝"/>
                {errors.ep && <div style={er}>{errors.ep}</div>}
              </div>

              <div style={fg}>
                <label style={lbl}>前書き<span style={{fontWeight:400,color:'var(--color-text-faint)',fontSize:11,marginLeft:6}}>{prefaceLen.toLocaleString()} / 20,000文字</span></label>
                <textarea style={{...inp,resize:'vertical',minHeight:60,borderColor:errors.preface?'var(--color-danger)':'var(--color-brand-border)'}}
                  value={preface} onChange={e=>setPreface(e.target.value)} placeholder="前書き（省略可）"/>
                {errors.preface && <div style={er}>{errors.preface}</div>}
              </div>

              <div style={fg}>
                <label style={lbl}>挿絵（本文の上に表示）</label>
                <div style={{border:'2px dashed var(--color-brand-border)',borderRadius:10,padding:'16px',textAlign:'center',background:'var(--color-bg)',cursor:'pointer'}}
                  onClick={()=>illustRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--color-brand)'}}
                  onDragLeave={e=>{e.currentTarget.style.borderColor='var(--color-brand-border)'}}
                  onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/')){handleIllustUpload(f);e.currentTarget.style.borderColor='var(--color-brand-border)'}}}>
                  <input ref={illustRef} type="file" accept="image/*" style={{display:'none'}}
                    onChange={e=>{const f=e.target.files?.[0];if(f)handleIllustUpload(f)}}/>
                  {illustPreview ? (
                    <div>
                      <img src={illustPreview} alt="挿絵プレビュー" style={{maxWidth:'100%',maxHeight:300,borderRadius:8,objectFit:'contain'}}/>
                      <div style={{marginTop:8,display:'flex',gap:8,justifyContent:'center'}}>
                        <button type="button" onClick={e=>{e.stopPropagation();setIllustPreview('');setIllustFile(null)}}
                          style={{padding:'4px 12px',fontSize:11,border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'}}>削除</button>
                        <button type="button" onClick={e=>{e.stopPropagation();illustRef.current?.click()}}
                          style={{padding:'4px 12px',fontSize:11,border:'1px solid var(--color-brand)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-brand)',cursor:'pointer'}}>変更</button>
                      </div>
                    </div>
                  ) : illustUploading ? (
                    <div style={{color:'var(--color-brand)',fontSize:13}}>アップロード中...</div>
                  ) : (
                    <div>
                      <div style={{fontSize:32,marginBottom:8}}>🖼</div>
                      <div style={{fontSize:13,color:'var(--color-text-muted)',marginBottom:4}}>クリックまたはドラッグで画像を追加</div>
                      <div style={{fontSize:11,color:'var(--color-text-faint)'}}>JPG・PNG・GIF・WEBP対応</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={fg}>
                <div style={{marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
                    <label style={{...lbl,marginBottom:0}}>
                      本文 <span style={{color:'var(--color-danger)'}}>*</span>
                      <span style={{fontWeight:400,color:'var(--color-text-faint)',fontSize:11,marginLeft:6}}>（公開時は500文字以上）</span>
                    </label>
                    <div style={{display:'flex',gap:3,alignItems:'center',flexWrap:'wrap'}}>
                      <span style={{fontSize:11,color:'var(--color-text-muted)',marginRight:3}}>文字サイズ：</span>
                      {FONT_SIZES.map(f=>(
                        <button key={f.label} type="button" onClick={()=>setFontSize(f.size)}
                          style={{padding:'2px 7px',fontSize:11,border:'1px solid',cursor:'pointer',borderRadius:4,
                            background:fontSize===f.size?'var(--color-brand)':'var(--color-bg-card)',
                            color:fontSize===f.size?'var(--color-bg-card)':'var(--color-text-muted)',
                            borderColor:fontSize===f.size?'var(--color-brand)':'var(--color-brand-border)'}}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{overflowX:'auto',scrollbarWidth:'none' as any,marginBottom:5}}>
                  <div style={{display:'flex',gap:3,padding:5,background:'var(--color-bg)',border:'1px solid var(--color-brand-border)',borderRadius:6,minWidth:'max-content'}}>
                    <button type="button" onClick={insertRuby} style={toolBtn}>ルビ</button>
                    <button type="button" onClick={()=>insertText('《《','》》')} style={toolBtn}>《《強調》》</button>
                    <button type="button" onClick={()=>insertText('\n────────────\n')} style={toolBtn}>区切り線</button>
                    <button type="button" onClick={indentNonDialogue} style={toolBtn}>一文字下げ</button>
                    <button type="button" onClick={()=>insertText('\n\n')} style={toolBtn}>改行</button>
                    <div style={{width:1,background:'var(--color-brand-border)',margin:'0 2px'}}/>
                    <button type="button" onClick={()=>setShowReplace(!showReplace)}
                      style={{...toolBtn,background:showReplace?'var(--color-brand)':'var(--color-bg-card)',color:showReplace?'var(--color-bg-card)':'var(--color-text-muted)',borderColor:showReplace?'var(--color-brand)':'var(--color-brand-border)'}}>
                      一括置換
                    </button>
                  </div>
                </div>

                {showReplace && (
                  <div style={{background:'var(--color-bg)',border:'1px solid var(--color-brand-border)',borderRadius:6,padding:'10px 12px',marginBottom:6}}>
                    <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:8,alignItems: isMobile ? 'stretch' : 'center',flexWrap:'wrap'}}>
                      <input value={replaceFrom} onChange={e=>setReplaceFrom(e.target.value)} placeholder="置換前のテキスト"
                        style={{...inp,flex:1,minWidth:120,fontSize:12}}/>
                      {!isMobile && <span style={{color:'var(--color-text-muted)'}}>→</span>}
                      <input value={replaceTo} onChange={e=>setReplaceTo(e.target.value)} placeholder="置換後のテキスト"
                        style={{...inp,flex:1,minWidth:120,fontSize:12}}/>
                      <button type="button" onClick={handleReplace}
                        style={{padding:'7px 14px',background:'var(--color-brand)',color:'var(--color-bg-card)',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                        置換する
                      </button>
                      {replaceCount !== null && (
                        <span style={{fontSize:11,color:'var(--color-success)',fontWeight:600}}>{replaceCount}箇所を置換しました</span>
                      )}
                    </div>
                  </div>
                )}

                {hasAiMarkers && (
                  <div style={{background:'#fffbeb',border:'1.5px solid #f59e0b',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{fontSize:14}}>⚠️</span>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--color-warning)'}}>AI生成コンテンツの可能性が検出されました</span>
                    </div>
                    <div style={{fontSize:11,color:'#78350f',lineHeight:1.7}}>
                      {aiMarkers.map((m,i)=><div key={i}>・{m}</div>)}
                    </div>
                    <div style={{fontSize:11,color:'var(--color-warning)',marginTop:6}}>
                      公開後、運営の審査対象となります。AI全自動生成は規約違反となる場合があります。
                    </div>
                  </div>
                )}

                <textarea ref={bodyRef}
                  style={{...inp,resize:'vertical',minHeight: isMobile ? 300 : 400,fontSize,lineHeight:1.95,
                    fontFamily:"'Noto Serif JP',serif",borderColor:errors.body?'var(--color-danger)':hasAiMarkers?'#f59e0b':'var(--color-brand-border)'}}
                  value={body} onChange={e=>setBody(e.target.value)}
                  placeholder="本文を入力してください"/>

                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                  <div style={{flex:1,height:4,background:'var(--color-brand-border)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:2,background:bodyColor,width:`${bodyPct}%`,transition:'width .2s'}}/>
                  </div>
                  <span style={{fontSize:11,color:bodyColor,fontWeight:600,whiteSpace:'nowrap'}}>{bodyLen.toLocaleString()} / 100,000文字</span>
                </div>
                {errors.body && <div style={er}>{errors.body}</div>}
              </div>

              <div>
                <label style={lbl}>あとがき<span style={{fontWeight:400,color:'var(--color-text-faint)',fontSize:11,marginLeft:6}}>{afterLen.toLocaleString()} / 20,000文字</span></label>
                <textarea style={{...inp,resize:'vertical',minHeight:60,borderColor:errors.afterword?'var(--color-danger)':'var(--color-brand-border)'}}
                  value={afterword} onChange={e=>setAfterword(e.target.value)} placeholder="あとがき（省略可）"/>
                {errors.afterword && <div style={er}>{errors.afterword}</div>}
              </div>
            </div>
          </div>
        )}

        {/* 予約投稿 */}
        {(!editMode || editEpId) && (
          <div style={sec}>
            <div style={sh}>公開タイミング</div>
            <div style={{padding:'14px 18px'}}>
              <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom: useSchedule ? 12 : 0}}>
                <input type="checkbox" checked={useSchedule} onChange={e=>setUseSchedule(e.target.checked)}
                  style={{width:18,height:18,accentColor:'var(--color-brand)',cursor:'pointer'}}/>
                <span style={{fontSize:13,fontWeight:600,color:'var(--color-text)'}}>日時を指定して公開する（予約投稿）</span>
              </label>

              {useSchedule && (
                <div style={{background:'var(--color-bg)',border:'1px solid var(--color-brand-border)',borderRadius:8,padding:'12px 14px'}}>
                  <label style={lbl}>公開予定日時</label>
                  <input type="datetime-local" value={scheduleValue} onChange={e=>setScheduleValue(e.target.value)}
                    min={defaultScheduleValue().slice(0,10)+'T00:00'}
                    style={{...inp,borderColor:errors.schedule?'var(--color-danger)':'var(--color-brand-border)',colorScheme:'light' as any}}/>
                  {errors.schedule && <div style={er}>{errors.schedule}</div>}
                  <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:8,lineHeight:1.6}}>
                    指定した日時に作品ページへアクセスがあった時点で自動的に公開されます。<br/>
                    「投稿する」ボタンを押すと、即時公開ではなく予約状態として保存されます。
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {errors.submit && (
          <div style={{background:'#fff0f0',border:'1px solid #f5c0c0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'var(--color-danger)',marginBottom:12}}>
            {errors.submit}
          </div>
        )}

        {/* ボタン行 */}
        {isMobile ? (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button onClick={()=>handleSubmit(true)} disabled={loading}
              style={{width:'100%',background:'var(--color-brand)',color:'var(--color-bg-card)',padding:'14px',borderRadius:10,fontSize:15,fontWeight:700,border:'none',cursor:'pointer',opacity:loading?0.5:1}}>
              {submitButtonLabel}
            </button>
            <button onClick={()=>handleSubmit(false)} disabled={loading||draftSaved}
              style={{width:'100%',border:'1.5px solid var(--color-brand)',color:draftSaved?'var(--color-success)':'var(--color-brand)',padding:'12px',borderRadius:10,fontSize:14,background:draftSaved?'#e8f5e9':'var(--color-bg-card)',cursor:draftSaved?'default':'pointer',opacity:loading?0.5:1}}>
              {draftSaved?'✓ 保存しました':'下書き保存'}
            </button>
            <Link href="/mypage" style={{display:'block',textAlign:'center',border:'1px solid var(--color-brand-border)',color:'var(--color-text-muted)',padding:'11px',borderRadius:10,fontSize:14,background:'var(--color-bg-card)',textDecoration:'none'}}>
              キャンセル
            </Link>
          </div>
        ) : (
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Link href="/mypage" style={{border:'1px solid var(--color-brand-border)',color:'var(--color-text-muted)',padding:'9px 20px',borderRadius:20,fontSize:13,background:'var(--color-bg-card)'}}>キャンセル</Link>
            <button onClick={()=>handleSubmit(false)} disabled={loading||draftSaved}
              style={{border:'1.5px solid var(--color-brand)',color:draftSaved?'var(--color-success)':'var(--color-brand)',padding:'9px 20px',borderRadius:20,fontSize:13,background:draftSaved?'#e8f5e9':'var(--color-bg-card)',cursor:draftSaved?'default':'pointer',opacity:loading?0.5:1,transition:'all .3s'}}>
              {draftSaved?'✓ 保存しました':'下書き保存'}
            </button>
            <button onClick={()=>handleSubmit(true)} disabled={loading}
              style={{background:'var(--color-brand)',color:'var(--color-bg-card)',padding:'10px 24px',borderRadius:20,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',opacity:loading?0.5:1}}>
              {submitButtonLabel}
            </button>
          </div>
        )}
      </div>

      <Footer user={true} />

      {toast && (
        <div style={{position:'fixed',bottom: isMobile ? 80 : 24,right:24,background:'var(--color-brand)',color:'var(--color-bg-card)',padding:'12px 20px',borderRadius:12,fontSize:14,fontWeight:600,zIndex:9999,boxShadow:'0 4px 16px rgba(242,106,33,.35)'}}>
          {toast}
        </div>
      )}
    </div>
  )
}
