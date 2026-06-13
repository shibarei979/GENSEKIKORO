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

  // 縦書きモード切替（localStorageに保存）
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

  // モバイルは専用コンポーネント
  if (isMobile) {
    return (
      <>
        {/* モバイル縦書きボタン */}
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
          <button onClick={toggleVertical}
            style={{fontSize:12,padding:'5px 14px',borderRadius:16,border:'1.5px solid #F0D9C9',
              background:vertical?'#F26A21':'#fff',
              color:vertical?'#fff':'#77706A',
              cursor:'pointer',fontWeight:vertical?700:400}}>
            {vertical ? '横書きに戻す' : '縦書きで読む'}
          </button>
        </div>
        {vertical ? (
          <VerticalBody
            title={title} body={body} preface={preface}
            afterword={afterword} authorName={authorName}
            fontSize={settings.fontSize} fontFamily={settings.font==='serif'?"'Noto Serif JP',serif":"'Noto Sans JP',sans-serif"}
          />
        ) : (
          <MobileEpisodeBody
            title={title} body={body} preface={preface}
            afterword={afterword} authorName={authorName}
          />
        )}
      </>
    )
  }

  const fontFamily = settings.font === 'serif'
    ? "'Noto Serif JP', serif"
    : "'Noto Sans JP', sans-serif"

  return (
    <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,overflow:'hidden',marginBottom:16}}>
      {/* 設定バー */}
      <div style={{padding:'8px 16px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        {/* 縦書きボタン */}
        <button onClick={toggleVertical}
          style={{fontSize:12,padding:'4px 14px',borderRadius:14,border:'1.5px solid #F0D9C9',
            background:vertical?'#F26A21':'#fff',
            color:vertical?'#fff':'#77706A',
            cursor:'pointer',fontWeight:vertical?700:400}}>
          {vertical ? '横書きに戻す' : '縦書きで読む'}
        </button>
        <ReadingSettings onChange={setSettings} isMobile={false} />
      </div>

      {vertical ? (
        <VerticalBody
          title={title} body={body} preface={preface}
          afterword={afterword} authorName={authorName}
          fontSize={settings.fontSize} fontFamily={fontFamily}
        />
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
        </>
      )}
    </div>
  )
}

// 縦書きコンポーネント
function VerticalBody({ title, body, preface, afterword, authorName, fontSize, fontFamily }: {
  title: string; body: string; preface?: string|null; afterword?: string|null
  authorName?: string; fontSize: number; fontFamily: string
}) {
  function renderBody(text: string): string {
    let result = text.replace(/｜([^《]+)《([^》]+)》/g, '<ruby>$1<rt>$2</rt></ruby>')
    result = result.replace(/《《([^》]+)》》/g, '<em style="font-style:normal;font-weight:700;border-bottom:2px solid #F26A21">$1</em>')
    // 縦書き用：改行を段落区切りに
    result = result.replace(/\n/g, '<br/>')
    return result
  }

  return (
    <div style={{
      writingMode: 'vertical-rl',
      textOrientation: 'mixed',
      overflowX: 'auto',
      overflowY: 'hidden',
      padding: '32px 48px',
      minHeight: 400,
      maxHeight: 'calc(100vh - 200px)',
      direction: 'rtl',
    }}>
      {/* タイトル */}
      <h1 style={{
        fontFamily, fontSize: fontSize + 4,
        fontWeight: 700, color: '#2B211B',
        marginBottom: 48, lineHeight: 1.6,
        writingMode: 'vertical-rl',
      }}>
        {title}
      </h1>

      {/* 前書き */}
      {preface && (
        <div style={{
          fontSize: 13, color: '#77706A', lineHeight: 1.9,
          padding: '12px 16px', background: '#FFF9F2',
          borderTop: '3px solid #F0D9C9', borderRadius: 4,
          marginBottom: 48, whiteSpace: 'pre-wrap',
          writingMode: 'vertical-rl',
        }}>
          {preface}
        </div>
      )}

      {/* 本文 */}
      <div
        style={{
          fontSize, lineHeight: 2.1, color: '#2B211B', fontFamily,
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          wordBreak: 'break-all',
        }}
        dangerouslySetInnerHTML={{__html: renderBody(body)}}
      />

      {/* あとがき */}
      {afterword && (
        <div style={{marginTop: 48, writingMode: 'vertical-rl'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:12}}>あとがき</div>
          <div style={{fontSize:14,color:'#2B211B',lineHeight:1.9,whiteSpace:'pre-wrap'}}>
            {afterword}
          </div>
        </div>
      )}
    </div>
  )
}
