import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'#FFF9F2', padding:'24px', textAlign:'center',
      fontFamily:"'Noto Sans JP',sans-serif",
    }}>
      {/* 原石モチーフ：磨かれる前の原石を線画で */}
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none" style={{marginBottom:28}}>
        <polygon points="44,8 70,28 62,68 26,68 18,28"
          stroke="#F0D9C9" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
        <polygon points="44,8 70,28 44,40" stroke="#F26A21" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
        <line x1="44" y1="8" x2="44" y2="40" stroke="#F0D9C9" strokeWidth="2"/>
        <line x1="18" y1="28" x2="44" y2="40" stroke="#F0D9C9" strokeWidth="2"/>
        <line x1="70" y1="28" x2="44" y2="40" stroke="#F0D9C9" strokeWidth="2"/>
        <line x1="26" y1="68" x2="44" y2="40" stroke="#F0D9C9" strokeWidth="2"/>
        <line x1="62" y1="68" x2="44" y2="40" stroke="#F0D9C9" strokeWidth="2"/>
      </svg>

      <div style={{fontSize:13,color:'#B8AEA8',fontWeight:600,letterSpacing:'0.08em',marginBottom:10}}>
        404
      </div>
      <h1 style={{fontSize:22,fontWeight:700,color:'#2B211B',marginBottom:10,fontFamily:"'Noto Serif JP',serif"}}>
        ページが見つかりません
      </h1>
      <p style={{fontSize:13,color:'#77706A',lineHeight:1.8,marginBottom:32,maxWidth:380}}>
        お探しのページは移動または削除された可能性があります。<br/>
        URLをご確認のうえ、再度お試しください。
      </p>

      <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center'}}>
        <Link href="/"
          style={{
            background:'#F26A21', color:'#fff', fontSize:13, fontWeight:700,
            padding:'11px 28px', borderRadius:24, textDecoration:'none',
          }}>
          ホームに戻る
        </Link>
        <Link href="/search"
          style={{
            background:'#fff', color:'#77706A', fontSize:13, fontWeight:600,
            padding:'11px 28px', borderRadius:24, textDecoration:'none',
            border:'1px solid #F0D9C9',
          }}>
          作品を探す
        </Link>
      </div>
    </div>
  )
}
