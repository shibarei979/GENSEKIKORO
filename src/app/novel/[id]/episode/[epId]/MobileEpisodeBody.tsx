'use client'
import { useState, useRef, useEffect } from 'react'
import ReadingSettings, { Settings } from './ReadingSettings'

interface Props {
  title: string
  body: string
  preface?: string | null
  afterword?: string | null
  authorName?: string
}

const DEFAULTS: Settings = { font: 'serif', fontSize: 16, lineHeight: 2.1, writingMode: 'horizontal' }

function renderBody(text: string): string {
  let result = text.replace(/｜([^《]+)《([^》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>')
  result = result.replace(/《《([^》]+)》》/g, '<em style="font-style:normal;font-weight:700;border-bottom:2px solid #F26A21">$1</em>')
  result = result.replace(/\n/g, '<br/>')
  return result
}

function isHorizontalChar(ch: string): boolean {
  return ['ー','〜','‥','─','—','－','〰','ｰ','｜','|'].includes(ch)
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

export default function MobileEpisodeBody({ title, body, preface, afterword, authorName }: Props) {
  const [isVertical, setIsVertical] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [containerHeight, setContainerHeight] = useState(600)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setContainerHeight(window.innerHeight - 200)
    try {
      const saved = localStorage.getItem('reading_settings')
      if (saved) {
        const s = { ...DEFAULTS, ...JSON.parse(saved) } as Settings
        setSettings(s)
        setIsVertical(s.writingMode === 'vertical')
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (isVertical && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
        }
      }, 100)
    }
  }, [isVertical, body])

  function handleSettingsChange(s: Settings) {
    setSettings(s)
    setIsVertical(s.writingMode === 'vertical')
  }

  function toggleVertical() {
    const next = !isVertical
    setIsVertical(next)
    const newSettings = { ...settings, writingMode: next ? 'vertical' as const : 'horizontal' as const }
    setSettings(newSettings)
    try { localStorage.setItem('reading_settings', JSON.stringify(newSettings)) } catch {}
  }

  const fontFamily = settings.font === 'serif'
    ? "'Noto Serif JP', serif"
    : "'Noto Sans JP', sans-serif"

  const Afterword = afterword ? (
    <div style={{borderTop:'1px solid #F0D9C9'}}>
      <div style={{padding:'10px 14px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2',display:'flex',alignItems:'center',gap:8}}>
        <span style={{width:3,height:14,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
        <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>あとがき</span>
        {authorName && <span style={{fontSize:11,color:'#77706A',marginLeft:'auto'}}>{authorName}</span>}
      </div>
      <div style={{padding:'14px 16px',fontSize:14,color:'#2B211B',lineHeight:1.9,whiteSpace:'pre-wrap',fontFamily:"'Noto Sans JP',sans-serif"}}>
        {afterword}
      </div>
    </div>
  ) : null

  // ===== 縦書き =====
  if (isVertical) {
    return (
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
        <div style={{padding:'8px 12px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <button onClick={toggleVertical}
            style={{fontSize:12,padding:'5px 12px',borderRadius:14,border:'1.5px solid #F26A21',background:'#F26A21',color:'#fff',cursor:'pointer'}}>
            横書きに戻す
          </button>
          <ReadingSettings onChange={handleSettingsChange} isMobile={true}/>
        </div>

        {preface && (
          <div style={{padding:'10px 14px',background:'#FFF9F2',borderBottom:'1px solid #FFF1E6'}}>
            <div style={{fontSize:13,color:'#77706A',lineHeight:1.9,padding:'8px 12px',background:'#fff',borderLeft:'3px solid #F0D9C9',borderRadius:4,whiteSpace:'pre-wrap'}}>
              {preface}
            </div>
          </div>
        )}

        {/* vertical-body クラスで globals.css の * { writing-mode: horizontal-tb !important } を回避 */}
        <style>{`
          .vertical-body, .vertical-body * {
            writing-mode: vertical-rl !important;
            text-orientation: mixed !important;
          }
          .vertical-body .v-char {
            display: inline-block !important;
            writing-mode: vertical-rl !important;
          }
          .vertical-body .v-char-rotate {
            display: inline-block !important;
            writing-mode: vertical-rl !important;
            transform: rotate(90deg) !important;
          }
          .v-scroll-m::-webkit-scrollbar { height: 10px; }
          .v-scroll-m::-webkit-scrollbar-track { background: #FFF1E6; border-radius: 5px; }
          .v-scroll-m::-webkit-scrollbar-thumb { background: #F26A21; border-radius: 5px; border: 2px solid #FFF1E6; }
          .v-scroll-m { scrollbar-width: thin; scrollbar-color: #F26A21 #FFF1E6; }
        `}</style>

        <div
          ref={scrollRef}
          className="v-scroll-m"
          style={{
            overflowX: 'scroll',
            overflowY: 'hidden',
            height: containerHeight,
            paddingBottom: 4,
          }}
        >
          {/* vertical-body クラスを付けることで writing-mode の強制上書きを防ぐ */}
          <div
            className="vertical-body"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              display: 'inline-block',
              padding: '24px 16px 24px 32px',
              height: 'calc(100% - 18px)',
              boxSizing: 'border-box',
            }}
          >
            {/* タイトル */}
            <div style={{display:'inline-block', marginRight:'2em', verticalAlign:'top', writingMode:'vertical-rl'}}>
              <div style={{fontSize: settings.fontSize + 4, fontWeight:700, color:'#2B211B', fontFamily, lineHeight:1.8}}>
                {title}
              </div>
            </div>
            {/* 本文 */}
            <div style={{display:'inline-block', fontSize: settings.fontSize, lineHeight: settings.lineHeight, color:'#2B211B', fontFamily, wordBreak:'break-all', verticalAlign:'top', writingMode:'vertical-rl'}}>
              <VerticalText text={body}/>
            </div>
          </div>
        </div>

        <div style={{padding:'4px 12px',background:'#FFF9F2',borderTop:'1px solid #FFF1E6',textAlign:'center',fontSize:10,color:'#B8AEA8'}}>
          ← 左にスワイプして読み進める
        </div>

        {Afterword}
      </div>
    )
  }

  // ===== 横書き =====
  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
      <div style={{padding:'8px 12px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button onClick={toggleVertical}
          style={{fontSize:12,padding:'5px 12px',borderRadius:14,border:'1.5px solid #F0D9C9',background:'#fff',color:'#77706A',cursor:'pointer'}}>
          縦書きで読む
        </button>
        <ReadingSettings onChange={handleSettingsChange} isMobile={true}/>
      </div>

      <div style={{padding:'20px 16px 28px'}}>
        <h1 style={{fontFamily, fontSize:settings.fontSize+2, fontWeight:700, color:'#2B211B', textAlign:'center', marginBottom:20, lineHeight:1.6}}>
          {title}
        </h1>
        {preface && (
          <div style={{fontSize:settings.fontSize-2, color:'#77706A', lineHeight:1.9, padding:'10px 12px', background:'#FFF9F2', borderLeft:'3px solid #F0D9C9', borderRadius:4, marginBottom:20, whiteSpace:'pre-wrap'}}>
            {preface}
          </div>
        )}
        <div
          style={{fontSize:settings.fontSize, lineHeight:settings.lineHeight, color:'#2B211B', fontFamily, wordBreak:'break-all'}}
          dangerouslySetInnerHTML={{__html: renderBody(body)}}
        />
      </div>

      {Afterword}
    </div>
  )
}
