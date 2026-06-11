import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Link from 'next/link'

const navLinks: {href:string;label:string;active?:boolean}[] = [
  { href: '/about',    label: '原石航路とは' },
  { href: '/guide',    label: '投稿ガイド' },
  { href: '/faq',      label: 'よくある質問', active: true },
  { href: '/help',     label: 'ヘルプ・FAQ' },
  { href: '/contact',  label: 'お問い合わせ' },
  { href: '/feedback', label: 'ご意見・ご要望' },
]

const faqCategories = [
  {
    label: 'サービスについて', icon: '',
    items: [
      { q: '原石航路はどんなサイトですか？', a: '誰でも小説を投稿でき、誰でも作品を読めるライトノベル投稿サイトです。人気順だけでなく、まだ見つかっていない作品や新人作品を発掘しやすい仕組みが特徴です。' },
      { q: '無料で使えますか？', a: '基本的な投稿・閲覧・いいね・保存・コメント・発掘する機能は無料で利用できる想定です。今後、機能追加や運営方針の変更により一部仕様が変わる場合があります。' },
      { q: '「いいね」と「発掘する」は何が違いますか？', a: '「いいね」は作品が好き・面白い・応援したいと感じたときに使う反応です。「発掘する」は、まだ読者は少ないけれどもっと読まれてほしい・これは新しい・埋もれているのがもったいないと感じたときに使う反応です。' },
      { q: '「保存」は何に使いますか？', a: '後で読みたい作品や、続きを追いたい作品を覚えておくための機能です。' },
      { q: '原石発掘とは何ですか？', a: 'まだ読者に見つかっていない作品や、独創性・読者反応の高い作品を見つけやすくするための機能です。PV数だけでなく、発掘する反応・保存率・コメント率・新人補正なども参考にします。' },
    ]
  },
  {
    label: '投稿について', icon: '✍️',
    items: [
      { q: '誰でも投稿できますか？', a: 'アカウント登録を行えば誰でも作品を投稿できます。ただし、利用規約や投稿ガイドラインに違反する作品は非公開化や削除の対象になる場合があります。' },
      { q: '短編も投稿できますか？', a: '投稿できます。投稿時に「短編」を選択してください。1話完結の作品・掌編・読み切り作品などに向いています。' },
      { q: '連載作品は投稿できますか？', a: '投稿できます。新しい作品を始める場合は「新連載」を選択し、第2話以降は「連載中の作品に追加」を選択してください。' },
      { q: '本文の文字数制限はありますか？', a: '本文は最低500文字・最大100,000文字を想定しています。前書きとあとがきはそれぞれ最大20,000文字です。' },
      { q: 'あらすじは必須ですか？', a: 'あらすじは任意です。ただし、あらすじがあると読者が作品を見つけやすく読み始めやすくなります。できるだけ設定することをおすすめします。' },
      { q: 'タグはいくつまで設定できますか？', a: 'タグは最大10個まで設定できます。作品の特徴・舞台・主人公・テーマ・雰囲気などを表すタグを設定してください。' },
      { q: '投稿後に編集できますか？', a: '投稿後も作品やエピソードを編集・削除できます。内容を大きく変更する場合は、前書きやあとがきで補足することをおすすめします。' },
      { q: 'AIを使ってもいいですか？', a: '誤字脱字修正・表現の言い換え・文法校正・アイデア出しなど補助的な利用は可能です。ただし、AI生成文章をそのまま投稿することや、作品の大部分をAIに依存することは禁止です。' },
    ]
  },
  {
    label: '閲覧・評価について', icon: '📖',
    items: [
      { q: 'R18作品が表示されません', a: 'R18作品はログイン済みかつ18歳以上であることを確認したユーザーにのみ表示されます。' },
      { q: 'いいねを取り消せますか？', a: 'もう一度いいねボタンを押すことで解除できます。' },
      { q: '保存した作品はどこで見られますか？', a: 'マイページ内の保存作品一覧から確認できます。' },
      { q: '違反作品を見つけたらどうすればいいですか？', a: '通報機能またはお問い合わせフォームからご連絡ください。運営が確認し必要に応じて対応します。' },
    ]
  },
  {
    label: 'ランキングについて', icon: '🏆',
    items: [
      { q: '新人ランキングとは何ですか？', a: '投稿開始から1ヶ月以内の作者または作品を対象としたランキングです。単純なPV数だけでなく、いいね率・保存率・発掘率・コメント率・更新頻度なども参考にします。' },
      { q: 'ランキングはどのくらいの頻度で更新されますか？', a: '日間・週間・月間・年間のランキングがあります。それぞれの集計期間に応じて更新されます。' },
    ]
  },
]

export default async function FaqPage() {
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
              style={{padding:'12px 18px',fontSize:13,color:n.active?'#F26A21':'#77706A',textDecoration:'none',whiteSpace:'nowrap',
                borderBottom:n.active?'2px solid #F26A21':'2px solid transparent',fontWeight:n.active?700:400}}>
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{maxWidth:860,margin:'0 auto',padding:'40px 24px 60px'}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:24,fontWeight:700,color:'#2B211B',marginBottom:4}}>よくある質問</h1>
          <p style={{fontSize:13,color:'#77706A'}}>原石航路についてよくある質問をまとめています</p>
        </div>

        {faqCategories.map((cat, ci) => (
          <div key={ci} style={{marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <h2 style={{fontSize:16,fontWeight:700,color:'#2B211B'}}>{cat.label}</h2>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {cat.items.map((item, i) => (
                <details key={i} style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:10,overflow:'hidden'}}>
                  <summary style={{padding:'14px 18px',fontSize:14,fontWeight:600,color:'#2B211B',cursor:'pointer',
                    display:'flex',alignItems:'center',gap:10,listStyle:'none'}}>
                    <span style={{color:'#F26A21',fontWeight:700,fontSize:16,flexShrink:0}}>Q</span>
                    {item.q}
                  </summary>
                  <div style={{padding:'12px 18px 14px',borderTop:'1px solid #FFF1E6',display:'flex',gap:10,alignItems:'flex-start',background:'#FFF9F2'}}>
                    <span style={{color:'#2563eb',fontWeight:700,fontSize:16,flexShrink:0}}>A</span>
                    <p style={{fontSize:13,color:'#2B211B',lineHeight:1.8,margin:0}}>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'20px 24px',textAlign:'center',marginTop:8}}>
          <p style={{fontSize:13,color:'#77706A',marginBottom:12}}>解決しない場合はお問い合わせください</p>
          <Link href="/contact" style={{padding:'10px 24px',background:'#F26A21',color:'#fff',borderRadius:20,textDecoration:'none',fontSize:13,fontWeight:700}}>
            お問い合わせはこちら
          </Link>
        </div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
