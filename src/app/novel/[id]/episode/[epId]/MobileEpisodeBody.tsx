'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
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

export default function MobileEpisodeBody({ title, body, preface, afterword, authorName }: Props) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('reading_settings') : null
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [scrollPos, setScrollPos] = useState(0)

  const isVertical = settings.writingMode === 'horizontal' // 縦書き＝横スクロール
  const fontFamily = settings.font === 'serif'
    ? "'Noto Serif JP', serif"
    : "'Noto Sans JP', sans-serif"

  // 横スクロール時のタッチ操作
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isVertical || !containerRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) < 30 || dy > Math.abs(dx)) return // 縦スワイプは無視

    const pageW = containerRef.current.clientWidth
    const maxScroll = containerRef.current.scrollWidth - pageW
    const newPos = Math.max(0, Math.min(maxScroll, scrollPos - dx * 1.5)) // 右→左方向
    setScrollPos(newPos)
    containerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
  }, [isVertical, scrollPos])

  // スクロール位置同期
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollPos(containerRef.current.scrollLeft)
    }
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: 0 })
      setScrollPos(0)
    }
  }, [settings.writingMode])

  if (isVertical) {
    // 縦書き＋横スクロール
    return (
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
        {/* 設定バー */}
        <div style={{padding:'8px 12px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'flex-end'}}>
          <ReadingSettings onChange={setSettings} isMobile={true} />
        </div>

        {/* 縦書き本文 */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onScroll={handleScroll}
          style={{
            overflowX:'auto',
            overflowY:'hidden',
            WebkitOverflowScrolling:'touch' as any,
            scrollbarWidth:'none',
            msOverflowStyle:'none',
          }}
        >
          <div style={{
            writingMode:'vertical-rl',
            textOrientation:'mixed',
            padding:'24px 20px',
            minHeight:'60vh',
            display:'inline-block',
          }}>
            {/* タイトル */}
            <h1 style={{
              fontFamily,
              fontSize: settings.fontSize + 4,
              fontWeight:700,
              color:'#2B211B',
              marginLeft:24,
              lineHeight:1.6,
              writingMode:'vertical-rl',
            }}>
              {title}
            </h1>

            {/* 前書き */}
            {preface && (
              <div style={{
                fontSize:settings.fontSize - 2,
                color:'#77706A',
                lineHeight:settings.lineHeight,
                padding:'8px 12px',
                background:'#FFF9F2',
                borderTop:'3px solid #F0D9C9',
                marginLeft:20,
                whiteSpace:'pre-wrap',
                writingMode:'vertical-rl',
              }}>
                {preface}
              </div>
            )}

            {/* 本文 */}
            <div
              style={{
                fontSize:settings.fontSize,
                lineHeight:settings.lineHeight,
                color:'#2B211B',
                fontFamily,
                writingMode:'vertical-rl',
                textOrientation:'mixed',
                letterSpacing:'0.05em',
              }}
              dangerouslySetInnerHTML={{__html: renderBody(body)}}
            />
          </div>
        </div>

        {/* スワイプヒント（初回のみ） */}
        <div style={{padding:'6px 12px',background:'#FFF9F2',borderTop:'1px solid #FFF1E6',textAlign:'center',fontSize:10,color:'#B8AEA8'}}>
          ← スワイプして読み進める
        </div>

        {/* あとがき */}
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
      </div>
    )
  }

  // 縦読み（横書き）
  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
      <div style={{padding:'8px 12px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'flex-end'}}>
        <ReadingSettings onChange={setSettings} isMobile={true} />
      </div>

      <div style={{padding:'20px 16px 28px'}}>
        <h1 style={{fontFamily,fontSize:settings.fontSize+2,fontWeight:700,color:'#2B211B',textAlign:'center',marginBottom:20,lineHeight:1.6}}>
          {title}
        </h1>
        {preface && (
          <div style={{fontSize:settings.fontSize-2,color:'#77706A',lineHeight:1.9,padding:'10px 14px',background:'#FFF9F2',borderLeft:'3px solid #F0D9C9',borderRadius:4,marginBottom:20,whiteSpace:'pre-wrap'}}>
            {preface}
          </div>
        )}
        <div
          style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,color:'#2B211B',fontFamily,wordBreak:'break-all'}}
          dangerouslySetInnerHTML={{__html: renderBody(body)}}
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
    </div>
  )
}
