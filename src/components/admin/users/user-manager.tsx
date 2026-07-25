'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserProfile {
  user_id: string; display_name: string; email: string;
  login_provider: string; is_admin: boolean; created_at: string
  frozen?: boolean
}

const PROTECTED_EMAIL = 'gensekikoro@gmail.com'

const btn = (color: string, bg: string, border: string) => ({
  padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',color,background:bg,border:`1px solid ${border}`,
})

export default function UserManager({ initialUsers, total, currentPage, q }: { initialUsers: UserProfile[]; total: number; currentPage: number; q: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState(q)
  const [adminModal, setAdminModal] = useState(null as UserProfile | null)
  const [adminStep, setAdminStep] = useState(0)
  const [adminInput, setAdminInput] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  async function handleFreeze(u: UserProfile) {
    if (!confirm(`${u.display_name} を凍結/解除しますか？`)) return
    await supabase.from('profiles').update({ frozen: !u.frozen }).eq('user_id', u.user_id)
    setUsers(users.map(x => x.user_id === u.user_id ? {...x, frozen: !x.frozen} : x))
  }

  async function handleDelete(u: UserProfile) {
    if (!confirm(`${u.display_name} を完全削除しますか？この操作は取り消せません。`)) return
    await supabase.from('profiles').delete().eq('user_id', u.user_id)
    setUsers(users.filter(x => x.user_id !== u.user_id))
  }

  function openAdminModal(u: UserProfile) {
    setAdminModal(u)
    setAdminStep(1)
    setAdminInput('')
  }

  function closeAdminModal() {
    setAdminModal(null)
    setAdminStep(0)
    setAdminInput('')
  }

  async function handleAdminGrant() {
    if (!adminModal) return
    setAdminLoading(true)
    await supabase.from('profiles').update({ is_admin: true }).eq('user_id', adminModal.user_id)
    setUsers(users.map(x => x.user_id === adminModal.user_id ? {...x, is_admin: true} : x))
    setAdminLoading(false)
    closeAdminModal()
  }

  async function handleAdminRevoke(u: UserProfile) {
    if (!confirm(`${u.display_name} の管理者権限を剥奪しますか？`)) return
    if (!confirm('本当によろしいですか？この操作は慎重に行ってください。')) return
    await supabase.from('profiles').update({ is_admin: false }).eq('user_id', u.user_id)
    setUsers(users.map(x => x.user_id === u.user_id ? {...x, is_admin: false} : x))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/users?q=${encodeURIComponent(search)}`)
  }

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      {/* 管理者権限付与モーダル（3段階確認） */}
      {adminModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'28px',maxWidth:420,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>

            {/* ステップ1：最初の確認 */}
            {adminStep === 1 && (
              <>
                <div style={{fontSize:18,fontWeight:800,color:'#dc2626',marginBottom:12}}>管理者権限の付与</div>
                <div style={{fontSize:13,color:'#1e293b',lineHeight:1.7,marginBottom:20}}>
                  <strong>{adminModal.display_name}</strong>（{adminModal.email}）に管理者権限を付与しようとしています。<br/>
                  管理者はサイト全体の設定・ユーザー管理・コンテンツ削除が可能になります。<br/><br/>
                  <span style={{color:'#dc2626',fontWeight:700}}>この操作は慎重に行ってください。</span>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button onClick={closeAdminModal} style={btn('#64748b','var(--base-color-1)','#e2e8f0')}>キャンセル</button>
                  <button onClick={() => setAdminStep(2)} style={btn('var(--base-color-1)','#f59e0b','#f59e0b')}>次へ →</button>
                </div>
              </>
            )}

            {/* ステップ2：2回目の確認 */}
            {adminStep === 2 && (
              <>
                <div style={{fontSize:18,fontWeight:800,color:'#dc2626',marginBottom:12}}>本当に付与しますか？</div>
                <div style={{fontSize:13,color:'#1e293b',lineHeight:1.7,marginBottom:20}}>
                  管理者権限を付与すると、このユーザーはあなたと同等の権限を持ちます。<br/>
                  信頼できるユーザーにのみ付与してください。<br/><br/>
                  続けるには下の入力欄に <strong style={{color:'#dc2626'}}>「権限を付与する」</strong> と入力してください。
                </div>
                <input value={adminInput} onChange={e => setAdminInput(e.target.value)}
                  placeholder="権限を付与する"
                  style={{width:'100%',padding:'10px 12px',border:'2px solid #fca5a5',borderRadius:8,fontSize:13,marginBottom:16,boxSizing:'border-box' as const,outline:'none'}}/>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button onClick={closeAdminModal} style={btn('#64748b','var(--base-color-1)','#e2e8f0')}>キャンセル</button>
                  <button onClick={() => setAdminStep(3)} disabled={adminInput !== '権限を付与する'}
                    style={{...btn('var(--base-color-1)', adminInput === '権限を付与する' ? '#dc2626' : '#fca5a5', adminInput === '権限を付与する' ? '#dc2626' : '#fca5a5'), opacity: adminInput === '権限を付与する' ? 1 : 0.5}}>
                    次へ →
                  </button>
                </div>
              </>
            )}

            {/* ステップ3：最終確認 */}
            {adminStep === 3 && (
              <>
                <div style={{fontSize:18,fontWeight:800,color:'#dc2626',marginBottom:12}}>最終確認</div>
                <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:10,padding:'14px',marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#dc2626',marginBottom:6}}>以下のユーザーに管理者権限を付与します</div>
                  <div style={{fontSize:13,color:'#1e293b'}}>名前：<strong>{adminModal.display_name}</strong></div>
                  <div style={{fontSize:13,color:'#1e293b'}}>メール：{adminModal.email}</div>
                </div>
                <div style={{fontSize:12,color:'#dc2626',marginBottom:16,fontWeight:600}}>
                  この操作は取り消すことができますが、権限付与後は即座に有効になります。
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button onClick={closeAdminModal} style={btn('#64748b','var(--base-color-1)','#e2e8f0')}>キャンセル</button>
                  <button onClick={handleAdminGrant} disabled={adminLoading}
                    style={btn('var(--base-color-1)','#dc2626','#dc2626')}>
                    {adminLoading ? '処理中...' : '管理者権限を付与する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} style={{display:'flex',gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="名前・メールで検索"
          style={{flex:1,padding:'8px 14px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13}}/>
        <button type="submit" style={{...btn('var(--base-color-1)','var(--color-brand)','var(--color-brand)'),padding:'8px 20px',fontSize:13}}>検索</button>
      </form>

      <div style={{background:'var(--color-bg-card)',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
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
                {u.is_admin && <span style={{fontSize:9,background:'var(--color-brand)',color:'var(--color-text-inverse)',padding:'1px 5px',borderRadius:3}}>ADMIN</span>}
                {u.frozen && <span style={{fontSize:9,background:'#dc2626',color:'var(--color-text-inverse)',padding:'1px 5px',borderRadius:3}}>凍結</span>}
              </div>
            </div>
            <div style={{fontSize:12,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{new Date(u.created_at).toLocaleDateString('ja-JP')}</div>
            <div style={{fontSize:11,color:'#94a3b8'}}>{u.login_provider==='google'?'Google':'メール'}</div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {u.is_admin ? (
                u.email === PROTECTED_EMAIL
                  ? <span style={{fontSize:11,color:'#94a3b8',padding:'5px 8px'}}>保護されたアカウント</span>
                  : <button onClick={()=>handleAdminRevoke(u)} style={btn('#dc2626','#fef2f2','#fca5a5')}>権限剥奪</button>
              ) : (
                <>
                  {u.email !== PROTECTED_EMAIL && <button onClick={()=>openAdminModal(u)} style={btn('#f59e0b','#fffbeb','#fde68a')}>管理者に</button>}
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
          {currentPage > 1 && <a href={`/admin/users?q=${q}&page=${currentPage-1}`} style={{padding:'6px 16px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,color:'var(--color-brand)',textDecoration:'none',background:'var(--color-bg-card)'}}>‹ 前へ</a>}
          <span style={{padding:'6px 12px',fontSize:13,color:'#64748b'}}>{currentPage} / {totalPages}</span>
          {currentPage < totalPages && <a href={`/admin/users?q=${q}&page=${currentPage+1}`} style={{padding:'6px 16px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,color:'var(--color-brand)',textDecoration:'none',background:'var(--color-bg-card)'}}>次へ ›</a>}
        </div>
      )}
    </div>
  )
}
