interface Props {
  novelId: string
  discoverCount: number
  likeCount: number
  discoverComments?: { comment: string; display_name: string }[]
}

export default function GemComment({ discoverComments=[] }: Props) {
  return (
    <div style={{padding:'8px 10px',borderTop:'1px solid var(--color-brand-border)',background:'var(--color-bg)',flex:3,display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{fontSize:9,fontWeight:700,color:'var(--color-brand)',marginBottom:4}}>読者の声</div>
      {discoverComments.length > 0 ? (
        <div style={{width:'100%',textAlign:'center'}}>
          <span style={{
            fontSize:11,
            fontWeight:400,
            color:'var(--color-text-muted)',
            lineHeight:1.6,
          }}>
            「{discoverComments[0].comment}」
          </span>
        </div>
      ) : (
        <div style={{width:'100%',textAlign:'center',fontSize:10,color:'var(--color-text-faint)',lineHeight:1.5,fontStyle:'italic'}}>
          君の声を届けよう
        </div>
      )}
    </div>
  )
}
