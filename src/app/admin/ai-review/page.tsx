import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AiReviewSection from '../AiReviewSection'

export const dynamic = 'force-dynamic'

export default async function AdminAiReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase.from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const { data: aiReviews, count: aiReviewCount } = await supabase
    .from('ai_reviews')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  const pending = (aiReviews || []).filter((r: any) => r.status === 'pending').length

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <div style={{maxWidth:1100,margin:'0 auto',padding:'32px'}}>
        {/* パンくず */}
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#94a3b8',marginBottom:20}}>
          <Link href="/admin" style={{color:'#F26A21',textDecoration:'none'}}>管理画面</Link>
          <span>›</span>
          <span style={{color:'#1e293b'}}>AI審査</span>
        </div>

        <div style={{marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <span style={{fontSize:20,fontWeight:800,color:'#1e293b'}}>AI審査</span>
            {pending > 0 && (
              <span style={{fontSize:11,background:'#ef4444',color:'#fff',padding:'2px 10px',borderRadius:10,fontWeight:700}}>
                {pending} 件待ち
              </span>
            )}
          </div>
          <div style={{fontSize:13,color:'#64748b'}}>
            投稿時にAIパターン（**太字** など）が検出された作品の審査・対応
          </div>
        </div>

        {/* 説明カード */}
        <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'14px 18px',marginBottom:20,fontSize:12,color:'#78350f',lineHeight:1.8}}>
          <strong>検出パターンについて：</strong><br/>
          AIが生成したテキストによく含まれる <code>**太字**</code>・<code># 見出し</code>・連続リスト（3行以上）を自動検出しています。<br/>
          誤検知の場合は「問題なし」、確実なAI生成の場合は「非公開」または「完全削除」を選択してください。
        </div>

        <AiReviewSection reviews={aiReviews || []} />
      </div>
      <Footer user={user} />
    </div>
  )
}
