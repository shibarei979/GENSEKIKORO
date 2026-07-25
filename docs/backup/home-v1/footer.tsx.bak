import Link from 'next/link'

interface Props {
  user?: any
}

export default function Footer({ user }: Props) {
  const cols = [
    { title: 'はじめての方へ', links: [
      { label: '原石航路とは', href: '/about' },
      { label: '投稿ガイド',   href: '/guide' },
      { label: 'よくある質問', href: '/faq' },
    ]},
    { title: 'サポート', links: [
      { label: 'ヘルプ・FAQ',    href: '/help' },
      { label: 'お問い合わせ',   href: '/contact' },
      { label: 'ご意見・ご要望', href: '/feedback' },
    ]},
    { title: '規約・ガイドライン', links: [
      { label: '利用規約',           href: '/terms' },
      { label: 'プライバシーポリシー', href: '/privacy' },
      { label: '投稿ガイドライン',   href: '/guidelines' },
    ]},
    { title: 'サービス', links: [
      { label: '作品を投稿する', href: '/post' },
      { label: '作品を探す',     href: '/search' },
      { label: 'ランキング',     href: '/ranking' },
      { label: '閲覧履歴',       href: '/history' },
      { label: 'マイページ',     href: '/mypage' },
    ]},
  ]

  return (
    <footer style={{background:'var(--color-text)',color:'rgba(255,255,255,.75)',padding:'32px 32px 16px',marginTop:20}}>
      {/* デスクトップ */}
      <div className="footer-desktop" style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:24,marginBottom:24}}>
        <div>
          <img src="/logo.png" alt="原石航路" style={{height:44,objectFit:'contain',marginBottom:8,filter:'brightness(0) invert(1)',opacity:.8}}/>
          <p style={{fontSize:12,lineHeight:1.8,color:'rgba(255,255,255,.55)'}}>原石航路は、書き手と読み手をつなぐ場所。<br/>あなたの物語が、誰かの心を照らします。</p>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <Link href={user?'/post':'/auth/register'} style={{padding:'6px 14px',borderRadius:14,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:12,fontWeight:700}}>作品を投稿する</Link>
            <Link href="/search" style={{padding:'5px 14px',border:'1px solid rgba(255,255,255,.3)',borderRadius:14,background:'none',color:'rgba(255,255,255,.75)',fontSize:12}}>作品を探す</Link>
          </div>
        </div>
        {cols.map(col => (
          <div key={col.title}>
            <h4 style={{fontSize:12,fontWeight:700,color:'var(--color-bg-card)',marginBottom:9,whiteSpace:'nowrap'}}>{col.title}</h4>
            <ul style={{listStyle:'none',padding:0}}>
              {col.links.map(link => (
                <li key={link.href} style={{fontSize:12,marginBottom:6}}>
                  <Link href={link.href} style={{color:'rgba(255,255,255,.6)',textDecoration:'none'}}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* モバイル */}
      <div className="footer-mobile" style={{display:'none',maxWidth:1200,margin:'0 auto',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <img src="/logo.png" alt="原石航路" style={{height:32,objectFit:'contain',filter:'brightness(0) invert(1)',opacity:.8}}/>
          <div style={{display:'flex',gap:8}}>
            <Link href={user?'/post':'/auth/register'} style={{padding:'5px 12px',borderRadius:12,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:11,fontWeight:700,textDecoration:'none'}}>投稿する</Link>
            <Link href="/search" style={{padding:'4px 12px',border:'1px solid rgba(255,255,255,.3)',borderRadius:12,color:'rgba(255,255,255,.75)',fontSize:11,textDecoration:'none'}}>作品を探す</Link>
          </div>
        </div>
        {/* リンクを横並びでコンパクトに */}
        <div style={{display:'flex',flexWrap:'wrap',gap:'4px 16px'}}>
          {cols.flatMap(col => col.links).map(link => (
            <Link key={link.href} href={link.href} style={{fontSize:11,color:'rgba(255,255,255,.6)',textDecoration:'none',whiteSpace:'nowrap'}}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid rgba(255,255,255,.1)',paddingTop:12,textAlign:'center',fontSize:11,color:'rgba(255,255,255,.35)'}}>
        © 2025 原石航路 All Rights Reserved.
      </div>
    </footer>
  )
}
