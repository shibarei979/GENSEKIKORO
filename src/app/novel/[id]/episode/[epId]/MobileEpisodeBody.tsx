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

// 横書き用レンダリング（ルビ・強調）
function renderBody(text: string): string {
  let result = text.replace(/｜([^《]+)《([^》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>')
  result = result.replace(/《《([^》]+)》》/g, '<em style="font-style:normal;font-weight:700;border-bottom:2px solid #F26A21">$1</em>')
  result = result.replace(/\n/g, '<br/>')
  return result
}

// デスクトップと同じ文字変換
function isHorizontalChar(ch: string): boolean {
  return ['ー','〜','…','‥','─','—','－','〰','ｰ','｜','|'].includes(ch)
}

// デスクトップと同じVerticalTextコンポーネント
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
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('reading_settings') : null
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  // vertical = 縦書き（横スクロール）、horizontal = 横書き（縦スクロール）
  const isVertical = settings.writingMode === 'vertical'
  const fontFamily = settings.font === 'serif'
    ? "'Noto Serif JP', serif"
    : "'Noto Sans JP', sans-serif"

  // 縦書き時：デスクトップと同じく右端（冒頭）からスタート
  useEffect(() => {
    if (isVertical && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [isVertical, body])

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

  // ===== 縦書き（横スクロール）：デスクトップのVerticalBodyと同じ実装 =====
  if (isVertical) {
    return (
      <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
        {/* 設定バー */}
        <div style={{padding:'8px 12px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'flex-end'}}>
          <ReadingSettings onChange={setSettings} isMobile={true}/>
        </div>

        {/* 前書き */}
        {preface && (
          <div style={{padding:'10px 16px',background:'#FFF9F2',borderBottom:'1px solid #FFF1E6'}}>
            <div style={{fontSize:13,color:'#77706A',lineHeight:1.9,padding:'10px 12px',background:'#fff',borderLeft:'3px solid #F0D9C9',borderRadius:4,whiteSpace:'pre-wrap'}}>
              {preface}
            </div>
          </div>
        )}

        {/* 縦書き本文：デスクトップと同じスタイル */}
        <style>{`
          .v-scroll-m::-webkit-scrollbar { height: 10px; }
          .v-scroll-m::-webkit-scrollbar-track { background: #FFF1E6; border-radius: 5px; }
          .v-scroll-m::-webkit-scrollbar-thumb { background: #F26A21; border-radius: 5px; border: 2px solid #FFF1E6; }
          .v-scroll-m { scrollbar-width: thin; scrollbar-color: #F26A21 #FFF1E6; }
        `}</style>
        <div
          ref={scrollRef}
          className="v-scroll-m"
          style={{
            overflowX:'scroll',
            overflowY:'hidden',
            height:'70vh',
            WebkitOverflowScrolling:'touch' as any,
          }}
        >
          <div style={{
            writingMode:'vertical-rl',
            textOrientation:'mixed',
            display:'inline-block',
            padding:'24px 16px 24px 32px',
            height:'calc(100% - 16px)',
            boxSizing:'border-box',
          }}>
            {/* タイトル */}
            <div style={{display:'inline-block',marginRight:'1.5em',verticalAlign:'top'}}>
              <div style={{fontSize:settings.fontSize+2,fontWeight:700,color:'#2B211B',fontFamily,lineHeight:1.8}}>
                {title}
              </div>
            </div>
            {/* 本文 */}
            <div style={{display:'inline-block',fontSize:settings.fontSize,lineHeight:settings.lineHeight,color:'#2B211B',fontFamily,wordBreak:'break-all',verticalAlign:'top'}}>
              <VerticalText text={body}/>
            </div>
          </div>
        </div>

        <div style={{padding:'5px 12px',background:'#FFF9F2',borderTop:'1px solid #FFF1E6',textAlign:'center',fontSize:10,color:'#B8AEA8'}}>
          ← スワイプして読み進める
        </div>

        {Afterword}
      </div>
    )
  }

  // ===== 横書き（縦スクロール） =====
  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
      <div style={{padding:'8px 12px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'flex-end'}}>
        <ReadingSettings onChange={setSettings} isMobile={true}/>
      </div>

      <div style={{padding:'20px 16px 28px'}}>
        <h1 style={{fontFamily,fontSize:settings.fontSize+2,fontWeight:700,color:'#2B211B',textAlign:'center',marginBottom:20,lineHeight:1.6}}>
          {title}
        </h1>
        {preface && (
          <div style={{fontSize:settings.fontSize-2,color:'#77706A',lineHeight:1.9,padding:'10px 12px',background:'#FFF9F2',borderLeft:'3px solid #F0D9C9',borderRadius:4,marginBottom:20,whiteSpace:'pre-wrap'}}>
            {preface}
          </div>
        )}
        <div
          style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,color:'#2B211B',fontFamily,wordBreak:'break-all'}}
          dangerouslySetInnerHTML={{__html: renderBody(body)}}
        />
      </div>

      {Afterword}
    </div>
  )
}
