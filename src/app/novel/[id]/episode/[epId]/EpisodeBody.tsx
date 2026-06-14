'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReadingSettings, { Settings } from './ReadingSettings'
import MobileEpisodeBody from './MobileEpisodeBody'

interface Props {
  title: string
  body: string
  preface?: string | null
  afterword?: string | null
  authorName?: string
  episodeId?: string
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

// ===== 読み上げフック =====
function useSpeech(text: string, episodeId?: string) {
  const [isPlaying, setIsPlaying]   = useState(false)
  const [isPaused,  setIsPaused]    = useState(false)
  const [rate,      setRate]        = useState(1.0)
  const [progress,  setProgress]    = useState(0)   // 0〜1
  const [supported, setSupported]   = useState(false)
  const [chunkIdx,  setChunkIdx]    = useState(0)
  const utterRef  = useRef<SpeechSynthesisUtterance | null>(null)
  const chunksRef = useRef<string[]>([])
  const rateRef   = useRef(1.0)
  const pausedRef = useRef(false)

  // テキストを文単位に分割（〜250文字ずつ）
  useEffect(() => {
    const sentences = text
      .replace(/　/g, ' ')
      .split(/(?<=[。！？\n])/)
      .filter(s => s.trim().length > 0)
    // 短い文は結合して250文字以内のチャンクにまとめる
    const chunks: string[] = []
    let cur = ''
    for (const s of sentences) {
      if ((cur + s).length > 250 && cur.length > 0) {
        chunks.push(cur)
        cur = s
      } else {
        cur += s
      }
    }
    if (cur.length > 0) chunks.push(cur)
    chunksRef.current = chunks
  }, [text])

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  // localStorageから再開位置を復元
  useEffect(() => {
    if (!episodeId) return
    try {
      const saved = localStorage.getItem(`speech_pos_${episodeId}`)
      if (saved) setChunkIdx(Math.max(0, parseInt(saved, 10)))
    } catch {}
  }, [episodeId])

  const savePos = useCallback((idx: number) => {
    if (!episodeId) return
    try { localStorage.setItem(`speech_pos_${episodeId}`, String(idx)) } catch {}
  }, [episodeId])

  const speakChunk = useCallback((idx: number, currentRate: number) => {
    const chunks = chunksRef.current
    if (idx >= chunks.length) {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(1)
      savePos(0) // 完了したらリセット
      return
    }
    const utter = new SpeechSynthesisUtterance(chunks[idx])
    utter.lang = 'ja-JP'
    utter.rate = currentRate

    utter.onstart = () => {
      setProgress(idx / chunks.length)
      setChunkIdx(idx)
      savePos(idx)
    }
    utter.onend = () => {
      if (!pausedRef.current) {
        speakChunk(idx + 1, rateRef.current)
      }
    }
    utter.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }, [savePos])

  function play(startIdx?: number) {
    if (!supported) return
    window.speechSynthesis.cancel()
    pausedRef.current = false
    const idx = startIdx ?? chunkIdx
    setIsPlaying(true)
    setIsPaused(false)
    speakChunk(idx, rateRef.current)
  }

  function pause() {
    if (!supported) return
    pausedRef.current = true
    window.speechSynthesis.cancel()
    setIsPaused(true)
    setIsPlaying(false)
  }

  function stop() {
    if (!supported) return
    pausedRef.current = true
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setChunkIdx(0)
    setProgress(0)
    savePos(0)
  }

  function resume() {
    pausedRef.current = false
    play(chunkIdx)
  }

  function changeRate(newRate: number) {
    rateRef.current = newRate
    setRate(newRate)
    if (isPlaying) {
      // 速度変更：現在位置から再開
      const idx = chunkIdx
      window.speechSynthesis.cancel()
      setTimeout(() => speakChunk(idx, newRate), 50)
    }
  }

  // ページ離脱時に停止
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel()
    }
  }, [])

  return { isPlaying, isPaused, rate, progress, supported, chunkIdx, totalChunks: chunksRef.current.length, play, pause, stop, resume, changeRate }
}

