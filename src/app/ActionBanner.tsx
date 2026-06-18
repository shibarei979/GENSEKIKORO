'use client'
import Link from 'next/link'

interface Props {
  isLoggedIn: boolean
}

export default function ActionBanner({ isLoggedIn }: Props) {
  return (
    <div style={{display:'flex',width:'100%',height:128,position:'relative'}}>

      {/* 左：投稿セクション（左肩が広く右肩が狭い台形） */}
      <Link href={isLoggedIn ? '/post' : '/auth/register'}
        className="action-banner-trapezoid action-banner-left"
        style={{
          flex:1, position:'relative', textDecoration:'none',
          display:'flex', alignItems:'center',
          background:'linear-gradient(115deg, #F26A21 0%, #f08a4f 100%)',
          clipPath:'polygon(0 0, 94% 0, 100% 100%, 0 100%)',
          paddingLeft:'6%', paddingRight:'10%',
          transition:'filter .2s ease',
        }}>
        <div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.75)',fontWeight:600,letterSpacing:'0.08em',marginBottom:6}}>WRITE</div>
          <div style={{fontSize:20,fontWeight:700,color:'#fff',fontFamily:"'Noto Serif JP',serif",marginBottom:6,lineHeight:1.4}}>
            あなたの物語を、<br/>世界に届けよう
          </div>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:'#fff',fontWeight:600}}>
            作品を投稿する
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      </Link>

      {/* 中央の境界に小さな原石アイコン（任意の装飾、シグネチャー要素） */}
      <div style={{
        position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        width:40, height:40, background:'#fff', borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 2px 10px rgba(0,0,0,0.15)', zIndex:2,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <polygon points="12,2 19,8 16,20 8,20 5,8" stroke="#F26A21" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* 右：探すセクション（左肩が狭く右肩が広い台形） */}
      <Link href="/search"
        className="action-banner-trapezoid action-banner-right"
        style={{
          flex:1, position:'relative', textDecoration:'none',
          display:'flex', alignItems:'center', justifyContent:'flex-end',
          background:'linear-gradient(245deg, #2B211B 0%, #4a3a2e 100%)',
          clipPath:'polygon(6% 0, 100% 0, 100% 100%, 0 100%)',
          paddingRight:'6%', paddingLeft:'10%',
          transition:'filter .2s ease',
        }}>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:600,letterSpacing:'0.08em',marginBottom:6}}>READ</div>
          <div style={{fontSize:20,fontWeight:700,color:'#fff',fontFamily:"'Noto Serif JP',serif",marginBottom:6,lineHeight:1.4}}>
            次に読みたい一冊が、<br/>ここにある
          </div>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,color:'#FFD9B8',fontWeight:600}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFD9B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:'rotate(180deg)'}}><polyline points="9 18 15 12 9 6"/></svg>
            作品を探す
          </div>
        </div>
      </Link>

      <style>{`
        .action-banner-trapezoid:hover { filter: brightness(1.06); }
        @media (max-width: 768px) {
          .action-banner-trapezoid { padding-left: 9% !important; padding-right: 9% !important; }
        }
      `}</style>
    </div>
  )
}
