'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import type { Profile, Novel } from '@/types'
import ContestEntry from './ContestEntry'

interface Contest { id: string; title: string; deadline: string | null }
interface Entry { contest_id: string; novel_id: string }

interface Props {
  profile: Profile & { birthdate?: string | null }
  novels: Novel[]
  bookmarkedNovels: any[]
  followingAuthors?: any[]
  followerCount?: number
  followingCount?: number
  contests?: Contest[]
  initialEntries?: Entry[]
}

export default function MypageClient({ profile, novels: initialNovels, bookmarkedNovels, followingAuthors=[], followerCount=0, followingCount=0, contests=[], initialEntries=[] }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [myNovels,     setMyNovels]     = useState(initialNovels)
  const [deleteTarget, setDeleteTarget] = useState<{id:string;title:string;episodes:any[]} | null>(null)
  const [deleteMode,   setDeleteMode]   = useState<'novel'|'episode'|null>(null)
  const [deleteEpId,   setDeleteEpId]   = useState<string>('')
  const [deleteLoading,setDeleteLoading]= useState(false)
  const [loading,      setLoading]      = useState(false)
  const [iconUrl,       setIconUrl]       = useState<string>(profile.icon_url || '')
  const [iconUploading, setIconUploading] = useState(false)
  const iconInputRef = React.useRef<HTMLInputElement>(null)
  const [editingName,  setEditingName]  = useState(false)
  const [nameInput,    setNameInput]    = useState(profile.display_name)
  const [nameSaving,   setNameSaving]   = useState(false)
  const [nameError,    setNameError]    = useState('')
  const [nameSaved,    setNameSaved]    = useState(false)
  const [toast,          setToast]          = useState('')
  const [showWithdraw,   setShowWithdraw]   = useState(false)
  const [withdrawPw,     setWithdrawPw]     = useState('')
  const [withdrawing,    setWithdrawing]    = useState(false)
  const [withdrawError,  setWithdrawError]  = useState('')
  const [showSettings,   setShowSettings]   = useState(false)
  const [showBdModal,    setShowBdModal]    = useState(false)
  const [bdYear,         setBdYear]         = useState('')
  const [bdMonth,        setBdMonth]        = useState('')
  const [bdDay,          setBdDay]          = useState('')
  const [bdError,        setBdError]        = useState('')
  const [bdSaving,       setBdSaving]       = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPwModal,    setShowPwModal]    = useState(false)
  const [showBioModal,   setShowBioModal]   = useState(false)
  const [bioInput,       setBioInput]       = useState(profile.bio || '')
  const [bioSaving,      setBioSaving]      = useState(false)
  const [newEmail,       setNewEmail]       = useState('')
  const [emailPw,        setEmailPw]        = useState('')
  const [emailError,     setEmailError]     = useState('')
  const [emailSaving,    setEmailSaving]    = useState(false)
  const [currentPw,      setCurrentPw]      = useState('')
  const [newPw,          setNewPw]          = useState('')
  const [newPwConfirm,   setNewPwConfirm]   = useState('')
  const [pwError,        setPwError]        = useState('')
  const [pwSaving,       setPwSaving]       = useState(false)

  async function handleSaveBio() {
    setBioSaving(true)
    await supabase.from('profiles').update({ bio: bioInput.trim() || null }).eq('user_id', profile.user_id)
    setBioSaving(false)
    setShowBioModal(false)
    setToast('自己紹介を保存しました')
    setTimeout(() => setToast(''), 2000)
  }

  async function handleIconUpload(file: File) {
    if (!file.type.startsWith('image/')) return
    setIconUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.user_id}.${ext}`
    const { error: upErr } = await supabase.storage.from('illustrations').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data } = supabase.storage.from('illustrations').getPublicUrl(path)
      const newUrl = data.publicUrl
      await supabase.from('profiles').update({ icon_url: newUrl }).eq('user_id', profile.user_id)
      setIconUrl(newUrl)
    }
    setIconUploading(false)
  }

  async function handleSaveName() {
    if (!nameInput.trim()) { setNameError('名前を入力してください'); return }
    if (nameInput.trim().length > 20) { setNameError('20文字以内で入力してください'); return }
    setNameSaving(true); setNameError('')
    const { error } = await supabase.from('profiles').update({ display_name: nameInput.trim() }).eq('user_id', profile.user_id)
    setNameSaving(false)
    if (error) { setNameError('保存に失敗しました'); return }
    setEditingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleSignOut() {
    setLoading(true)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initial    = profile.display_name.slice(0, 1)
  const published  = myNovels.filter(n => n.published)
  const drafts     = myNovels.filter(n => !n.published)
  const userNumber = (profile as any).user_number
    ? '#' + String((profile as any).user_number).padStart(4, '0')
    : null

  async function handleEmailChange() {
    setEmailError('')
    if (!newEmail.includes('@')) { setEmailError('正しいメールアドレスを入力してください'); return }
    if (!emailPw) { setEmailError('現在のパスワードを入力してください'); return }
    setEmailSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setEmailError('ログイン情報が確認できません'); setEmailSaving(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: emailPw })
    if (signInErr) { setEmailError('パスワードが正しくありません'); setEmailSaving(false); return }
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) { setEmailError(error.message); setEmailSaving(false); return }
    await supabase.from('profiles').update({ email: newEmail }).eq('user_id', profile.user_id)
    setEmailSaving(false)
    setShowEmailModal(false)
    setNewEmail(''); setEmailPw('')
    setToast('確認メールを送信しました。メールをご確認ください。')
    setTimeout(() => setToast(''), 4000)
  }

  async function handlePwChange() {
    setPwError('')
    if (newPw.length < 6) { setPwError('新しいパスワードは6文字以上で入力してください'); return }
    if (newPw !== newPwConfirm) { setPwError('パスワードが一致しません'); return }
    if (!currentPw) { setPwError('現在のパスワードを入力してください'); return }
    setPwSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwError('ログイン情報が確認できません'); setPwSaving(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw })
    if (signInErr) { setPwError('現在のパスワードが正しくありません'); setPwSaving(false); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) { setPwError(error.message); setPwSaving(false); return }
    setPwSaving(false)
    setShowPwModal(false)
    setCurrentPw(''); setNewPw(''); setNewPwConfirm('')
    setToast('パスワードを変更しました')
    setTimeout(() => setToast(''), 3000)
  }

  async function handleTogglePublish(novelId: string, current: boolean) {
    await supabase.from('novels').update({ published: !current }).eq('id', novelId)
    setMyNovels(prev => prev.map(n => n.id === novelId ? { ...n, published: !current } : n))
    setToast(current ? '非公開にしました' : '公開しました')
    setTimeout(() => setToast(''), 2000)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !deleteMode) return
    setDeleteLoading(true)
    if (deleteMode === 'novel') {
      await supabase.from('novels').delete().eq('id', deleteTarget.id)
      setMyNovels(prev => prev.filter(n => n.id !== deleteTarget.id))
      setToast('作品を削除しました')
    } else if (deleteMode === 'episode' && deleteEpId) {
      await supabase.from('episodes').delete().eq('id', deleteEpId)
      setToast('話を削除しました')
    }
    setDeleteLoading(false)
    setDeleteTarget(null)
    setDeleteMode(null)
    setDeleteEpId('')
    setTimeout(() => setToast(''), 2000)
  }

  async function handleSaveBirthdate() {
    setBdError('')
    if (!bdYear || !bdMonth || !bdDay) { setBdError('生年月日を入力してください'); return }
    const age = (() => {
      const birth = new Date(Number(bdYear), Number(bdMonth)-1, Number(bdDay))
      const today = new Date()
      let a = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--
      return a
    })()
    if (age < 0 || age > 120) { setBdError('正しい生年月日を入力してください'); return }
    if (age < 13) { setBdError('13歳未満の方はご利用いただけません'); return }
    setBdSaving(true)
    const birthdate = `${bdYear}-${String(bdMonth).padStart(2,'0')}-${String(bdDay).padStart(2,'0')}`
    const { error: bdErr } = await supabase.from('profiles').update({ birthdate, age_verified: age >= 18 }).eq('user_id', profile.user_id)
    setBdSaving(false)
    if (bdErr) { setToast('保存に失敗しました: ' + bdErr.message); return }
    setShowBdModal(false)
    setToast(age >= 18 ? '生年月日を設定しました。R18コンテンツが閲覧できます。' : '生年月日を設定しました')
    setTimeout(() => setToast(''), 3000)
    // サーバーデータを再取得してバナーを消す
    window.location.href = window.location.pathname
  }

  async function handleWithdraw() {
    setWithdrawError('')
    setWithdrawing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setWithdrawError('ログイン情報が確認できません'); setWithdrawing(false); return }
      // メールログインの場合はパスワード確認
      if (profile.login_provider !== 'google') {
        if (!withdrawPw) { setWithdrawError('パスワードを入力してください'); setWithdrawing(false); return }
        if (!user.email) { setWithdrawError('ログイン情報が確認できません'); setWithdrawing(false); return }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: withdrawPw })
        if (signInErr) { setWithdrawError('パスワードが正しくありません'); setWithdrawing(false); return }
      } else {
        // Googleの場合は確認テキストチェック
        if (withdrawPw !== '退会') { setWithdrawError('「退会」と入力してください'); setWithdrawing(false); return }
      }
      await supabase.from('profiles').update({
        display_name: '退会済みユーザー',
        email: null,
        icon_url: null,
        bio: null,
      }).eq('user_id', profile.user_id)
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e) {
      setToast('退会処理に失敗しました')
      setWithdrawing(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#fff'}}>
      <Header profile={profile} user={true} />

      <div style={{maxWidth:860,margin:'0 auto',padding:'32px 24px'}}>
        {/* プロフィールカード */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,padding:'24px 28px',marginBottom:20,display:'flex',alignItems:'center',gap:20}}>
          <div style={{position:'relative',flexShrink:0,cursor:'pointer'}} onClick={()=>iconInputRef.current?.click()} title="クリックしてアイコンを変更">
            <input ref={iconInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){handleIconUpload(f);e.target.value=''}}}/>
            {iconUrl ? (
              <img src={iconUrl} alt={profile.display_name} style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',border:'3px solid #F26A21'}}/>
            ) : (
              <div style={{width:72,height:72,borderRadius:'50%',background:'#F26A21',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'#fff'}}>
                {initial}
              </div>
            )}
            <div style={{position:'absolute',bottom:0,right:0,width:22,height:22,background:'#fff',borderRadius:'50%',border:'2px solid #F26A21',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>
              {iconUploading ? '⟳' : '📷'}
            </div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              {editingName ? (
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')handleSaveName();if(e.key==='Escape')setEditingName(false)}}
                    style={{fontSize:20,fontWeight:700,color:'#111111',border:'1.5px solid #F26A21',borderRadius:6,padding:'2px 8px',outline:'none',width:160}}
                    autoFocus/>
                  <button onClick={handleSaveName} disabled={nameSaving}
                    style={{fontSize:12,background:'#F26A21',color:'#fff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',opacity:nameSaving?0.6:1}}>
                    {nameSaving?'保存中':'保存'}
                  </button>
                  <button onClick={()=>{setEditingName(false);setNameInput(profile.display_name);setNameError('')}}
                    style={{fontSize:12,background:'none',color:'#77706A',border:'1px solid #F0D9C9',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>
                    キャンセル
                  </button>
                </div>
              ) : (
                <>
                  <div style={{fontSize:22,fontWeight:700,color:'#111111'}}>{nameInput}</div>
                  {nameSaved && <span style={{fontSize:11,color:'#2e7d32',fontWeight:600}}>✓ 保存しました</span>}
                </>
              )}
            </div>
            {nameError && <div style={{fontSize:11,color:'#dc2626',marginBottom:4}}>{nameError}</div>}
            {userNumber && <div style={{fontSize:12,color:'#B8AEA8',marginBottom:4,letterSpacing:'.05em',fontWeight:600}}>{userNumber}</div>}
            <div style={{fontSize:13,color:'#77706A',marginBottom:8}}>{profile.email}</div>
            <div style={{display:'flex',gap:16,fontSize:12,color:'#B8AEA8'}}>
              <span style={{background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:6,padding:'2px 10px',color:'#77706A'}}>
                {profile.login_provider === 'google' ? 'Google' : 'メール'}で登録
              </span>
              <span>フォロワー <strong style={{color:'#2B211B'}}>{followerCount}</strong> 人</span>
              <span>フォロー中 <strong style={{color:'#2B211B'}}>{followingCount}</strong> 人</span>
              <span>公開 <strong style={{color:'#F26A21'}}>{published.length}</strong> 作品</span>
              <span>下書き <strong style={{color:'#77706A'}}>{drafts.length}</strong> 作品</span>
            </div>
          </div>
          <div style={{position:'relative',flexShrink:0}}>
            <button onClick={()=>setShowSettings(!showSettings)}
              style={{border:'1px solid #F0D9C9',borderRadius:10,padding:'8px 12px',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,color:'#77706A',fontSize:13}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              設定
            </button>
            {showSettings && (
              <>
                <div style={{position:'fixed',inset:0,zIndex:98}} onClick={()=>setShowSettings(false)}/>
                <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',background:'#fff',border:'1px solid #F0D9C9',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',minWidth:180,zIndex:99,overflow:'hidden'}}>
                  {profile.login_provider !== 'google' && (
                    <button onClick={()=>{setShowSettings(false);setShowEmailModal(true)}}
                      style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #FFF1E6',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                      メールアドレスを変更
                    </button>
                  )}
                  {profile.login_provider !== 'google' && (
                    <button onClick={()=>{setShowSettings(false);setShowPwModal(true)}}
                      style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #FFF1E6',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      パスワードを変更
                    </button>
                  )}
                  <button onClick={()=>{setShowSettings(false);iconInputRef.current?.click()}}
                    style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #FFF1E6',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    アイコンを変更
                  </button>
                  <button onClick={()=>{setShowSettings(false);setEditingName(true)}}
                    style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #FFF1E6',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    名前を変更
                  </button>
                  <button onClick={()=>{setShowSettings(false);setShowBioModal(true)}}
                    style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #F0D9C9',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    自己紹介を編集
                  </button>
                  <button onClick={()=>{setShowSettings(false);setShowBdModal(true)}}
                    style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #FFF1E6',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    生年月日を設定
                  </button>
                  <button onClick={()=>{setShowSettings(false);handleSignOut()}} disabled={loading}
                    style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',borderBottom:'1px solid #F0D9C9',fontSize:13,color:'#2B211B',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    {loading ? '...' : 'ログアウト'}
                  </button>
                  <button onClick={()=>{setShowSettings(false);setShowWithdraw(true)}}
                    style={{width:'100%',padding:'11px 16px',textAlign:'left',background:'none',border:'none',fontSize:13,color:'#dc2626',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    退会する
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 生年月日未設定バナー：Googleログイン以外のみ表示 */}
        {!profile.birthdate && (
          <div style={{marginBottom:16}}>
            <div style={{background:'#FFF1E6',border:'1px solid #f5b080',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1,fontSize:13,color:'#2B211B',lineHeight:1.6}}>
                生年月日が登録されていません。登録するとR18コンテンツが閲覧できます（18歳以上の方のみ）。
              </div>
              <button onClick={()=>setShowBdModal(true)}
                style={{padding:'6px 14px',background:'#F26A21',color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>
                設定する
              </button>
            </div>
          </div>
        )}

        {/* 統計カード */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[
            {label:'公開作品',value:published.length,unit:'作品'},
            {label:'下書き',value:drafts.length,unit:'作品'},
            {label:'総投稿数',value:myNovels.length,unit:'作品'},
          ].map(item=>(
            <div key={item.label} style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,padding:'16px 20px',textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:700,color:'#111111',marginBottom:2}}>{item.value}<span style={{fontSize:13,fontWeight:400,color:'#111111'}}>{item.unit}</span></div>
              <div style={{fontSize:12,color:'#77706A'}}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* 投稿作品リスト */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
            <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>投稿作品（{myNovels.length}）</span>
            <Link href="/post" style={{background:'#F26A21',color:'#fff',fontSize:12,fontWeight:700,padding:'6px 16px',borderRadius:16,textDecoration:'none'}}>＋ 新しく投稿する</Link>
          </div>
          {myNovels.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px 0',color:'#77706A'}}>
                <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>まだ投稿作品がありません</div>
              <div style={{fontSize:12,marginBottom:20}}>あなたの物語を世界に届けましょう</div>
              <Link href="/post" style={{background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,padding:'10px 24px',borderRadius:20,display:'inline-block',textDecoration:'none'}}>最初の作品を投稿する</Link>
            </div>
          ) : myNovels.map((novel, i) => (
            <div key={novel.id} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 20px',borderBottom:i<myNovels.length-1?'1px solid #FFF1E6':'none',cursor:'pointer'}}
              onClick={()=>router.push(`/novel/${novel.id}`)}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #F0D9C9',padding:'1px 7px',borderRadius:4}}>{novel.genre}</span>
                  <span style={{fontSize:10,background:novel.published?'#e8f5e9':'#f5f5f5',color:novel.published?'#2e7d32':'#757575',border:`1px solid ${novel.published?'#a5d6a7':'#e0e0e0'}`,padding:'1px 7px',borderRadius:4}}>
                    {novel.published ? '公開中' : '下書き'}
                  </span>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'#2B211B',marginBottom:2}}>{novel.title}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <Link href={`/post?edit=${novel.id}`}
                  style={{fontSize:12,border:'1px solid #F0D9C9',padding:'5px 12px',borderRadius:8,color:'#77706A',background:'#fff',textDecoration:'none'}}>
                  編集
                </Link>
                <button onClick={()=>handleTogglePublish(novel.id, novel.published)}
                  style={{fontSize:12,border:`1px solid ${novel.published?'#F0D9C9':'#86efac'}`,padding:'5px 12px',borderRadius:8,
                    color:novel.published?'#77706A':'#15803d',background:'#fff',cursor:'pointer'}}>
                  {novel.published ? '非公開にする' : '公開する'}
                </button>
                <button onClick={async ()=>{
                    const { data: eps } = await supabase.from('episodes').select('id,title,ep_number').eq('novel_id',novel.id).order('ep_number',{ascending:true})
                    setDeleteTarget({id:novel.id,title:novel.title,episodes:eps||[]})
                    setDeleteMode(null); setDeleteEpId('')
                  }}
                  style={{fontSize:12,border:'1px solid #fca5a5',padding:'5px 12px',borderRadius:8,color:'#dc2626',background:'#fff',cursor:'pointer'}}>
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 保存済み作品 */}
        <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden',marginTop:12}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
            <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>保存済み作品（{bookmarkedNovels.length}）</span>
          </div>
          {bookmarkedNovels.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px',color:'#77706A',fontSize:13}}>
              保存した作品がまだありません
            </div>
          ) : bookmarkedNovels.map((bm: any) => {
            const n = bm.novels
            if (!n) return null
            return (
              <div key={bm.novel_id} style={{display:'flex',alignItems:'center',gap:16,padding:'12px 20px',borderBottom:'1px solid #FFF1E6',cursor:'pointer'}}
                onClick={()=>router.push(`/novel/${n.id}`)}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:6,marginBottom:3,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,background:'#FFF1E6',color:'#F26A21',border:'1px solid #F0D9C9',padding:'1px 6px',borderRadius:4}}>{n.genre}</span>
                    {n.novel_type && <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:4}}>{n.novel_type}</span>}
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>{n.title}</div>
                  <div style={{fontSize:11,color:'#77706A'}}>{(n.profiles as any)?.display_name}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* コンテスト応募 */}
        <ContestEntry
          novels={myNovels}
          contests={contests}
          initialEntries={initialEntries}
          userId={profile.user_id}
        />

        {/* フォロー中の作者 */}
        {followingAuthors.length > 0 && (
          <div style={{marginTop:12}}>
            <div style={{background:'#fff',border:'1px solid #F0D9C9',borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:15,fontWeight:700,color:'#2B211B'}}>フォロー中の作者（{followingAuthors.length}）</span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:12,padding:'16px 20px'}}>
                {followingAuthors.map((a: any) => (
                  <a key={a.user_id} href={`/author/${a.user_id}`}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'#FFF9F2',border:'1px solid #F0D9C9',borderRadius:24,textDecoration:'none'}}>
                    {a.icon_url
                      ? <img src={a.icon_url} style={{width:24,height:24,borderRadius:'50%',objectFit:'cover'}} alt=""/>
                      : <div style={{width:24,height:24,borderRadius:'50%',background:'#F0D9C9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#F26A21',fontWeight:700}}>{a.display_name?.[0]}</div>
                    }
                    <span style={{fontSize:13,color:'#2B211B',fontWeight:500}}>{a.display_name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* メール変更モーダル */}
      {showEmailModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px',maxWidth:420,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:16}}>メールアドレスを変更</div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>新しいメールアドレス</label>
              <input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setEmailError('')}}
                placeholder="new@example.com"
                style={{width:'100%',padding:'10px 14px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>現在のパスワード（確認）</label>
              <input type="password" value={emailPw} onChange={e=>{setEmailPw(e.target.value);setEmailError('')}}
                placeholder="パスワード"
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${emailError?'#dc2626':'#F0D9C9'}`,borderRadius:8,fontSize:13,outline:'none'}}/>
            </div>
            {emailError && <div style={{fontSize:11,color:'#dc2626',marginBottom:12}}>{emailError}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowEmailModal(false);setNewEmail('');setEmailPw('');setEmailError('')}}
                style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleEmailChange} disabled={emailSaving}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:emailSaving?0.6:1}}>
                {emailSaving?'送信中...':'変更する'}</button>
            </div>
          </div>
        </div>
      )}

      {/* パスワード変更モーダル */}
      {showPwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px',maxWidth:420,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:16}}>パスワードを変更</div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>現在のパスワード</label>
              <input type="password" value={currentPw} onChange={e=>{setCurrentPw(e.target.value);setPwError('')}}
                style={{width:'100%',padding:'10px 14px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none'}}/>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>新しいパスワード（6文字以上）</label>
              <input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwError('')}}
                style={{width:'100%',padding:'10px 14px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,color:'#77706A',fontWeight:600,display:'block',marginBottom:4}}>新しいパスワード（確認）</label>
              <input type="password" value={newPwConfirm} onChange={e=>{setNewPwConfirm(e.target.value);setPwError('')}}
                style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${pwError?'#dc2626':'#F0D9C9'}`,borderRadius:8,fontSize:13,outline:'none'}}/>
            </div>
            {pwError && <div style={{fontSize:11,color:'#dc2626',marginBottom:12}}>{pwError}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowPwModal(false);setCurrentPw('');setNewPw('');setNewPwConfirm('');setPwError('')}}
                style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handlePwChange} disabled={pwSaving}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:pwSaving?0.6:1}}>
                {pwSaving?'変更中...':'変更する'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 生年月日設定モーダル */}
      {showBdModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px',maxWidth:380,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:16}}>生年月日を設定</div>
            <p style={{fontSize:12,color:'#77706A',lineHeight:1.8,marginBottom:16}}>
              18歳以上の方はR18コンテンツを閲覧できます。<br/>13歳未満の方はご利用いただけません。
            </p>
            <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
              <select value={bdYear} onChange={e=>setBdYear(e.target.value)}
                style={{flex:2,padding:'8px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13}}>
                <option value="">年</option>
                {Array.from({length:100},(_,i)=>new Date().getFullYear()-i-5).map(y=>
                  <option key={y} value={y}>{y}年</option>
                )}
              </select>
              <select value={bdMonth} onChange={e=>setBdMonth(e.target.value)}
                style={{flex:1,padding:'8px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13}}>
                <option value="">月</option>
                {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}
              </select>
              <select value={bdDay} onChange={e=>setBdDay(e.target.value)}
                style={{flex:1,padding:'8px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13}}>
                <option value="">日</option>
                {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}日</option>)}
              </select>
            </div>
            {bdError && <div style={{fontSize:11,color:'#dc2626',marginBottom:12}}>{bdError}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowBdModal(false);setBdError('')}}
                style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleSaveBirthdate} disabled={bdSaving}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:bdSaving?0.6:1}}>
                {bdSaving?'保存中…':'設定する'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 自己紹介編集モーダル */}
      {showBioModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px',maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#2B211B',marginBottom:16}}>自己紹介を編集</div>
            <textarea
              value={bioInput}
              onChange={e=>setBioInput(e.target.value)}
              rows={6}
              maxLength={300}
              placeholder="自己紹介を入力してください（300文字以内）"
              style={{width:'100%',padding:'10px 14px',border:'1.5px solid #F0D9C9',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',lineHeight:1.8}}
            />
            <div style={{fontSize:11,color:'#B8AEA8',textAlign:'right',marginBottom:16}}>{bioInput.length}/300</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowBioModal(false);setBioInput(profile.bio||'')}}
                style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleSaveBio} disabled={bioSaving}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#F26A21',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:bioSaving?0.6:1}}>
                {bioSaving?'保存中...':'保存する'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 退会確認モーダル */}
      {showWithdraw && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'32px',maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:18,fontWeight:700,color:'#dc2626',marginBottom:16}}>⚠️ 退会の確認</div>
            <div style={{fontSize:13,color:'#2B211B',lineHeight:1.8,marginBottom:16,background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 16px'}}>
              <strong>退会前に必ずご確認ください</strong><br/>
              ・メールアドレス・プロフィール情報は自動的に削除されます<br/>
              ・<strong>投稿した作品は削除されません</strong>。退会前にご自身で削除してください<br/>
              ・いいね・コメント・閲覧履歴などの活動データは残ります<br/>
              ・退会後は同じメールアドレスで再登録できます<br/>
              ・この操作は取り消せません
            </div>
            <div style={{fontSize:13,color:'#77706A',marginBottom:8}}>
              {profile.login_provider === 'google'
                ? '確認のため「退会」と入力してください'
                : '確認のためパスワードを入力してください'
              }
            </div>
            <input
              type={profile.login_provider === 'google' ? 'text' : 'password'}
              value={withdrawPw}
              onChange={e=>{setWithdrawPw(e.target.value);setWithdrawError('')}}
              placeholder={profile.login_provider === 'google' ? '退会' : 'パスワード'}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${withdrawError?'#dc2626':'#F0D9C9'}`,borderRadius:8,fontSize:13,marginBottom:4,outline:'none'}}/>
            {withdrawError && <div style={{fontSize:11,color:'#dc2626',marginBottom:12}}>{withdrawError}</div>}
            {!withdrawError && <div style={{marginBottom:12}}/>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowWithdraw(false);setWithdrawPw('');setWithdrawError('')}}
                style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleWithdraw} disabled={!withdrawPw||withdrawing}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,
                  background:withdrawPw?'#dc2626':'#f5f5f5',color:withdrawPw?'#fff':'#B8AEA8',
                  fontSize:13,fontWeight:700,cursor:withdrawPw?'pointer':'not-allowed'}}>
                {withdrawing ? '処理中...' : '退会する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px',maxWidth:460,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#dc2626',marginBottom:16}}>削除の確認</div>
            {!deleteMode && (
              <>
                <p style={{fontSize:13,color:'#2B211B',marginBottom:16,lineHeight:1.8}}>「<strong>{deleteTarget.title}</strong>」の削除方法を選んでください</p>
                <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                  <button onClick={()=>setDeleteMode('episode')}
                    style={{padding:'14px 16px',border:'1.5px solid #F0D9C9',borderRadius:10,background:'#FFF9F2',cursor:'pointer',textAlign:'left'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#2B211B',marginBottom:2}}>特定の話を削除する</div>
                    <div style={{fontSize:11,color:'#77706A'}}>選んだ話だけ削除します。作品は残ります。</div>
                  </button>
                  <button onClick={()=>setDeleteMode('novel')}
                    style={{padding:'14px 16px',border:'1.5px solid #fca5a5',borderRadius:10,background:'#fef2f2',cursor:'pointer',textAlign:'left'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#dc2626',marginBottom:2}}>作品全体を削除する</div>
                    <div style={{fontSize:11,color:'#B8AEA8'}}>すべての話・コメント・いいねが削除されます。取り消せません。</div>
                  </button>
                </div>
                <button onClick={()=>setDeleteTarget(null)}
                  style={{width:'100%',padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              </>
            )}
            {deleteMode === 'episode' && !deleteEpId && (
              <>
                <p style={{fontSize:13,color:'#2B211B',marginBottom:12}}>削除する話を選んでください</p>
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:240,overflowY:'auto',marginBottom:16}}>
                  {deleteTarget.episodes.length === 0
                    ? <div style={{fontSize:12,color:'#B8AEA8',textAlign:'center',padding:16}}>話がありません</div>
                    : deleteTarget.episodes.map(ep => (
                      <button key={ep.id} onClick={()=>setDeleteEpId(ep.id)}
                        style={{padding:'10px 14px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',cursor:'pointer',textAlign:'left',fontSize:13,color:'#2B211B'}}>
                        {ep.title}
                      </button>
                    ))
                  }
                </div>
                <button onClick={()=>setDeleteMode(null)}
                  style={{width:'100%',padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>戻る</button>
              </>
            )}
            {deleteMode === 'episode' && deleteEpId && (
              <>
                <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13,color:'#dc2626',lineHeight:1.7}}>
                  「<strong>{deleteTarget.episodes.find(e=>e.id===deleteEpId)?.title}</strong>」を削除します。<br/>この操作は取り消せません。
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={()=>setDeleteEpId('')}
                    style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>戻る</button>
                  <button onClick={handleDeleteConfirm} disabled={deleteLoading}
                    style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:deleteLoading?0.6:1}}>
                    {deleteLoading?'削除中…':'削除する'}</button>
                </div>
              </>
            )}
            {deleteMode === 'novel' && (
              <>
                <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13,color:'#dc2626',lineHeight:1.7}}>
                  「<strong>{deleteTarget.title}</strong>」を完全に削除します。<br/>すべての話・コメント・いいねが削除されます。<br/>この操作は取り消せません。
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={()=>setDeleteMode(null)}
                    style={{flex:1,padding:'10px',border:'1px solid #F0D9C9',borderRadius:8,background:'#fff',color:'#77706A',fontSize:13,cursor:'pointer'}}>戻る</button>
                  <button onClick={handleDeleteConfirm} disabled={deleteLoading}
                    style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',opacity:deleteLoading?0.6:1}}>
                    {deleteLoading?'削除中…':'完全に削除する'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{position:'fixed',bottom:24,right:24,background:'#F26A21',color:'#fff',padding:'12px 20px',borderRadius:12,fontSize:13,fontWeight:600,zIndex:999}}>
          {toast}
        </div>
      )}

      <AdBanner />
      <Footer user={true} />
    </div>
  )
}
