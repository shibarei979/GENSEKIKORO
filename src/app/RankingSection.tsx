'use client'
import NovelPreviewPopup from '@/components/NovelPreviewPopup'

interface Novel {
  id: string
  title: string
  genre: string
  novel_type?: string
  display_name: string
  like_count?: number
  summary?: string | null
  catchcopy?: string | null
  tags?: string[]
}

interface Props {
  rankingLong: Novel[]
  rankingShort: Novel[]
}

export default function RankingSection({ rankingLong, rankingShort }: Props) {
  const rankColor = (i: number) => i===0?'#F26A21':i===1?'#9ca3af':i===2?'#cd7f32':'#2B211B'
  const rowStyle = {borderBottom:'1px solid #FFF1E6',display:'flex',gap:8,padding:'9px 14px',alignItems:'flex-start',height:'100%',boxSizing:'border-box' as const}

  const RankItem = ({n, i}: {n:Novel|undefined, i:number}) => n ? (
    <NovelPreviewPopup novel={n}>
      <div style={{...rowStyle,cursor:'pointer'}}>
        <span style={{fontSize:15,fontWeight:700,minWidth:18,fontFamily:"'Noto Serif JP',serif",color:rankColor(i),flexShrink:0}}>{i+1}</span>
        <div>
          <div style={{marginBottom:2}}><span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>{n.genre}</span></div>
          <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>{n.title}</div>
          <div style={{fontSize:10,color:'#77706A',marginTop:1}}>作者：{n.display_name} · ♡ {n.like_count||0}</div>
        </div>
      </div>
    </NovelPreviewPopup>
  ) : (
    <div style={rowStyle}>
      <span style={{fontSize:15,fontWeight:700,minWidth:18,color:'#E8C8B0',flexShrink:0}}>{i+1}</span>
      <div><div style={{marginBottom:2}}><span style={{fontSize:9,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>ジャンル</span></div><div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>作品タイトル（準備中）</div></div>
    </div>
  )

  return (
    <>
      {/* デスクトップ：2列 */}
      <div className="ranking-desktop" style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
        <div style={{padding:'5px 12px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',fontSize:11,fontWeight:700,color:'#F26A21',borderRight:'1px solid #F0D9C9'}}>長編</div>
        <div style={{padding:'5px 12px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',fontSize:11,fontWeight:700,color:'#F26A21'}}>短編</div>
        {[0,1,2,3,4].map(i => (
          <>
            <div key={`l${i}`} style={{borderRight:'1px solid #F0D9C9'}}><RankItem n={rankingLong?.[i]} i={i}/></div>
            <div key={`s${i}`}><RankItem n={rankingShort?.[i]} i={i}/></div>
          </>
        ))}
      </div>
      {/* モバイル：1列 */}
      <div className="ranking-mobile" style={{display:'none'}}>
        <div style={{padding:'5px 12px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',fontSize:11,fontWeight:700,color:'#F26A21'}}>長編</div>
        {[0,1,2].map(i => <div key={`l${i}`}><RankItem n={rankingLong?.[i]} i={i}/></div>)}
        <div style={{padding:'5px 12px',background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',borderTop:'1px solid #F0D9C9',fontSize:11,fontWeight:700,color:'#F26A21',marginTop:4}}>短編</div>
        {[0,1,2].map(i => <div key={`s${i}`}><RankItem n={rankingShort?.[i]} i={i}/></div>)}
      </div>
    </>
  )
}
