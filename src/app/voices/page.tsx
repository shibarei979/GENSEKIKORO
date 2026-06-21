import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import VoicesFloat from './VoicesFloat'

export const metadata = {
  title: '1文検索 | 原石航路',
  description: '読者が心を動かされた一文が漂うページ。気になる言葉をクリックすると、その作品に出会えます。',
}

export const revalidate = 60

export default async function VoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    profile = data
  }

  // quoted_text が入っているコメント（文単位引用コメント）を取得
  // 同じ作品から複数の引用がある場合があるので、後段で1作品1件に絞り込むため多めに取得
  const { data: quoteComments } = await supabase
    .from('comments')
    .select('id, quoted_text, episode_id, novel_id, created_at')
    .not('quoted_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(400)

  const novelIds = Array.from(new Set((quoteComments||[]).map((c:any)=>c.novel_id).filter(Boolean)))
  let novelMap: Record<string,{title:string}> = {}
  if (novelIds.length > 0) {
    const { data: novels } = await supabase.from('novels').select('id, title').in('id', novelIds)
    novels?.forEach((n:any) => { novelMap[n.id] = { title: n.title } })
  }

  const allVoices = (quoteComments||[])
    .filter((c:any) => c.quoted_text && c.quoted_text.trim().length > 0 && c.novel_id)
    .map((c:any) => ({
      id: c.id,
      text: c.quoted_text as string,
      novelId: c.novel_id as string,
      episodeId: c.episode_id as string | null,
      novelTitle: novelMap[c.novel_id]?.title || '',
    }))

  // 1作品からは1件のみ（最新のもの）採用し、最大100件まで
  const seenNovelIds = new Set<string>()
  const voices: typeof allVoices = []
  for (const v of allVoices) {
    if (seenNovelIds.has(v.novelId)) continue
    seenNovelIds.add(v.novelId)
    voices.push(v)
    if (voices.length >= 100) break
  }

  return (
    <div style={{minHeight:'100vh',background:'#EDEDEA',fontFamily:"'Noto Sans JP',sans-serif"}}>
      <Header profile={profile} user={user} />
      <VoicesFloat voices={voices} />
      <div style={{background:'#FFF9F2'}}>
        <Footer user={user} />
      </div>
    </div>
  )
}
