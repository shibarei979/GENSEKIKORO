import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Link from 'next/link'

const navLinks = [
  { href: '/about',    label: '原石航路とは' },
  { href: '/guide',    label: '投稿ガイド' },
  { href: '/faq',      label: 'よくある質問' },
  { href: '/help',     label: 'ヘルプ・FAQ' },
  { href: '/contact',  label: 'お問い合わせ' },
  { href: '/feedback', label: 'ご意見・ご要望', active: true },
]

const categories = [
  { icon: '✨', label: '新機能の要望', desc: 'こんな機能がほしい' },
  { icon: '🔧', label: '既存機能の改善案', desc: 'ここを使いやすくしてほしい' },
  { icon: '✍️', label: '投稿画面について', desc: '投稿がもっとしやすくなるといいな' },
  { icon: '📖', label: '読書画面について', desc: '読みやすくしてほしい' },
  { icon: '🔍', label: '検索・ランキング', desc: '見つけやすくしてほしい' },
  { icon: '🎨', label: 'デザインについて', desc: 'デザインに関する意見' },
  { icon: '🏷️', label: 'ジャンル・タグ', desc: 'ジャンルやタグへの要望' },
  { icon: '', label: 'ガイドラインへの意見', desc: 'ルールに関する意見' },
  { icon: '💬', label: 'その他', desc: 'サービス改善につながる内容' },
]

const examples = [
  '投稿画面でタグを並び替えられるようにしてほしい',
  '下書き保存が完了したか分かりやすくしてほしい',
  '作品カードに「発掘する数」を表示してほしい',
  '読書画面の文字サイズをもっと細かく変更したい',
  '新人ランキングをジャンル別に見たい',
  'R18作品を完全に非表示にする設定がほしい',
  'コメント通知がほしい',
  '今日の原石作品をトップページに出してほしい',
  '原石発掘ページに「保存率が高い作品」タブがほしい',
]

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />

      <div style={{background:'#FFF9F2',borderBottom:'1px solid #F0D9C9',overflowX:'auto'}}>
        <div style={{maxWidth:860,margin:'0 auto',padding:'0 24px',display:'flex'}}>
          {navLinks.map(n => (
            <Link key={n.href} href={n.href}
              style={{padding:'12px 18px',fontSize:13,color:(n as any).active?'#F26A21':'#77706A',textDecoration:'none',whiteSpace:'nowrap',
                borderBottom:(n as any).active?'2px solid #F26A21':'2px solid transparent',fontWeight:(n as any).active?700:400}}>
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{maxWidth:720,margin:'0 auto',padding:'40px 24px 60px'}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:24,fontWeight:700,color:'#2B211B',marginBottom:4}}>ご意見・ご要望</h1>
          <p style={{fontSize:13,color:'#77706A'}}>原石航路をより良くするためのご意見をお待ちしています</p>
        </div>

        {/* メッセージ */}
        <div style={{background:'linear-gradient(135deg,#FFF1E6,#FFF9F2)',border:'1px solid #f5b080',borderRadius:12,padding:'24px',marginBottom:24,textAlign:'center'}}>
          <p style={{fontSize:15,color:'#2B211B',lineHeight:1.9,marginBottom:0}}>
            「この機能がほしい」「ここが使いにくい」<br/>
            あなたの声が、原石航路を育てます。
          </p>
        </div>

        {/* カテゴリ */}
        <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'22px 24px',marginBottom:16}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:4,height:18,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
            送れる内容
          </h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {categories.map((cat,i) => (
              <div key={i} style={{background:'#FFF9F2',borderRadius:8,padding:'12px',textAlign:'center'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#2B211B',marginBottom:2}}>{cat.label}</div>
                <div style={{fontSize:10,color:'#77706A'}}>{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ご意見の例 */}
        <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'22px 24px',marginBottom:16}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:4,height:18,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
            ご意見の例
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {examples.map((ex,i) => (
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'8px 12px',background:'#FFF9F2',borderRadius:8,fontSize:13,color:'#2B211B'}}>
                <span style={{color:'#F26A21',fontSize:14,flexShrink:0}}></span>{ex}
              </div>
            ))}
          </div>
        </div>

        {/* 送るときのお願い */}
        <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'22px 24px',marginBottom:24}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:4,height:18,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
            送るときのお願い
          </h2>
          <p style={{fontSize:13,color:'#77706A',lineHeight:1.8,marginBottom:10}}>できるだけ具体的に書いてください。</p>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {['どのページの話か','どの操作で困ったか','どうなってほしいか','似ているサービスや参考例があるか','作者目線か読者目線か'].map((item,i) => (
              <div key={i} style={{display:'flex',gap:8,fontSize:12,color:'#2B211B'}}>
                <span style={{color:'#F26A21'}}></span>{item}
              </div>
            ))}
          </div>
        </div>

        {/* 反映について */}
        <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'22px 24px',marginBottom:24}}>
          <h2 style={{fontSize:15,fontWeight:700,color:'#2B211B',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:4,height:18,background:'#F26A21',borderRadius:2,display:'inline-block'}}/>
            反映について
          </h2>
          <p style={{fontSize:13,color:'#77706A',lineHeight:1.8}}>
            いただいたご意見・ご要望は今後のサービス改善の参考にします。ただし、すべての要望を必ず実装するとは限りません。個別に採用・不採用の理由を返信できない場合があります。多くのユーザーにとって使いやすく、安全で、原石航路らしい体験につながるものから優先して検討します。
          </p>
        </div>

        <div style={{background:'linear-gradient(135deg,#FFF1E6,#FFF9F2)',border:'1.5px solid #F26A21',borderRadius:12,padding:'24px',textAlign:'center'}}>
          <p style={{fontSize:14,color:'#2B211B',lineHeight:1.9,marginBottom:16}}>
            原石航路は、ユーザーのみなさまの声をもとに<br/>少しずつ育てていきます。
          </p>
          <div style={{fontSize:13,color:'#77706A',marginBottom:20}}>
            <strong>送り先：</strong> 原石航路 運営<br/>
            <span style={{color:'#B8AEA8'}}>gensekikoro@gmail.com</span>
          </div>
        </div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
