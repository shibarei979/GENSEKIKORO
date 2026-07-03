'use client'
import { useState } from 'react'

interface EpisodeRow {
  ep_number: number
  title: string
  charCount: number
  views: number
  likes: number
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
  episodeRows: EpisodeRow[]
  daily: Daily[]
}

export default function AnalyticsCharts({ novels }: { novels: NovelStat[] }) {
  const [selectedId, setSelectedId] = useState(novels[0]?.id || '')
  const selected = novels.find(n => n.id === selectedId) || novels[0]

  if (!selected) return null

  const maxDaily = Math.max(1, ...selected.daily.map(d => d.views))
  const maxEpView = Math.max(1, ...selected.episodeRows.map(e => e.views))

  return (
    <div>
      {/* 作品選択 */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,color:'var(--color-text-muted)',fontWeight:600,marginBottom:8}}>作品を選択</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {novels.map(n => (
            <button key={n.id} onClick={()=>setSelectedId(n.id)}
              style={{
                padding:'7px 14px',borderRadius:16,fontSize:13,fontWeight:600,cursor:'pointer',
                border: selectedId===n.id ? '1.5px solid var(--color-brand)' : '1px solid var(--color-brand-border)',
                background: selectedId===n.id ? 'var(--color-brand-light)' : 'var(--color-bg-card)',
                color: selectedId===n.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
                maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              }}>
              {n.title}{n.published===false && ' (非公開)'}
            </button>
          ))}
        </div>
      </div>

      {/* 選択作品のサマリー */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(90px, 1fr))',gap:8,marginBottom:20}}>
        {[
          ['今日', selected.viewsToday], ['今週', selected.viewsWeek], ['今月', selected.viewsMonth],
          ['累計PV', selected.views], ['いいね', selected.likes], ['保存', selected.bookmarks], ['コメント', selected.comments],
        ].map(([label,val]) => (
          <div key={label as string} style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'12px 8px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--color-text)'}}>{(val as number).toLocaleString()}</div>
            <div style={{fontSize:10,color:'var(--color-text-muted)',marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* 日別PVグラフ（直近30日） */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'18px',marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:16}}>直近30日のPV推移</div>
        <div style={{display:'flex',alignItems:'flex-end',gap:2,height:140,borderBottom:'1px solid var(--color-brand-border)',paddingBottom:0}}>
          {selected.daily.map((d, i) => (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}}>
              <div style={{
                width:'100%',
                height: `${(d.views / maxDaily) * 100}%`,
                minHeight: d.views > 0 ? 2 : 0,
                background: 'var(--color-brand)',
                borderRadius: '2px 2px 0 0',
                position:'relative',
              }} title={`${d.date}: ${d.views}PV`}/>
            </div>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:9,color:'var(--color-text-faint)'}}>
          <span>{selected.daily[0]?.date}</span>
          <span>{selected.daily[Math.floor(selected.daily.length/2)]?.date}</span>
          <span>{selected.daily[selected.daily.length-1]?.date}</span>
        </div>
      </div>

      {/* 話別テーブル */}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',fontSize:13,fontWeight:700,color:'var(--color-text)'}}>
          話別データ
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'var(--color-bg)',borderBottom:'1px solid var(--color-brand-border)'}}>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--color-text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>話</th>
                <th style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:'var(--color-text-muted)',fontWeight:600,minWidth:120}}>タイトル</th>
                <th style={{padding:'10px 12px',textAlign:'right',fontSize:11,color:'var(--color-text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>文字数</th>
                <th style={{padding:'10px 12px',textAlign:'right',fontSize:11,color:'var(--color-text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>PV</th>
                <th style={{padding:'10px 12px',textAlign:'right',fontSize:11,color:'var(--color-text-muted)',fontWeight:600,whiteSpace:'nowrap'}}>いいね</th>
              </tr>
            </thead>
            <tbody>
              {selected.episodeRows.map((ep, i) => (
                <tr key={i} style={{borderBottom:'1px solid var(--color-brand-light)'}}>
                  <td style={{padding:'10px 12px',color:'var(--color-text-muted)',whiteSpace:'nowrap'}}>{ep.ep_number}話</td>
                  <td style={{padding:'10px 12px',color:'var(--color-text)',fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ep.title}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:'var(--color-text-muted)',whiteSpace:'nowrap'}}>{ep.charCount.toLocaleString()}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:'var(--color-text)',fontWeight:600,whiteSpace:'nowrap'}}>{ep.views.toLocaleString()}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:'var(--color-text-muted)',whiteSpace:'nowrap'}}>{ep.likes.toLocaleString()}</td>
                </tr>
              ))}
              {selected.episodeRows.length === 0 && (
                <tr><td colSpan={5} style={{padding:'20px',textAlign:'center',color:'var(--color-text-faint)',fontSize:12}}>公開中の話がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
