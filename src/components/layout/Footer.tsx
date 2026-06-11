import Link from 'next/link'

interface Props {
  user?: any
}

export default function Footer({ user }: Props) {
  const cols = [
    { title: 'はじめての方へ', links: [
      { label: '原石航路とは',     href: '/about' },
      { label: '投稿ガイド',       href: '/guide' },
      { label: 'よくある質問',     href: '/faq' },
    ]},
    { title: 'サポート', links: [
      { label: 'ヘルプ・FAQ',      href: '/help' },
      { label: 'お問い合わせ',     href: '/contact' },
      { label: 'ご意見・ご要望',   href: '/feedback' },
    ]},
    { title: '規約・ガイドライン', links: [
      { label: '利用規約',         href: '/terms' },
      { label: 'プライバシーポリシー', href: '/privacy' },
      { label: '投稿ガイドライン', href: '/guidelines' },
    ]},
    { title: 'サービス', links: [
      { label: '作品を投稿する',   href: '/post' },
      { label: '作品を探す',       href: '/search' },
      { label: 'ランキング',       href: '/ranking' },
      { label: '閲覧履歴',         href: '/history' },
      { label: 'マイページ',       href: '/mypage' },
    ]},
  ]

  return (
    <footer style={{background:'#2B211B',color:'rgba(255,255,255,.75)',padding:'32px 32px 16px',marginTop:20}}>
      <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:24,marginBottom:24}}>
        <div>
          <img src="/logo.png" alt="原石航路" style={{height:44,objectFit:'contain',marginBottom:8,filter:'brightness(0) invert(1)',opacity:.8}}/>
          <p style={{fontSize:12,lineHeight:1.8,color:'rgba(255,255,255,.55)'}}>原石航路は、書き手と読み手をつなぐ場所。<br/>あなたの物語が、誰かの心を照らします。</p>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <Link href={user?'/post':'/auth/register'} style={{padding:'6px 14px',border:'none',borderRadius:14,background:'#F26A21',color:'#fff',fontSize:12,fontWeight:700}}>作品を投稿する</Link>
            <Link href="/search" style={{padding:'5px 14px',border:'1px solid rgba(255,255,255,.3)',borderRadius:14,background:'none',color:'rgba(255,255,255,.75)',fontSize:12}}>作品を探す</Link>
          </div>
        </div>
        {cols.map(col => (
          <div key={col.title}>
            <h4 style={{fontSize:12,fontWeight:700,color:'#fff',marginBottom:9}}>{col.title}</h4>
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
      <div style={{maxWidth:1200,margin:'0 auto',borderTop:'1px solid rgba(255,255,255,.1)',paddingTop:12,textAlign:'center',fontSize:11,color:'rgba(255,255,255,.35)'}}>
        © 2025 原石航路 All Rights Reserved.
      </div>
    </footer>
  )
}
