interface Props {
  novelId: string
  discoverCount: number
  likeCount: number
  discoverComments?: { comment: string; display_name: string }[]
}

export default function GemComment({ discoverComments=[] }: Props) {
  return (
    <div style={{padding:'8px 10px',borderTop:'1px solid #F0D9C9',background:'#FFF9F2',flex:3,display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{fontSize:9,fontWeight:700,color:'#F26A21',marginBottom:4}}>読者の声</div>
      {discoverComments.length > 0 ? (
        <div style={{width:'100%',textAlign:'center'}}>
          <span style={{
            fontSize:11,
            fontWeight:400,
            color:'#77706A',
            lineHeight:1.6,
          }}>
            「{discoverComments[0].comment}」
          </span>
        </div>
      ) : (
        <div style={{width:'100%',textAlign:'center',fontSize:10,color:'#B8AEA8',lineHeight:1.5,fontStyle:'italic'}}>
          君の声を届けよう
        </div>
      )}
    </div>
  )
}
