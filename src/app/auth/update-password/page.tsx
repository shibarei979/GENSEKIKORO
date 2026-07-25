'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [newPw,      setNewPw]      = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  async function handleUpdate() {
    setError('')
    if (newPw.length < 6)    { setError('パスワードは6文字以上で入力してください'); return }
    if (newPw !== confirm)   { setError('パスワードが一致しません'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPw })
    setLoading(false)
    if (err) { setError('更新に失敗しました: ' + err.message); return }
    setDone(true)
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:16,padding:'40px 36px',maxWidth:400,width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <Link href="/" style={{textDecoration:'none'}}>
            <img src="/logo.png" alt="原石航路" style={{height:40,objectFit:'contain',marginBottom:12}}/>
          </Link>
          <h1 style={{fontSize:18,fontWeight:700,color:'var(--color-text)',marginBottom:6}}>新しいパスワードを設定</h1>
        </div>

        {done ? (
          <div style={{textAlign:'center',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:'16px',fontSize:13,color:'#15803d'}}>
            パスワードを変更しました。ログインページへ移動します…
          </div>
        ) : (
          <>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--color-text)',display:'block',marginBottom:6}}>新しいパスワード（6文字以上）</label>
              <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)}
                style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--color-text)',display:'block',marginBottom:6}}>パスワード（確認）</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleUpdate()}
                style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
            </div>
            {error && <div style={{fontSize:12,color:'#dc2626',marginBottom:12}}>{error}</div>}
            <button onClick={handleUpdate} disabled={loading}
              style={{width:'100%',padding:'12px',background:'var(--color-brand)',color:'var(--color-text-inverse)',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',opacity:loading?0.6:1}}>
              {loading ? '変更中...' : 'パスワードを変更する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
