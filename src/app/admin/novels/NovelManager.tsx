'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Novel { id: string; title: string; genre: string; display_name: string; published: boolean; is_r18: boolean; created_at: string; aims_publishing?: boolean }

const btn = (color: string, bg: string, border: string) => ({
  padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',color,background:bg,border:`1px solid ${border}`,
})

export default function NovelManager({ initialNovels, total, currentPage, q, publishingOnly }: { initialNovels: Novel[]; total: number; currentPage: number; q: string; publishingOnly?: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const [novels, setNovels] = useState(initialNovels)
  const [search, setSearch] = useState(q)

  async function togglePublish(n: Novel) {
    await supabase.from('novels').update({ published: !n.published }).eq('id', n.id)
    setNovels(novels.map(x => x.id === n.id ? {...x, published: !n.published} : x))
  }

  async function handleDelete(n: Novel) {
    if (!confirm(`「${n.title}」を削除しますか？この操作は取り消せません。`)) return
    await supabase.from('novels').delete().eq('id', n.id)
    setNovels(novels.filter(x => x.id !== n.id))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/novels?q=${encodeURIComponent(search)}${publishingOnly?'&publishing=1':''}`)
  }

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <form onSubmit={handleSearch} style={{display:'flex',gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="作品名で検索"
          style={{flex:1,padding:'8px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13}}/>
        <button type="submit" style={{...btn('#fff','#F26A21','#F26A21'),padding:'8px 20px',fontSize:13}}>検索</button>
      </form>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        {novels.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>作品が見つかりません</div>
        ) : novels.map((n, idx) => (
          <div key={n.id} style={{padding:'12px 16px',borderBottom:idx<novels.length-1?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
                <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #f5b080',padding:'1px 5px',borderRadius:3}}>{n.genre}</span>
                {n.is_r18 && <span style={{fontSize:10,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',padding:'1px 5px',borderRadius:3}}>R18</span>}
                {!n.published && <span style={{fontSize:10,background:'#f1f5f9',color:'#94a3b8',padding:'1px 5px',borderRadius:3}}>非公開</span>}
                {n.aims_publishing && <span style={{fontSize:10,background:'#fefce8',color:'#854d0e',border:'1px solid #fde047',padding:'1px 5px',borderRadius:3,fontWeight:700}}>📚 書籍化希望</span>}
              </div>
              <Link href={`/novel/${n.id}`} target="_blank" style={{fontSize:13,fontWeight:600,color:'#1e293b',textDecoration:'none'}}>{n.title}</Link>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>作者：{n.display_name} · {new Date(n.created_at).toLocaleDateString('ja-JP')}</div>
            </div>
            <div style={{display:'flex',gap:4,flexShrink:0}}>
              <button onClick={()=>togglePublish(n)} style={btn(n.published?'#f59e0b':'#10b981',n.published?'#fffbeb':'#f0fdf4',n.published?'#fde68a':'#86efac')}>
                {n.published?'非公開':'公開'}
              </button>
              <button onClick={()=>handleDelete(n)} style={btn('#dc2626','#fef2f2','#fca5a5')}>削除</button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:16}}>
          {currentPage > 1 && <a href={`/admin/novels?q=${q}&page=${currentPage-1}${publishingOnly?'&publishing=1':''}`} style={{padding:'6px 16px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,color:'#F26A21',textDecoration:'none',background:'#fff'}}>‹ 前へ</a>}
          <span style={{padding:'6px 12px',fontSize:13,color:'#64748b'}}>{currentPage} / {totalPages}</span>
          {currentPage < totalPages && <a href={`/admin/novels?q=${q}&page=${currentPage+1}${publishingOnly?'&publishing=1':''}`} style={{padding:'6px 16px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,color:'#F26A21',textDecoration:'none',background:'#fff'}}>次へ ›</a>}
        </div>
      )}
    </div>
  )
}
