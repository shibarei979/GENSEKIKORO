'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserProfile {
  user_id: string; display_name: string; email: string;
  login_provider: string; is_admin: boolean; created_at: string
  frozen?: boolean
}

const btn = (color: string, bg: string, border: string) => ({
  padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',color,background:bg,border:`1px solid ${border}`,
})

export default function UserManager({ initialUsers, total, currentPage, q }: { initialUsers: UserProfile[]; total: number; currentPage: number; q: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState(q)

  async function handleFreeze(u: UserProfile) {
    if (!confirm(`${u.display_name} を凍結/解除しますか？`)) return
    // profilesにfrozenカラムがあれば更新
    await supabase.from('profiles').update({ frozen: !u.frozen }).eq('user_id', u.user_id)
    setUsers(users.map(x => x.user_id === u.user_id ? {...x, frozen: !x.frozen} : x))
  }

  async function handleDelete(u: UserProfile) {
    if (!confirm(`${u.display_name} を完全削除しますか？この操作は取り消せません。`)) return
    await supabase.from('profiles').delete().eq('user_id', u.user_id)
    setUsers(users.filter(x => x.user_id !== u.user_id))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/users?q=${encodeURIComponent(search)}`)
  }

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <form onSubmit={handleSearch} style={{display:'flex',gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="名前・メールで検索"
          style={{flex:1,padding:'8px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13}}/>
        <button type="submit" style={{...btn('#fff','#F26A21','#F26A21'),padding:'8px 20px',fontSize:13}}>検索</button>
      </form>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'10px 16px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',display:'grid',gridTemplateColumns:'1fr 1fr auto auto auto',gap:12,fontSize:11,fontWeight:700,color:'#64748b'}}>
          <span>名前</span><span>メール</span><span>登録日</span><span>ログイン</span><span>操作</span>
        </div>
        {users.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>ユーザーが見つかりません</div>
        ) : users.map((u, idx) => (
          <div key={u.user_id} style={{padding:'12px 16px',borderBottom:idx<users.length-1?'1px solid #f1f5f9':'none',display:'grid',gridTemplateColumns:'1fr 1fr auto auto auto',gap:12,alignItems:'center'}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1e293b',display:'flex',alignItems:'center',gap:6}}>
                {u.display_name}
                {u.is_admin && <span style={{fontSize:9,background:'#F26A21',color:'#fff',padding:'1px 5px',borderRadius:3}}>ADMIN</span>}
                {u.frozen && <span style={{fontSize:9,background:'#dc2626',color:'#fff',padding:'1px 5px',borderRadius:3}}>凍結</span>}
              </div>
            </div>
            <div style={{fontSize:12,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{new Date(u.created_at).toLocaleDateString('ja-JP')}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{u.login_provider==='google'?'Google':'メール'}</div>
            <div style={{display:'flex',gap:4}}>
              {!u.is_admin && (
                <>
                  <button onClick={()=>handleFreeze(u)} style={btn(u.frozen?'#10b981':'#f59e0b',u.frozen?'#f0fdf4':'#fffbeb',u.frozen?'#86efac':'#fde68a')}>
                    {u.frozen?'解除':'凍結'}
                  </button>
                  <button onClick={()=>handleDelete(u)} style={btn('#dc2626','#fef2f2','#fca5a5')}>削除</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:16}}>
          {currentPage > 1 && <a href={`/admin/users?q=${q}&page=${currentPage-1}`} style={{padding:'6px 16px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,color:'#F26A21',textDecoration:'none',background:'#fff'}}>‹ 前へ</a>}
          <span style={{padding:'6px 12px',fontSize:13,color:'#64748b'}}>{currentPage} / {totalPages}</span>
          {currentPage < totalPages && <a href={`/admin/users?q=${q}&page=${currentPage+1}`} style={{padding:'6px 16px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,color:'#F26A21',textDecoration:'none',background:'#fff'}}>次へ ›</a>}
        </div>
      )}
    </div>
  )
}