// ===== 読み上げパネル UI =====
function SpeechPanel({ title, body, episodeId, isMobile }: { title: string; body: string; episodeId?: string; isMobile: boolean }) {
  const fullText = `${title}。${body.replace(/<[^>]+>/g, '')}`
  const { isPlaying, isPaused, rate, progress, supported, play, pause, stop, resume, changeRate } = useSpeech(fullText, episodeId)

  if (!supported) return null

  const RATES = [0.8, 1.0, 1.25, 1.5, 2.0]
  const pct = Math.round(progress * 100)

  return (
    <div style={{
      background:'#fff',
      border:'1.5px solid #F0D9C9',
      borderRadius:12,
      padding: isMobile ? '12px 14px' : '14px 18px',
      marginBottom:12,
    }}>
      {/* タイトル行 */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          {/* スピーカーアイコン */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>聴く β</span>
          <span style={{fontSize:10,color:'#B8AEA8',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:6,padding:'1px 6px'}}>
            ブラウザ音声
          </span>
        </div>

        {/* 速度ボタン */}
        <div style={{display:'flex',gap:4}}>
          {RATES.map(r => (
            <button key={r} onClick={()=>changeRate(r)}
              style={{
                padding:'2px 7px',fontSize:10,borderRadius:6,border:'1px solid',cursor:'pointer',
                background: rate===r ? '#F26A21' : '#fff',
                color: rate===r ? '#fff' : '#77706A',
                borderColor: rate===r ? '#F26A21' : '#F0D9C9',
                fontWeight: rate===r ? 700 : 400,
              }}>
              {r}x
            </button>
          ))}
        </div>
      </div>

      {/* 進捗バー */}
      <div style={{height:4,background:'#F0D9C9',borderRadius:2,overflow:'hidden',marginBottom:10,cursor:'pointer'}}
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          // チャンク位置にジャンプ（近似）
        }}>
        <div style={{
          height:'100%',background:'#F26A21',borderRadius:2,
          width:`${pct}%`,transition:'width .3s',
        }}/>
      </div>

      {/* コントロールボタン */}
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        {/* 停止 */}
        <button onClick={stop} disabled={!isPlaying && !isPaused}
          style={{
            width:32,height:32,borderRadius:'50%',
            border:'1.5px solid #F0D9C9',background:'#fff',
            cursor: isPlaying||isPaused ? 'pointer' : 'not-allowed',
            display:'flex',alignItems:'center',justifyContent:'center',
            opacity: isPlaying||isPaused ? 1 : 0.4,
          }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#77706A">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
        </button>

        {/* 再生 / 一時停止 */}
        <button
          onClick={()=>{
            if (isPlaying) pause()
            else if (isPaused) resume()
            else play()
          }}
          style={{
            width:44,height:44,borderRadius:'50%',
            border:'none',background:'#F26A21',
            cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 8px rgba(242,106,33,.35)',
          }}>
          {isPlaying ? (
            // 一時停止アイコン
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            // 再生アイコン
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        {/* 状態テキスト */}
        <div style={{flex:1}}>
          {isPlaying && (
            <div style={{fontSize:11,color:'#F26A21',fontWeight:600}}>
              読み上げ中… {pct > 0 ? `${pct}%` : ''}
            </div>
          )}
          {isPaused && (
            <div style={{fontSize:11,color:'#77706A'}}>一時停止中 — タップで再開</div>
          )}
          {!isPlaying && !isPaused && (
            <div style={{fontSize:11,color:'#B8AEA8'}}>
              {pct > 0 ? `${pct}% まで読みました` : '▶ を押して読み上げ開始'}
            </div>
          )}
        </div>

        {/* ブラウザ音声の注意 */}
        {!isPlaying && !isPaused && (
          <div style={{fontSize:10,color:'#B8AEA8',textAlign:'right',lineHeight:1.4}}>
            端末の<br/>音声を使用
          </div>
        )}
      </div>
    </div>
  )
}

export default function EpisodeBody({ title, body, preface, afterword, authorName, episodeId }: Props) {
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
        <SpeechPanel title={title} body={body} episodeId={episodeId} isMobile={true}/>
        <MobileEpisodeBody title={title} body={body} preface={preface} afterword={afterword} authorName={authorName}/>
      </>
    )
  }

  // ===== デスクトップ =====
  return (
    <>
      <SpeechPanel title={title} body={body} episodeId={episodeId} isMobile={false}/>
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
              <div
                style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,color:'#2B211B',fontFamily,wordBreak:'break-all'}}
                dangerouslySetInnerHTML={{__html: renderBodyH(body)}}
              />
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
