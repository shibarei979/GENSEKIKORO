'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReadingSettings, { Settings } from './ReadingSettings'
import MobileEpisodeBody from './MobileEpisodeBody'
import { useQuote } from './QuoteContext'

interface Props {
  title: string
  body: string
  preface?: string | null
  afterword?: string | null
  authorName?: string
  episodeId?: string
  onQuote?: (text: string) => void
}

const DEFAULTS: Settings = { font: 'serif', fontSize: 16, lineHeight: 2.1, writingMode: 'horizontal' }

function renderBodyH(text: string): string {
  let r = text.replace(/｜([^《]+)《([^》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>')
  r = r.replace(/《《([^》]+)》》/g, '<em style="font-style:normal;font-weight:700;border-bottom:2px solid #F26A21">$1</em>')
  r = r.replace(/\n/g, '<br/>')
  return r
}

function isHorizontalChar(ch: string): boolean {
  return ['ー','〜','…','‥','─','—','－','〰','ｰ','｜','|'].includes(ch)
}

function VerticalText({ text }: { text: string }) {
  let processed = text.replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0))
  processed = processed.replace(/…/g, '・・・')
  processed = processed.replace(/‥/g, '・・')
  processed = processed.replace(/ー/g, '｜')
  processed = processed.replace(/ｰ/g, '｜')
  processed = processed.replace(/〜/g, '｜')
  processed = processed.replace(/－/g, '｜')
  processed = processed.replace(/—/g, '｜')
  processed = processed.replace(/―/g, '｜')
  processed = processed.replace(/─/g, '｜')
  const chars = processed.split('')
  return (
    <>
      {chars.map((ch, i) =>
        ch === '\n'
          ? <br key={i}/>
          : (
            <span key={i} style={{
              display: 'inline-block',
              transform: isHorizontalChar(ch) ? 'rotate(90deg)' : 'none',
              lineHeight: 1.2,
            }}>
              {ch}
            </span>
          )
      )}
    </>
  )
}

// テキストのクリーニング
function cleanForSpeech(text: string): string {
  let t = text
    .replace(/｜([^《]+)《[^》]+》/g, '$1')
    .replace(/《《([^》]+)》》/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`]/g, '')
    .replace(/　/g, '')
  t = t.replace(/\n\n+/g, '。')
  t = t.replace(/\n/g, '、')
  t = t.replace(/「/g, '。「')
  t = t.replace(/」/g, '」。')
  t = t.replace(/『/g, '。『')
  t = t.replace(/』/g, '』。')
  t = t.replace(/。。+/g, '。')
  t = t.replace(/、。/g, '。')
  t = t.replace(/。、/g, '。')
  t = t.replace(/――+/g, '。')
  t = t.replace(/…+/g, '、')
  t = t.replace(/‥+/g, '、')
  return t.trim()
}

// ===== 読み上げフック =====
function useSpeech(text: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused,  setIsPaused]  = useState(false)
  const [isStopped, setIsStopped] = useState(true)
  const [rate,      setRate]      = useState(1.0)
  const [supported, setSupported] = useState(false)
  const [voices,    setVoices]    = useState<SpeechSynthesisVoice[]>([])
  const [voiceIdx,  setVoiceIdx]  = useState(-1)

  const rateRef    = useRef(1.0)
  const voiceRef   = useRef<SpeechSynthesisVoice | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppedRef = useRef(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)
    const load = () => {
      const all   = window.speechSynthesis.getVoices()
      const jaVox = all.filter(v => v.lang.startsWith('ja'))
      setVoices(jaVox)
      if (voiceRef.current === null && jaVox.length > 0) {
        const prefer = jaVox.findIndex(v =>
          v.name.includes('Kyoko') || v.name.includes('Otoya') ||
          v.name.includes('Google') || v.name.includes('Microsoft')
        )
        const idx = prefer >= 0 ? prefer : 0
        voiceRef.current = jaVox[idx]
        setVoiceIdx(idx)
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
  }, [])

  const startTimer = useCallback(() => {
    if (timerRef.current) return
    timerRef.current = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
    }, 10000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => {
    stopTimer()
    if (typeof window !== 'undefined') window.speechSynthesis.cancel()
  }, [stopTimer])

  const play = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    stoppedRef.current = false
    const clean = cleanForSpeech(text)
    const utter = new SpeechSynthesisUtterance(clean)
    utter.lang   = 'ja-JP'
    utter.rate   = rateRef.current
    utter.pitch  = 1.0
    utter.volume = 1.0
    if (voiceRef.current) utter.voice = voiceRef.current
    utter.onstart = () => { setIsPlaying(true); setIsPaused(false); setIsStopped(false) }
    utter.onend   = () => {
      if (!stoppedRef.current) {
        setIsPlaying(false); setIsPaused(false); setIsStopped(true); stopTimer()
      }
    }
    utter.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return
      setIsPlaying(false); setIsPaused(false); setIsStopped(true); stopTimer()
    }
    window.speechSynthesis.speak(utter)
    startTimer()
  }, [supported, text, startTimer, stopTimer])

  function pause() {
    if (!supported || !isPlaying) return
    window.speechSynthesis.pause()
    setIsPaused(true); setIsPlaying(false)
  }

  function resumeSpeech() {
    if (!supported || !isPaused) return
    window.speechSynthesis.resume()
    setIsPaused(false); setIsPlaying(true)
  }

  function stop() {
    if (!supported) return
    stoppedRef.current = true
    window.speechSynthesis.cancel()
    stopTimer()
    setIsPlaying(false); setIsPaused(false); setIsStopped(true)
  }

  function changeRate(r: number) {
    rateRef.current = r; setRate(r)
    if (isPlaying || isPaused) { window.speechSynthesis.cancel(); setTimeout(play, 80) }
  }

  function changeVoice(idx: number) {
    voiceRef.current = voices[idx] ?? null; setVoiceIdx(idx)
    if (isPlaying || isPaused) { window.speechSynthesis.cancel(); setTimeout(play, 80) }
  }

  return { isPlaying, isPaused, isStopped, rate, supported, voices, voiceIdx, play, pause, resumeSpeech, stop, changeRate, changeVoice }
}


// ===== 読み上げパネル UI =====
function SpeechPanel({ title, body, isMobile }: { title: string; body: string; isMobile: boolean }) {
  const fullText = `${title}。\n${body}`
  const { isPlaying, isPaused, isStopped, rate, supported, voices, voiceIdx, play, pause, resumeSpeech, stop, changeRate, changeVoice } = useSpeech(fullText)
  const [showVoice, setShowVoice] = useState(false)

  if (!supported) return null

  const RATES = [0.8, 1.0, 1.25, 1.5, 2.0]

  return (
    <div style={{background:'#fff',border:'1.5px solid #F0D9C9',borderRadius:12,padding:isMobile?'12px 14px':'14px 18px',marginBottom:12}}>
      {/* 1行目：ラベル＋速度 */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>聴く β</span>
        </div>
        <div style={{display:'flex',gap:3}}>
          {RATES.map(r => (
            <button key={r} onClick={()=>changeRate(r)} style={{
              padding:'2px 7px',fontSize:10,borderRadius:6,border:'1px solid',cursor:'pointer',
              background:rate===r?'#F26A21':'#fff',color:rate===r?'#fff':'#77706A',
              borderColor:rate===r?'#F26A21':'#F0D9C9',fontWeight:rate===r?700:400,
            }}>{r}x</button>
          ))}
        </div>
      </div>

      {/* 2行目：操作ボタン＋状態＋音声選択 */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        {/* 停止 */}
        <button onClick={stop} disabled={!isPlaying && !isPaused}
          style={{width:34,height:34,borderRadius:'50%',border:'1.5px solid #F0D9C9',background:'#fff',cursor:isPlaying||isPaused?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',opacity:isPlaying||isPaused?1:0.35}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#77706A"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </button>

        {/* 再生/一時停止/再開 */}
        <button onClick={()=>{ if(isPlaying) pause(); else if(isPaused && !isStopped) resumeSpeech(); else if(!isPlaying && !isPaused) play() }}
          style={{width:46,height:46,borderRadius:'50%',border:'none',background:'#F26A21',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 10px rgba(242,106,33,.35)'}}>
          {isPlaying
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          }
        </button>

        {/* 状態テキスト */}
        <div style={{flex:1}}>
          {isPlaying  && <div style={{fontSize:11,color:'#F26A21',fontWeight:600}}>読み上げ中...</div>}
          {isPaused   && <div style={{fontSize:11,color:'#77706A'}}>一時停止 — ▶ で再開</div>}
          {!isPlaying && !isPaused && <div style={{fontSize:11,color:'#B8AEA8'}}>▶ を押して読み上げ開始</div>}
        </div>

        {/* 音声選択 */}
        {voices.length > 0 && (
          <div style={{position:'relative'}}>
            <button onClick={()=>setShowVoice(!showVoice)}
              style={{fontSize:11,padding:'5px 10px',border:'1px solid #F0D9C9',borderRadius:8,background:showVoice?'#FFF1E6':'#fff',color:'#77706A',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
              音声
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showVoice && (
              <>
                <div style={{position:'fixed',inset:0,zIndex:98}} onClick={()=>setShowVoice(false)}/>
                <div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',minWidth:200,maxHeight:220,overflowY:'auto',zIndex:99}}>
                  <div style={{padding:'8px 12px',fontSize:11,color:'#B8AEA8',borderBottom:'1px solid #F0D9C9',fontWeight:600}}>日本語音声を選択</div>
                  {voices.map((v, i) => (
                    <button key={i} onClick={()=>{changeVoice(i);setShowVoice(false)}}
                      style={{width:'100%',padding:'9px 14px',textAlign:'left',background:voiceIdx===i?'#FFF1E6':'#fff',border:'none',borderBottom:'1px solid #FFF1E6',fontSize:12,color:voiceIdx===i?'#F26A21':'#2B211B',cursor:'pointer',fontWeight:voiceIdx===i?700:400}}>
                      {v.name}{voiceIdx===i && <span style={{marginLeft:6,fontSize:10}}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 文単位コメント機能 =====
// 本文を「。」「！」「？」「」」「』」の直後で文に分割する（記号自体は文に含める）
function splitIntoSentences(text: string): string[] {
  const result: string[] = []
  let buf = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    buf += ch
    const isEnder = ch === '。' || ch === '！' || ch === '？' || ch === '」' || ch === '』'
    const next = text[i+1]
    // 改行直前でも区切る。終端記号の直後に閉じ括弧が続く場合は一旦継続させる簡易処理。
    if (ch === '\n') {
      result.push(buf)
      buf = ''
      continue
    }
    if (isEnder && next !== '」' && next !== '』') {
      result.push(buf)
      buf = ''
    }
  }
  if (buf) result.push(buf)
  return result.filter(s => s.length > 0)
}

// 文単位でホバー→💬→クリックで引用できる本文ブロック
function QuotableBody({ body, fontSize, lineHeight, fontFamily, onQuote }: {
  body: string; fontSize: number; lineHeight: number; fontFamily: string; onQuote?: (text:string)=>void
}) {
  const sentences = splitIntoSentences(body)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [justQuotedIdx, setJustQuotedIdx] = useState<number | null>(null)

  function handleClick(raw: string, idx: number) {
    if (!onQuote) return
    // 表示用にルビ記法等を簡易除去してから引用
    const clean = raw
      .replace(/｜([^《]+)《[^》]+》/g, '$1')
      .replace(/《《([^》]+)》》/g, '$1')
      .replace(/\n/g, '')
      .trim()
    if (!clean) return
    onQuote(clean)
    setJustQuotedIdx(idx)
    setTimeout(() => setJustQuotedIdx(prev => prev === idx ? null : prev), 1200)
  }

  return (
    <div style={{fontSize,lineHeight,color:'#2B211B',fontFamily,wordBreak:'break-all'}}>
      {sentences.map((raw, idx) => {
        const trimmedForDisplay = raw === '\n' ? '' : raw
        const htmlInner = renderBodyH(trimmedForDisplay)
        const isHover = hoverIdx === idx
        const justQuoted = justQuotedIdx === idx
        if (raw === '\n') return <br key={idx}/>
        return (
          <span
            key={idx}
            onMouseEnter={()=>setHoverIdx(idx)}
            onMouseLeave={()=>setHoverIdx(prev => prev===idx?null:prev)}
            style={{
              position:'relative',
              background: justQuoted ? 'rgba(242,106,33,0.16)' : isHover ? 'rgba(242,106,33,0.07)' : 'transparent',
              borderRadius: 3,
              transition:'background .15s ease',
              cursor: onQuote ? 'pointer' : 'inherit',
            }}
            onClick={()=>handleClick(raw, idx)}
          >
            <span dangerouslySetInnerHTML={{__html: htmlInner}}/>
            {onQuote && (
              <span
                aria-hidden="true"
                style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width:0, opacity:0, overflow:'hidden',
                  marginLeft: isHover ? 4 : 0,
                  ...(isHover ? { width:18, opacity:1 } : {}),
                  transition:'opacity .15s ease, width .15s ease',
                  verticalAlign:'middle',
                }}
              >
                <span style={{
                  width:17, height:17, borderRadius:'50%', background:'#F26A21',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, lineHeight:1, color:'#fff', flexShrink:0,
                }}>💬</span>
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

export default function EpisodeBody({ title, body, preface, afterword, authorName, episodeId, onQuote }: Props) {
  const { setQuotedText } = useQuote()
  const handleQuote = onQuote || setQuotedText
  const [isMobile, setIsMobile] = useState(false)
  const [vertical, setVertical] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('reading_settings') : null
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reading_vertical')
      if (saved) setVertical(JSON.parse(saved))
    } catch {}
  }, [])

  function toggleVertical() {
    const next = !vertical
    setVertical(next)
    try { localStorage.setItem('reading_vertical', JSON.stringify(next)) } catch {}
  }

  const fontFamily = settings.font === 'serif'
    ? "'Noto Serif JP', serif"
    : "'Noto Sans JP', sans-serif"

  // ===== モバイル =====
  if (isMobile) {
    return (
      <>
        <SpeechPanel title={title} body={body} isMobile={true}/>
        <MobileEpisodeBody title={title} body={body} preface={preface} afterword={afterword} authorName={authorName}/>
      </>
    )
  }

  // ===== デスクトップ =====
  return (
    <>
      <SpeechPanel title={title} body={body} isMobile={false}/>
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
        <div style={{padding:'8px 16px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <button onClick={toggleVertical}
            style={{fontSize:12,padding:'4px 14px',borderRadius:14,border:'1.5px solid #F0D9C9',
              background:vertical?'#F26A21':'#fff',color:vertical?'#fff':'#77706A',cursor:'pointer'}}>
            {vertical ? '横書きに戻す' : '縦書きで読む'}
          </button>
          <ReadingSettings onChange={setSettings} isMobile={false}/>
        </div>

        {vertical ? (
          <VerticalBody title={title} body={body} preface={preface} afterword={afterword}
            authorName={authorName} fontSize={settings.fontSize} fontFamily={fontFamily}/>
        ) : (
          <>
            <div style={{padding:'32px 48px 40px'}}>
              <h1 style={{fontFamily,fontSize:20,fontWeight:700,color:'#2B211B',textAlign:'center',marginBottom:28,lineHeight:1.6}}>
                {title}
              </h1>
              {preface && (
                <div style={{fontSize:13,color:'#77706A',lineHeight:1.9,padding:'12px 16px',background:'#FFF9F2',borderLeft:'3px solid #F0D9C9',borderRadius:4,marginBottom:28,whiteSpace:'pre-wrap'}}>
                  {preface}
                </div>
              )}
              <QuotableBody body={body} fontSize={settings.fontSize} lineHeight={settings.lineHeight} fontFamily={fontFamily} onQuote={handleQuote}/>
            </div>
            {afterword && (
              <div style={{borderTop:'1px solid #F0D9C9'}}>
                <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:3,height:14,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
                  <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>あとがき</span>
                  {authorName && <span style={{fontSize:11,color:'#77706A',marginLeft:'auto'}}>{authorName}</span>}
                </div>
                <div style={{padding:'16px 20px',fontSize:14,color:'#2B211B',lineHeight:1.9,whiteSpace:'pre-wrap',fontFamily:"'Noto Sans JP',sans-serif"}}>
                  {afterword}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

interface VerticalProps {
  title: string; body: string; preface?: string|null; afterword?: string|null
  authorName?: string; fontSize: number; fontFamily: string
}

function VerticalBody({ title, body, preface, afterword, authorName, fontSize, fontFamily }: VerticalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [body])

  return (
    <div>
      {preface && (
        <div style={{padding:'12px 32px',background:'#FFF9F2',borderBottom:'1px solid #FFF1E6'}}>
          <div style={{fontSize:13,color:'#77706A',lineHeight:1.9,padding:'10px 14px',background:'#fff',borderLeft:'3px solid #F0D9C9',borderRadius:4,whiteSpace:'pre-wrap'}}>
            {preface}
          </div>
        </div>
      )}
      <style>{`
        .v-scroll::-webkit-scrollbar { height: 14px; }
        .v-scroll::-webkit-scrollbar-track { background: #FFF1E6; border-radius: 7px; }
        .v-scroll::-webkit-scrollbar-thumb { background: #F26A21; border-radius: 7px; border: 2px solid #FFF1E6; }
        .v-scroll { scrollbar-width: thick; scrollbar-color: #F26A21 #FFF1E6; }
      `}</style>
      <div ref={scrollRef} className="v-scroll" style={{overflowX:'scroll',overflowY:'hidden',height:'calc(100vh - 180px)',paddingBottom:4}}>
        <div style={{
          writingMode:'vertical-rl',
          textOrientation:'mixed',
          display:'inline-block',
          padding:'32px 24px 32px 48px',
          height:'calc(100% - 18px)',
          boxSizing:'border-box',
        }}>
          <div style={{display:'inline-block',marginRight:'2em',verticalAlign:'top'}}>
            <div style={{fontSize:fontSize+4,fontWeight:700,color:'#2B211B',fontFamily,lineHeight:1.8}}>
              {title}
            </div>
          </div>
          <div style={{display:'inline-block',fontSize,lineHeight:2.1,color:'#2B211B',fontFamily,wordBreak:'break-all',verticalAlign:'top'}}>
            <VerticalText text={body}/>
          </div>
        </div>
      </div>
      {afterword && (
        <div style={{borderTop:'1px solid #F0D9C9'}}>
          <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:3,height:14,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
            <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>あとがき</span>
            {authorName && <span style={{fontSize:11,color:'#77706A',marginLeft:'auto'}}>{authorName}</span>}
          </div>
          <div style={{padding:'16px 20px',fontSize:14,color:'#2B211B',lineHeight:1.9,whiteSpace:'pre-wrap'}}>
            {afterword}
          </div>
        </div>
      )}
    </div>
  )
}
