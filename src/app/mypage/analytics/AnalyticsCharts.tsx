'use client'
import { useState } from 'react'

interface EpisodeRow {
  ep_number: number
  title: string
  charCount: number
  views: number
  likes: number
  created_at: string
}
interface Daily { date: string; views: number }
interface NovelStat {
  id: string
  title: string
  genre: string
  published: boolean
  views: number
  viewsToday: number
  viewsWeek: number
  viewsMonth: number
  likes: number
  bookmarks: number
  comments: number
  totalChars: number
  lastUpdated: string
  epCount: number
  episodeRows: EpisodeRow[]
  daily: Daily[]
}

function fmtDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function AnalyticsCharts({ novels }: { novels: NovelStat[] }) {
  const [selectedId, setSelectedId] = useState(novels[0]?.id || '')
  const selected = novels.find(n => n.id === selectedId) || novels[0]

  if (!selected) return null

  return (
    <div>
      {/* 作品選択 */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,color:'var(--color-text-muted)',fontWeight:600,marginBottom:8}}>作品を選択</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {novels.map(n => (
            <button key={n.id} onClick={()=>setSelectedId(n.id)}
              style={{
                padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',
                border: selectedId===n.id ? '1.5px solid var(--color-brand)' : '1px solid var(--color-brand-border)',
                background: selectedId===n.id ? 'var(--color-brand-light)' : 'var(--color-bg-card)',
                color: selectedId===n.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
                maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              }}>
              {n.title}{n.published===false && ' (非公開)'}
            </button>
          ))}
        </div>
      </div>

      {/* 上段：読者からの反応 ＋ 小説情報（カクヨム風2カラム） */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}} className="analytics-top">
        {/* 読者からの反応 */}
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',fontSize:13,fontWeight:700,color:'var(--color-text)'}}>
            読者からの反応
          </div>
          <div style={{padding:'18px 20px'}}>
            {/* 大きな数字：PV・いいね */}
            <div style={{display:'flex',gap:20,marginBottom:18,paddingBottom:18,borderBottom:'1px solid var(--color-brand-light)'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:2}}>累計PV</div>
                <div style={{fontSize:28,fontWeight:700,color:'var(--color-text)'}}>{selected.views.toLocaleString()}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:2}}>いいね</div>
                <div style={{fontSize:28,fontWeight:700,color:'var(--color-danger)'}}>{selected.likes.toLocaleString()}</div>
              </div>
            </div>
            {/* 保存・コメント */}
            <div style={{display:'flex',gap:20,marginBottom:18}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:2}}>保存</div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--color-text)'}}>{selected.bookmarks.toLocaleString()}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginBottom:2}}>コメント</div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--color-text)'}}>{selected.comments.toLocaleString()}</div>
              </div>
            </div>
            {/* 今日/今週/今月 */}
            <div style={{display:'flex',gap:8,borderTop:'1px solid var(--color-brand-light)',paddingTop:14}}>
              {[['今日',selected.viewsToday],['今週',selected.viewsWeek],['今月',selected.viewsMonth]].map(([l,v]) => (
                <div key={l as string} style={{flex:1,textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:700,color:'var(--color-brand)'}}>{(v as number).toLocaleString()}</div>
                  <div style={{fontSize:10,color:'var(--color-text-muted)'}}>{l} PV</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 小説情報 */}
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',fontSize:13,fontWeight:700,color:'var(--color-text)'}}>
            小説情報
          </div>
          <div style={{padding:'18px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{fontSize:11,fontWeight:700,color:'#fff',background:selected.published===false?'var(--color-text-faint)':'var(--color-info)',padding:'2px 10px',borderRadius:4}}>
                {selected.published===false ? '非公開' : '連載中'}
              </span>
              <span style={{fontSize:13,color:'var(--color-text)'}}>{selected.epCount}話</span>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:26,fontWeight:700,color:'var(--color-text)'}}>{selected.totalChars.toLocaleString()}<span style={{fontSize:13,fontWeight:400,color:'var(--color-text-muted)',marginLeft:4}}>文字</span></div>
            </div>
            <div style={{fontSize:12,color:'var(--color-text-muted)',lineHeight:1.9}}>
              <div>ジャンル：{selected.genre}</div>
              <div>最終更新：{fmtDate(selected.lastUpdated)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 日別PV推移グラフ */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'18px',marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:16}}>直近30日のPV推移</div>
        <DailyChart daily={selected.daily}/>
      </div>

      {/* 話別テーブル（カクヨム風：横並び） */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',fontSize:13,fontWeight:700,color:'var(--color-text)'}}>
          章とエピソード
        </div>
        {selected.episodeRows.length === 0 ? (
          <div style={{padding:'30px',textAlign:'center',color:'var(--color-text-faint)',fontSize:12}}>公開中の話がありません</div>
        ) : (
          selected.episodeRows.map((ep, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:i<selected.episodeRows.length-1?'1px solid var(--color-brand-light)':'none',flexWrap:'wrap'}}>
              <span style={{fontSize:11,fontWeight:700,color:'#fff',background:'var(--color-info)',padding:'2px 8px',borderRadius:4,flexShrink:0}}>公開済</span>
              <span style={{fontSize:13,fontWeight:600,color:'var(--color-text)',flex:1,minWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ep.title}</span>
              <span style={{fontSize:12,color:'var(--color-text-muted)',whiteSpace:'nowrap',minWidth:70,textAlign:'right'}}>{ep.charCount.toLocaleString()}文字</span>
              <span style={{fontSize:12,color:'var(--color-danger)',whiteSpace:'nowrap',minWidth:44,textAlign:'right'}}>♥ {ep.likes}</span>
              <span style={{fontSize:13,fontWeight:700,color:'var(--color-text)',whiteSpace:'nowrap',minWidth:60,textAlign:'right'}}>{ep.views.toLocaleString()} PV</span>
              <span style={{fontSize:11,color:'var(--color-text-faint)',whiteSpace:'nowrap',minWidth:120,textAlign:'right'}}>{fmtDate(ep.created_at).replace(/年|月/g,'/').replace('日','')}</span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .analytics-top { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function DailyChart({ daily }: { daily: Daily[] }) {
  const max = Math.max(1, ...daily.map(d => d.views))
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',gap:3,height:160,borderBottom:'1px solid var(--color-brand-border)'}}>
        {daily.map((d, i) => (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}} title={`${d.date}: ${d.views}PV`}>
            <div style={{
              width:'100%',
              height: `${(d.views / max) * 100}%`,
              minHeight: d.views > 0 ? 3 : 0,
              background: 'linear-gradient(180deg, var(--color-brand), #ff9d5c)',
              borderRadius: '3px 3px 0 0',
            }}/>
          </div>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:10,color:'var(--color-text-faint)'}}>
        <span>{daily[0]?.date}</span>
        <span>{daily[Math.floor(daily.length/2)]?.date}</span>
        <span>{daily[daily.length-1]?.date}</span>
      </div>
    </div>
  )
}
