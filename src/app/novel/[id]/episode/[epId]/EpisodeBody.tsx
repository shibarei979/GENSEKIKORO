'use client'
import { useState, useEffect } from 'react'
import ReadingSettings, { Settings } from './ReadingSettings'
import MobileEpisodeBody from './MobileEpisodeBody'

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

export default function EpisodeBody({ title, body, preface, afterword, authorName }: Props) {
  const [isMobile, setIsMobile] = useState(false)
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

  // モバイルは専用コンポーネント
  if (isMobile) {
    return (
      <MobileEpisodeBody
        title={title}
        body={body}
        preface={preface}
        afterword={afterword}
        authorName={authorName}
      />
    )
  }

  const fontFamily = settings.font === 'serif'
    ? "'Noto Serif JP', serif"
    : "'Noto Sans JP', sans-serif"

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
      {/* 設定バー */}
      <div style={{padding:'8px 16px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'flex-end'}}>
        <ReadingSettings onChange={setSettings} isMobile={false} />
      </div>

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
          dangerouslySetInnerHTML={{__html: renderBody(body)}}
        />
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
