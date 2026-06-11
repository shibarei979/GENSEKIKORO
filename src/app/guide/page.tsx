import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import Link from 'next/link'

type NavLink = { href: string; label: string; active?: boolean }
type SectionItem = { label: string; desc: string }
type Section = {
  id: string; title: string; content?: string; note?: string
  items?: SectionItem[]; list?: string[]; examples?: string[]
}

const navLinks: NavLink[] = [
  { href: '/about',    label: '原石航路とは' },
  { href: '/guide',    label: '投稿ガイド', active: true },
  { href: '/faq',      label: 'よくある質問' },
  { href: '/help',     label: 'ヘルプ・FAQ' },
  { href: '/contact',  label: 'お問い合わせ' },
  { href: '/feedback', label: 'ご意見・ご要望' },
]

const sections: Section[] = [
  { id:'register', title:'原石航路で作品を投稿するには',
    content:'アカウント登録後に作品を投稿できます。投稿できる作品は、ユーザー自身が創作したオリジナル作品、または正当な権利を持っている作品に限ります。他者の作品・文章・設定・画像などを無断で使用することはできません。' },
  { id:'type', title:'投稿タイプ',
    items:[
      { label:'新連載', desc:'新しい作品の第1話を投稿する場合に選択します。新しい長編・短編・連載作品の第1話を投稿する場合に使います。' },
      { label:'連載中の作品に追加', desc:'すでに投稿している作品に新しい話を追加する場合に選択します。第2話以降や既存作品の更新に使います。' },
    ] },
  { id:'length', title:'作品の長さ',
    items:[
      { label:'長編', desc:'複数話にわたる作品、または連載を前提とした作品です。' },
      { label:'短編', desc:'1話で完結する作品です。後から連載化する場合は作品設定を変更してください。' },
    ] },
  { id:'input', title:'投稿時に入力する内容',
    list:['作品タイトル（必須）','あらすじ','作品の長さ（必須）','ジャンル（必須）','タグ','話タイトル（必須）','前書き','挿絵','本文（必須）','あとがき','公開・下書き設定'],
    note:'必須項目は作品タイトル・作品の長さ・ジャンル・話タイトル・本文です。' },
  { id:'chars', title:'文字数について',
    list:['前書き：最大20,000文字','本文：最低500文字、最大100,000文字','あとがき：最大20,000文字'],
    note:'本文が500文字未満の場合、公開できない場合があります。' },
  { id:'tags', title:'タグについて',
    content:'タグは作品の特徴を読者に伝えるためのものです。1作品につき最大10個まで設定できます。作品のテーマ・主人公の特徴・舞台設定・物語の雰囲気・センシティブ要素などを入れると読者に伝わりやすくなります。',
    examples:['魔法','現代ファンタジー','学園','契約','復讐','成長','群像劇','バディ','ダークファンタジー'] },
  { id:'preface', title:'前書き・あとがきについて',
    items:[
      { label:'前書き', desc:'本文の前に表示される作者からの補足欄です。読者への挨拶・注意事項・前回の補足などに使えます。' },
      { label:'あとがき', desc:'本文の後に表示される作者からの補足欄です。読者へのお礼・次回更新予定・制作メモなどに使えます。' },
    ],
    note:'誹謗中傷・過度な宣伝・出会い目的の誘導・作品と無関係な長文は書かないでください。' },
  { id:'illust', title:'挿絵について',
    content:'投稿画面では本文の上に表示する挿絵を追加できます。対応形式：JPG・PNG・GIF・WEBP。自分で制作した画像、または正当な利用許可を得た画像のみ投稿できます。' },
  { id:'age', title:'年齢区分について',
    items:[
      { label:'全年齢', desc:'年齢を問わず閲覧できる作品です。' },
      { label:'R15', desc:'暴力表現・軽度の性的表現・センシティブなテーマを含む作品に設定してください。' },
      { label:'R18', desc:'明確な成人向け表現を含む作品に設定してください。ログイン済みかつ18歳以上のユーザーにのみ表示されます。' },
    ] },
  { id:'ai', title:'AI利用について',
    content:'原石航路では人の創作を中心とした投稿サイトを目指しています。AI生成文章を主たる内容とする作品の投稿は禁止しています。',
    items:[
      { label:'許可される利用', desc:'誤字脱字の修正・表現の言い換え・文法校正・アイデア出し・構成の検討・タイトル案の作成など補助的な利用' },
      { label:'禁止される利用', desc:'AI生成文章のそのまま投稿・作品の大部分をAIに依存すること・作風模倣目的のAI利用' },
    ] },
]

export default async function GuidePage() {
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

      <div style={{maxWidth:860,margin:'0 auto',padding:'40px 24px 60px',display:'flex',gap:24,alignItems:'flex-start'}}>
        <div style={{width:200,flexShrink:0,position:'sticky',top:80}}>
          <div style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:10,padding:'16px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#2B211B',marginBottom:10}}>目次</div>
            {sections.map(s => (
              <a key={s.id} href={`#${s.id}`}
                style={{display:'block',fontSize:11,color:'#F26A21',textDecoration:'none',padding:'4px 0',borderBottom:'1px solid #FFF1E6'}}>
                {s.title}
              </a>
            ))}
          </div>
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{marginBottom:24}}>
            <h1 style={{fontSize:24,fontWeight:700,color:'#2B211B',marginBottom:4}}>投稿ガイド</h1>
            <p style={{fontSize:13,color:'#77706A'}}>原石航路への作品投稿方法をご説明します</p>
          </div>

          {sections.map(s => (
            <div key={s.id} id={s.id} style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:12,padding:'22px 24px',marginBottom:16}}>
              <h2 style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:18,background:'#F26A21',borderRadius:2,display:'inline-block',flexShrink:0}}/>
                {s.title}
              </h2>
              {s.content && (
                <p style={{fontSize:13,color:'#2B211B',lineHeight:1.9,marginBottom:s.items||s.list||s.examples?12:0}}>
                  {s.content}
                </p>
              )}
              {s.items && (
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:s.note?12:0}}>
                  {s.items.map((item,i) => (
                    <div key={i} style={{background:'#FFF9F2',borderRadius:8,padding:'12px 14px',borderLeft:'3px solid #F26A21'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#F26A21',marginBottom:4}}>{item.label}</div>
                      <div style={{fontSize:12,color:'#2B211B',lineHeight:1.8}}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}
              {s.list && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:s.note?12:0}}>
                  {s.list.map((item,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#2B211B',padding:'5px 8px',background:'#FFF9F2',borderRadius:6}}>
                      <span style={{color:'#F26A21',fontWeight:700,fontSize:10}}></span>{item}
                    </div>
                  ))}
                </div>
              )}
              {s.examples && (
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                  {s.examples.map((ex,i) => (
                    <span key={i} style={{fontSize:11,padding:'2px 10px',background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',borderRadius:10}}>#{ex}</span>
                  ))}
                </div>
              )}
              {s.note && (
                <div style={{fontSize:12,color:'#F26A21',background:'#FFF1E6',border:'1px solid #f5b080',borderRadius:8,padding:'8px 12px',marginTop:4}}>
                  {s.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AdBanner />
      <Footer user={user} />
    </div>
  )
}
