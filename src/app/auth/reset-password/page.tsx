'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleReset() {
    setError('')
    if (!email.includes('@')) { setError('正しいメールアドレスを入力してください'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setLoading(false)
    if (err) { setError('送信に失敗しました。メールアドレスをご確認ください'); return }
    setSent(true)
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:16,padding:'40px 36px',maxWidth:400,width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <Link href="/" style={{textDecoration:'none'}}>
            <img src="/logo.png" alt="原石航路" style={{height:40,objectFit:'contain',marginBottom:12}}/>
          </Link>
          <h1 style={{fontSize:18,fontWeight:700,color:'var(--color-text)',marginBottom:6}}>パスワードの再設定</h1>
          <p style={{fontSize:12,color:'var(--color-text-muted)',lineHeight:1.7}}>
            登録したメールアドレスを入力してください。<br/>再設定用のリンクをお送りします。
          </p>
        </div>

        {sent ? (
          <div style={{textAlign:'center'}}>
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:'16px',marginBottom:20,fontSize:13,color:'#15803d',lineHeight:1.8}}>
              再設定用のメールを送信しました。<br/>
              メールをご確認の上、記載されたリンクから<br/>パスワードを再設定してください。
            </div>
            <Link href="/auth/login" style={{color:'var(--color-brand)',fontSize:13,textDecoration:'none'}}>ログインページへ戻る</Link>
          </div>
        ) : (
          <>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:600,color:'var(--color-text)',display:'block',marginBottom:6}}>メールアドレス</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleReset()}
                placeholder="example@email.com"
                style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
            </div>
            {error && <div style={{fontSize:12,color:'#dc2626',marginBottom:12}}>{error}</div>}
            <button onClick={handleReset} disabled={loading}
              style={{width:'100%',padding:'12px',background:'var(--color-brand)',color:'var(--color-text-inverse)',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',opacity:loading?0.6:1}}>
              {loading ? '送信中...' : '再設定メールを送信'}
            </button>
            <p style={{textAlign:'center',marginTop:16,fontSize:12}}>
              <Link href="/auth/login" style={{color:'var(--color-brand)',textDecoration:'none'}}>ログインページへ戻る</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
