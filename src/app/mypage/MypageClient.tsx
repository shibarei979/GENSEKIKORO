'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdBanner from '@/components/layout/AdBanner'
import type { Profile, Novel } from '@/types'
import ContestEntry from './ContestEntry'
import TweetSection from '@/components/TweetSection'
import StoryBoard from '@/components/StoryBoard'
import ChapterEditModal from './ChapterEditModal'

interface Contest { id: string; title: string; deadline: string | null; is_site_contest: boolean }
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
  claimedMissionIds?: string[]
  historyItems?: any[]
  firstEpMap?: Record<string,string>
  charCountMap?: Record<string,number>
  likeMap?: Record<string,number>
}

const ALL_BADGES = [
  { id:'like_3',      name:'応援バッジ',              category:'読者', color:'var(--color-brand)' },
  { id:'like_10',     name:'読者バッジ Lv.1',          category:'読者', color:'var(--color-brand)' },
  { id:'like_50',     name:'読者バッジ Lv.2',          category:'読者', color:'var(--color-brand)' },
  { id:'bookmark_5',  name:'保存家バッジ',              category:'読者', color:'var(--color-brand)' },
  { id:'comment_1',   name:'コメンテーターバッジ Lv.1', category:'読者', color:'var(--color-brand)' },
  { id:'comment_10',  name:'コメンテーターバッジ Lv.2', category:'読者', color:'var(--color-brand)' },
  { id:'discover_1',  name:'拡散者バッジ Lv.1',        category:'拡散', color:'#22c55e' },
  { id:'discover_3',  name:'拡散者バッジ Lv.2',        category:'拡散', color:'#22c55e' },
  { id:'discover_10', name:'拡散者バッジ Lv.3',        category:'拡散', color:'#22c55e' },
  { id:'novel_1',     name:'作家バッジ Lv.1',          category:'作者', color:'#3b82f6' },
  { id:'novel_3',     name:'作家バッジ Lv.2',          category:'作者', color:'#3b82f6' },
  { id:'episode_5',   name:'連載バッジ',               category:'作者', color:'#3b82f6' },
  { id:'episode_20',  name:'長編バッジ',               category:'作者', color:'#3b82f6' },
  { id:'follow_1',    name:'ファンバッジ Lv.1',         category:'フォロー', color:'#8b5cf6' },
  { id:'follow_5',    name:'ファンバッジ Lv.2',         category:'フォロー', color:'#8b5cf6' },
  { id:'quest_june_2026', name:'スタートダッシュバッジ', category:'期間限定', color:'#e11d48' },
  { id:'login_1',     name:'ログインバッジ Lv.1',       category:'ログイン', color:'#94a3b8' },
  { id:'login_3',     name:'ログインバッジ Lv.2',       category:'ログイン', color:'#94a3b8' },
  { id:'login_7',     name:'ログインバッジ Lv.3',       category:'ログイン', color:'#94a3b8' },
  { id:'login_30',    name:'ログインバッジ Lv.4',       category:'ログイン', color:'#94a3b8' },
  { id:'newbie',      name:'新人バッジ',               category:'特別', color:'#f59e0b' },
  { id:'push_badge',  name:'推しバッジ',               category:'特別', color:'#f59e0b' },
  { id:'_slot1',      name:'？？？',                  category:'未実装', color:'#94a3b8' },
  { id:'_slot2',      name:'？？？',                  category:'未実装', color:'#94a3b8' },
]

type Tab = 'mypage' | 'works' | 'bookmarks' | 'history' | 'tweet' | 'mission' | 'contest' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'mypage',    label: 'マイページ' },
  { id: 'works',     label: '作品管理' },
  { id: 'bookmarks', label: '保存済み' },
  { id: 'history',   label: '閲覧履歴' },
  { id: 'tweet',     label: 'つぶやき' },
  { id: 'mission',   label: 'ミッション' },
  { id: 'contest',   label: 'コンテスト' },
  { id: 'settings',  label: '設定' },
]

export default function MypageClient({
  profile, novels: initialNovels, bookmarkedNovels,
  followingAuthors=[], followerCount=0, followingCount=0,
  contests=[], initialEntries=[], claimedMissionIds=[],
  historyItems=[], firstEpMap={}, charCountMap={}, likeMap={},
}: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [activeTab,     setActiveTab]     = useState<Tab>('mypage')
  const [myNovels,      setMyNovels]      = useState(initialNovels)
  const [deleteTarget,  setDeleteTarget]  = useState<{id:string;title:string;episodes:any[]} | null>(null)
  const [deleteMode,    setDeleteMode]    = useState<'novel'|'episode'|null>(null)
  const [deleteEpId,    setDeleteEpId]    = useState<string>('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [iconUrl,       setIconUrl]       = useState<string>(profile.icon_url || '')
  const [iconUploading, setIconUploading] = useState(false)
  const iconInputRef = React.useRef<HTMLInputElement>(null)
  const [editingName,   setEditingName]   = useState(false)
  const [nameInput,     setNameInput]     = useState(profile.display_name)
  const [nameSaving,    setNameSaving]    = useState(false)
  const [nameError,     setNameError]     = useState('')
  const [nameSaved,     setNameSaved]     = useState(false)
  const [toast,         setToast]         = useState('')
  const [showWithdraw,  setShowWithdraw]  = useState(false)
  const [withdrawPw,    setWithdrawPw]    = useState('')
  const [withdrawing,   setWithdrawing]   = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [showBdModal,   setShowBdModal]   = useState(false)
  const [bdYear,        setBdYear]        = useState('')
  const [bdMonth,       setBdMonth]       = useState('')
  const [bdDay,         setBdDay]         = useState('')
  const [bdError,       setBdError]       = useState('')
  const [bdSaving,      setBdSaving]      = useState(false)
  const [showEmailModal,setShowEmailModal] = useState(false)
  const [showPwModal,   setShowPwModal]   = useState(false)
  const [showBioModal,  setShowBioModal]  = useState(false)
  const [bioInput,      setBioInput]      = useState(profile.bio || '')
  const [bioSaving,     setBioSaving]     = useState(false)
  const [newEmail,      setNewEmail]      = useState('')
  const [emailPw,       setEmailPw]       = useState('')
  const [emailError,    setEmailError]    = useState('')
  const [emailSaving,   setEmailSaving]   = useState(false)
  const [currentPw,     setCurrentPw]     = useState('')
  const [newPw,         setNewPw]         = useState('')
  const [newPwConfirm,  setNewPwConfirm]  = useState('')
  const [pwError,       setPwError]       = useState('')
  const [pwSaving,      setPwSaving]      = useState(false)
  const [isMobile,      setIsMobile]      = useState(false)
  const [showBadgeBook, setShowBadgeBook] = useState(false)
  const [badgePage,     setBadgePage]     = useState(0)
  const [showBoard,     setShowBoard]     = useState(false)
  const [chapterTarget, setChapterTarget] = useState<{id:string;title:string}|null>(null)
  // S9: 話の公開管理
  const [epManageTarget, setEpManageTarget] = useState<{id:string;title:string}|null>(null)
  const [epList,         setEpList]         = useState<any[]>([])
  const [epToggling,     setEpToggling]     = useState<string>('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const perPage    = isMobile ? 12 : 24
  const totalPages = Math.ceil(ALL_BADGES.length / perPage)
  const claimedSet = new Set(claimedMissionIds)

  async function handleSaveBio() {
    setBioSaving(true)
    await supabase.from('profiles').update({ bio: bioInput.trim() || null }).eq('user_id', profile.user_id)
    setBioSaving(false); setShowBioModal(false)
    setToast('自己紹介を保存しました'); setTimeout(() => setToast(''), 2000)
  }

  async function handleIconUpload(file: File) {
    if (!file.type.startsWith('image/')) return
    setIconUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.user_id}.${ext}`
    const { error: upErr } = await supabase.storage.from('illustrations').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data } = supabase.storage.from('illustrations').getPublicUrl(path)
      await supabase.from('profiles').update({ icon_url: data.publicUrl }).eq('user_id', profile.user_id)
      setIconUrl(data.publicUrl)
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
    setEditingName(false); setNameSaved(true); setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleSignOut() {
    setLoading(true); await supabase.auth.signOut(); window.location.href = '/'
  }

  const initial    = profile.display_name.slice(0, 1)
  const published  = myNovels.filter(n => n.published)
  const drafts     = myNovels.filter(n => !n.published)
  const userNumber = (profile as any).user_number
    ? '#' + String((profile as any).user_number).padStart(4, '0') : null

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
    setEmailSaving(false); setShowEmailModal(false); setNewEmail(''); setEmailPw('')
    setToast('確認メールを送信しました。メールをご確認ください。'); setTimeout(() => setToast(''), 4000)
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
    setPwSaving(false); setShowPwModal(false); setCurrentPw(''); setNewPw(''); setNewPwConfirm('')
    setToast('パスワードを変更しました'); setTimeout(() => setToast(''), 3000)
  }

  async function handleTogglePublish(novelId: string, current: boolean) {
    await supabase.from('novels').update({ published: !current }).eq('id', novelId)
    setMyNovels(prev => prev.map(n => n.id === novelId ? { ...n, published: !current } : n))
    setToast(current ? '非公開にしました' : '公開しました'); setTimeout(() => setToast(''), 2000)
  }

  // S9: 話の公開切り替え
  async function handleOpenEpManage(novel: Novel) {
    setEpManageTarget({ id: novel.id, title: novel.title })
    const { data: eps } = await supabase
      .from('episodes')
      .select('id, title, ep_number, published')
      .eq('novel_id', novel.id)
      .order('ep_number', { ascending: true })
    setEpList(eps || [])
  }

  async function handleToggleEpPublish(epId: string, current: boolean) {
    setEpToggling(epId)
    await supabase.from('episodes').update({ published: !current }).eq('id', epId)
    setEpList(prev => prev.map(e => e.id === epId ? { ...e, published: !current } : e))
    setToast(current ? '話を非公開にしました' : '話を公開しました')
    setTimeout(() => setToast(''), 2000)
    setEpToggling('')
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
    setDeleteLoading(false); setDeleteTarget(null); setDeleteMode(null); setDeleteEpId('')
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
    window.location.href = window.location.pathname
  }

  async function handleWithdraw() {
    setWithdrawError(''); setWithdrawing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setWithdrawError('ログイン情報が確認できません'); setWithdrawing(false); return }
      if (profile.login_provider !== 'google') {
        if (!withdrawPw) { setWithdrawError('パスワードを入力してください'); setWithdrawing(false); return }
        if (!user.email) { setWithdrawError('ログイン情報が確認できません'); setWithdrawing(false); return }
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: withdrawPw })
        if (signInErr) { setWithdrawError('パスワードが正しくありません'); setWithdrawing(false); return }
      } else {
        if (withdrawPw !== '退会') { setWithdrawError('「退会」と入力してください'); setWithdrawing(false); return }
      }
      await supabase.from('profiles').update({ display_name: '退会済みユーザー', email: null, icon_url: null, bio: null }).eq('user_id', profile.user_id)
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e) {
      setToast('退会処理に失敗しました'); setWithdrawing(false)
    }
  }

  function fmtDate(s: string) {
    const d = new Date(s), now = new Date(), diff = now.getTime() - d.getTime()
    if (diff < 60*60*1000) return `${Math.floor(diff/60000)}分前`
    if (diff < 24*60*60*1000) return `${Math.floor(diff/3600000)}時間前`
    if (diff < 7*24*60*60*1000) return `${Math.floor(diff/86400000)}日前`
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
  }

  function fmtChars(n: number) {
    return n >= 10000 ? `${(n/10000).toFixed(1)}万文字` : `${n.toLocaleString()}文字`
  }

  const settingBtn = {
    width:'100%', padding:'13px 16px', textAlign:'left' as const,
    background:'none', border:'none', borderBottom:'1px solid var(--color-brand-border)',
    fontSize:13, color:'var(--color-text)', cursor:'pointer' as const,
    display:'flex', alignItems:'center' as const, gap:8,
  }

  // ===== プロフィールヘッダー（全タブ共通） =====
  const ProfileHeader = () => (
    <div style={{background:'var(--color-bg-card)',borderBottom:'1px solid var(--color-brand-border)',padding: isMobile ? '16px' : '20px 40px',marginBottom:0}}>
      <div style={{display:'flex',alignItems:'center',gap: isMobile ? 12 : 16}}>
        {/* アイコン */}
        <div style={{position:'relative',flexShrink:0,cursor:'pointer'}} onClick={()=>iconInputRef.current?.click()}>
          <input ref={iconInputRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e=>{const f=e.target.files?.[0];if(f){handleIconUpload(f);e.target.value=''}}}/>
          {iconUrl
            ? <img src={iconUrl} alt={profile.display_name} style={{width: isMobile ? 48 : 56,height: isMobile ? 48 : 56,borderRadius:'50%',objectFit:'cover',border:'3px solid var(--color-brand)'}}/>
            : <div style={{width: isMobile ? 48 : 56,height: isMobile ? 48 : 56,borderRadius:'50%',background:'var(--color-brand)',display:'flex',alignItems:'center',justifyContent:'center',fontSize: isMobile ? 18 : 22,fontWeight:700,color:'var(--color-bg-card)'}}>{initial}</div>
          }
          <div style={{position:'absolute',bottom:0,right:0,width:16,height:16,background:'var(--color-bg-card)',borderRadius:'50%',border:'2px solid var(--color-brand)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>
            {iconUploading ? '⟳' : '📷'}
          </div>
        </div>
        {/* 名前・番号のみ（統計はマイページタブに） */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
            <div style={{fontSize: isMobile ? 16 : 18,fontWeight:700,color:'var(--color-text)'}}>{nameInput}</div>
            {nameSaved && <span style={{fontSize:11,color:'var(--color-success)'}}>✓</span>}
          </div>
          {userNumber && <div style={{fontSize:11,color:'var(--color-text-faint)',letterSpacing:'.05em'}}>{userNumber}</div>}
        </div>
        {/* ボード・バッジ図鑑ボタン */}
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button onClick={()=>setShowBoard(true)}
            style={{border:'1px solid var(--color-brand-border)',borderRadius:8,padding:'6px 12px',background:'var(--color-bg-card)',cursor:'pointer',fontSize:12,color:'var(--color-text-muted)'}}>
            ボード
          </button>
          <button onClick={()=>{setShowBadgeBook(true);setBadgePage(0)}}
            style={{border:'1px solid var(--color-brand-border)',borderRadius:8,padding:'6px 12px',background:'var(--color-bg-card)',cursor:'pointer',fontSize:12,color:'var(--color-text-muted)'}}>
            バッジ図鑑
          </button>
        </div>
      </div>
    </div>
  )

  // ===== タブバー =====
  const TabBar = () => (
    <div style={{
      background:'var(--color-bg-card)',
      borderBottom:'1px solid var(--color-brand-border)',
      overflowX:'auto', scrollbarWidth:'none' as any,
      position:'sticky', top: isMobile ? 54 : 60, zIndex:10,
      marginBottom:0,
    }}>
      <div style={{display:'flex',minWidth:'max-content'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{
              padding: isMobile ? '10px 14px' : '12px 20px',
              fontSize: isMobile ? 12 : 13,
              fontWeight: activeTab===tab.id ? 700 : 400,
              color: activeTab===tab.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
              background:'none', border:'none', cursor:'pointer',
              borderBottom: activeTab===tab.id ? '2px solid var(--color-brand)' : '2px solid transparent',
              whiteSpace:'nowrap' as const,
              transition:'all .15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )

  // ===== マイページタブ =====
  const MypageTab = () => (
    <div style={{padding: isMobile ? '16px' : '0',display:'flex',flexDirection:'column',gap:16}}>
      {!profile.birthdate && (
        <div style={{background:'var(--color-brand-light)',border:'1px solid #f5b080',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1,fontSize:13,color:'var(--color-text)',lineHeight:1.6}}>
            生年月日が登録されていません。登録するとR18コンテンツが閲覧できます。
          </div>
          <button onClick={()=>setShowBdModal(true)}
            style={{padding:'6px 14px',background:'var(--color-brand)',color:'var(--color-bg-card)',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>
            設定する
          </button>
        </div>
      )}
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,padding:'20px 24px'}}>
        {/* 名前・統計 */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--color-text)',marginBottom:4}}>{nameInput}</div>
          {userNumber && <div style={{fontSize:11,color:'var(--color-text-faint)',marginBottom:10}}>{userNumber}</div>}
          <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
            <span style={{fontSize:13,color:'var(--color-text-muted)'}}><strong style={{color:'var(--color-text)'}}>{followerCount}</strong> フォロワー</span>
            <span style={{fontSize:13,color:'var(--color-text-muted)'}}><strong style={{color:'var(--color-text)'}}>{followingCount}</strong> フォロー中</span>
            <span style={{fontSize:13,color:'var(--color-brand)'}}><strong>{published.length}</strong> 公開作品</span>
          </div>
        </div>
        {/* 区切り線 */}
        <div style={{height:1,background:'var(--color-brand-border)',margin:'0 0 16px'}}/>
        {/* プロフィール情報 */}
        <div style={{fontSize:13,color:'var(--color-text-muted)',marginBottom:4}}>{profile.email}</div>
        {profile.bio && <div style={{fontSize:13,color:'var(--color-text)',lineHeight:1.7,marginTop:8,marginBottom:4}}>{profile.bio}</div>}
        {/* 区切り線 */}
        <div style={{height:1,background:'var(--color-brand-border)',margin:'16px 0'}}/>
        {/* 操作ボタン */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>setEditingName(true)}
            style={{fontSize:12,border:'1px solid var(--color-brand-border)',padding:'6px 14px',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'}}>
            名前を変更
          </button>
          <button onClick={()=>setShowBioModal(true)}
            style={{fontSize:12,border:'1px solid var(--color-brand-border)',padding:'6px 14px',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'}}>
            自己紹介を編集
          </button>
        </div>
        {editingName && (
          <div style={{marginTop:12,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')handleSaveName();if(e.key==='Escape')setEditingName(false)}}
              style={{fontSize:14,fontWeight:700,border:'1.5px solid var(--color-brand)',borderRadius:6,padding:'4px 10px',outline:'none',width:160}} autoFocus/>
            <button onClick={handleSaveName} disabled={nameSaving}
              style={{fontSize:12,background:'var(--color-brand)',color:'var(--color-bg-card)',border:'none',borderRadius:6,padding:'5px 12px',cursor:'pointer'}}>
              {nameSaving ? '保存中' : '保存'}
            </button>
            <button onClick={()=>{setEditingName(false);setNameInput(profile.display_name);setNameError('')}}
              style={{fontSize:12,background:'none',color:'var(--color-text-muted)',border:'1px solid var(--color-brand-border)',borderRadius:6,padding:'5px 10px',cursor:'pointer'}}>×</button>
            {nameError && <span style={{fontSize:11,color:'var(--color-danger)'}}>{nameError}</span>}
          </div>
        )}
      </div>
      {followingAuthors.length > 0 && (
        <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
            <span style={{fontSize:13,fontWeight:700,color:'var(--color-text)'}}>フォロー中の作者（{followingAuthors.length}）</span>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'14px 16px'}}>
            {followingAuthors.map((a:any) => (
              <a key={a.user_id} href={`/author/${a.user_id}`}
                style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'var(--color-bg)',border:'1px solid var(--color-brand-border)',borderRadius:20,textDecoration:'none'}}>
                {a.icon_url
                  ? <img src={a.icon_url} style={{width:20,height:20,borderRadius:'50%',objectFit:'cover'}} alt=""/>
                  : <div style={{width:20,height:20,borderRadius:'50%',background:'var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'var(--color-brand)',fontWeight:700}}>{a.display_name?.[0]}</div>
                }
                <span style={{fontSize:12,color:'var(--color-text)'}}>{a.display_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ===== 作品管理タブ =====
  const WorksTab = () => (
    <div style={{padding: isMobile ? '16px' : '0',display:'flex',flexDirection:'column',gap:0}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--color-bg)'}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>投稿作品（{myNovels.length}）</span>
          <Link href="/post" style={{background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:12,fontWeight:700,padding:'6px 16px',borderRadius:16,textDecoration:'none'}}>＋ 新しく投稿する</Link>
        </div>
        {myNovels.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--color-text-muted)'}}>
            <div style={{fontSize:14,marginBottom:6}}>まだ投稿作品がありません</div>
            <Link href="/post" style={{background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,padding:'10px 24px',borderRadius:20,display:'inline-block',textDecoration:'none',marginTop:12}}>最初の作品を投稿する</Link>
          </div>
        ) : myNovels.map((novel, i) => (
          <div key={novel.id} style={{padding:'14px 16px',borderBottom:i<myNovels.length-1?'1px solid var(--color-brand-light)':'none'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,cursor:'pointer'}}
              onClick={()=>router.push(`/novel/${novel.id}`)}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-brand-border)',padding:'1px 7px',borderRadius:4}}>{novel.genre}</span>
                  <span style={{fontSize:10,background:novel.published?'#e8f5e9':'#f5f5f5',color:novel.published?'var(--color-success)':'#757575',border:`1px solid ${novel.published?'#a5d6a7':'#e0e0e0'}`,padding:'1px 7px',borderRadius:4}}>
                    {novel.published ? '公開中' : '下書き'}
                  </span>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>{novel.title}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
              <Link href={`/post?edit=${novel.id}`}
                style={{fontSize:12,border:'1px solid var(--color-brand-border)',padding:'5px 10px',borderRadius:8,color:'var(--color-text-muted)',background:'var(--color-bg-card)',textDecoration:'none'}}>
                編集
              </Link>
              <button onClick={()=>setChapterTarget({id:novel.id,title:novel.title})}
                style={{fontSize:12,border:'1px solid #bfdbfe',padding:'5px 10px',borderRadius:8,color:'#2563eb',background:'#eff6ff',cursor:'pointer'}}>
                章を編集
              </button>
              {/* S9: 話の公開管理ボタン */}
              <button onClick={()=>handleOpenEpManage(novel)}
                style={{fontSize:12,border:'1px solid #d1fae5',padding:'5px 10px',borderRadius:8,color:'#059669',background:'#ecfdf5',cursor:'pointer'}}>
                話の公開管理
              </button>
              <button onClick={()=>handleTogglePublish(novel.id, novel.published)}
                style={{fontSize:12,border:`1px solid ${novel.published?'var(--color-brand-border)':'#86efac'}`,padding:'5px 10px',borderRadius:8,color:novel.published?'var(--color-text-muted)':'#15803d',background:'var(--color-bg-card)',cursor:'pointer'}}>
                {novel.published ? '非公開にする' : '公開する'}
              </button>
              <button onClick={async()=>{
                  const{data:eps}=await supabase.from('episodes').select('id,title,ep_number').eq('novel_id',novel.id).order('ep_number',{ascending:true})
                  setDeleteTarget({id:novel.id,title:novel.title,episodes:eps||[]});setDeleteMode(null);setDeleteEpId('')
                }} style={{fontSize:12,border:'1px solid #fca5a5',padding:'5px 10px',borderRadius:8,color:'var(--color-danger)',background:'var(--color-bg-card)',cursor:'pointer'}}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ===== 保存済みタブ =====
  const BookmarksTab = () => (
    <div style={{padding: isMobile ? '16px' : '0'}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>保存済み作品（{bookmarkedNovels.length}）</span>
        </div>
        {bookmarkedNovels.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--color-text-muted)',fontSize:13}}>保存した作品がありません</div>
        ) : bookmarkedNovels.map((bm:any) => {
          const n = bm.novels; if (!n) return null
          return (
            <div key={bm.novel_id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid var(--color-brand-light)',cursor:'pointer'}}
              onClick={()=>router.push(`/novel/${n.id}`)}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:5,marginBottom:2,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-brand-border)',padding:'1px 6px',borderRadius:4}}>{n.genre}</span>
                  {n.novel_type && <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',border:'1px solid #bfdbfe',padding:'1px 6px',borderRadius:4}}>{n.novel_type}</span>}
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>{n.title}</div>
                <div style={{fontSize:11,color:'var(--color-text-muted)'}}>{(n.profiles as any)?.display_name}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ===== 閲覧履歴タブ =====
  const HistoryTab = () => (
    <div style={{padding: isMobile ? '16px' : '0'}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>閲覧履歴（最大200件）</span>
        </div>
        {historyItems.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--color-text-muted)',fontSize:13}}>まだ閲覧履歴がありません</div>
        ) : historyItems.map((item:any) => (
          <div key={item.novelId} style={{padding:'14px 16px',borderBottom:'1px solid var(--color-brand-light)'}}>
            <div style={{display:'flex',gap:5,marginBottom:5,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:10,background:'var(--color-brand-light)',color:'var(--color-brand)',border:'1px solid var(--color-tag-border)',padding:'1px 6px',borderRadius:3}}>{item.genre}</span>
              {item.novelType && <span style={{fontSize:10,background:'var(--color-info-bg)',color:'var(--color-info)',border:'1px solid var(--color-info-border)',padding:'1px 6px',borderRadius:3}}>{item.novelType}</span>}
              {item.isSerial
                ? <span style={{fontSize:10,background:'#f0fdf4',color:'#15803d',border:'1px solid #86efac',padding:'1px 6px',borderRadius:3}}>連載中</span>
                : <span style={{fontSize:10,background:'#f5f5f5',color:'#757575',border:'1px solid #e0e0e0',padding:'1px 6px',borderRadius:3}}>完結</span>}
            </div>
            <a href={`/novel/${item.novelId}`} className="history-title" style={{textDecoration:'none',color:'var(--color-text)',display:'block',marginBottom:2}}>
              <div style={{fontSize:15,fontWeight:700,color:'var(--color-text)',lineHeight:1.4}}>{item.novelTitle}</div>
            </a>
            <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:5}}>作者：{item.displayName}</div>
            {item.summary && (
              <div style={{fontSize:12,color:'#5a3a20',lineHeight:1.7,marginBottom:6,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any}}>
                {item.summary}
              </div>
            )}
            {item.tags.length > 0 && (
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:6}}>
                {item.tags.slice(0,4).map((t:string) => (
                  <span key={t} style={{fontSize:10,background:'var(--color-bg)',color:'var(--color-text-muted)',border:'1px solid var(--color-brand-border)',padding:'1px 6px',borderRadius:3}}>#{t}</span>
                ))}
              </div>
            )}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',gap:10,fontSize:11,color:'var(--color-text-faint)',flexWrap:'wrap'}}>
                {charCountMap[item.novelId] > 0 && <span>{fmtChars(charCountMap[item.novelId])}</span>}
                <span>{fmtDate(item.viewedAt)}</span>
                {likeMap[item.novelId] > 0 && <span>♡ {likeMap[item.novelId]}</span>}
              </div>
              <div style={{display:'flex',gap:6}}>
                {firstEpMap[item.novelId] && firstEpMap[item.novelId] !== item.epId && (
                  <Link href={`/novel/${item.novelId}/episode/${firstEpMap[item.novelId]}`}
                    style={{display:'inline-block',padding:'5px 12px',background:'var(--color-brand)',color:'var(--color-bg-card)',borderRadius:12,fontSize:11,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>
                    最初から読む
                  </Link>
                )}
                <Link href={`/novel/${item.novelId}/episode/${item.epId}`}
                  style={{display:'inline-block',padding:'5px 12px',background:'var(--color-brand)',color:'var(--color-bg-card)',borderRadius:12,fontSize:11,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>
                  続きを読む
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ===== つぶやきタブ =====
  const TweetTab = () => (
    <div style={{padding: isMobile ? '16px' : '0'}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>つぶやき</span>
        </div>
        <div style={{padding:'14px 16px'}}>
          <TweetSection authorId={profile.user_id} currentUserId={profile.user_id} currentUserName={profile.display_name} currentUserIconUrl={profile.icon_url||null} isOwner={true}/>
        </div>
      </div>
    </div>
  )

  // ===== ミッションタブ =====
  const MissionTab = () => (
    <div style={{padding: isMobile ? '16px' : '0'}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>ミッション・バッジ</span>
          <button onClick={()=>{setShowBadgeBook(true);setBadgePage(0)}}
            style={{fontSize:12,border:'1px solid var(--color-brand-border)',padding:'5px 12px',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',cursor:'pointer'}}>
            バッジ図鑑を見る
          </button>
        </div>
        <div style={{padding:'16px',textAlign:'center',color:'var(--color-text-muted)',fontSize:13}}>
          <Link href="/mission" style={{color:'var(--color-brand)',textDecoration:'none',fontWeight:600}}>ミッションページへ →</Link>
        </div>
      </div>
    </div>
  )

  // ===== コンテストタブ =====
  const ContestTab = () => (
    <div style={{padding: isMobile ? '16px' : '0'}}>
      <ContestEntry novels={myNovels} contests={contests} initialEntries={initialEntries} userId={profile.user_id}/>
    </div>
  )

  // ===== 設定タブ =====
  const SettingsTab = () => (
    <div style={{padding: isMobile ? '16px' : '0',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{background:'var(--color-bg-card)',border:'1px solid var(--color-brand-border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--color-brand-border)',background:'var(--color-bg)'}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--color-text)'}}>アカウント設定</span>
        </div>
        {profile.login_provider !== 'google' && (
          <button onClick={()=>setShowEmailModal(true)} style={settingBtn}>メールアドレスを変更</button>
        )}
        {profile.login_provider !== 'google' && (
          <button onClick={()=>setShowPwModal(true)} style={settingBtn}>パスワードを変更</button>
        )}
        <button onClick={()=>iconInputRef.current?.click()} style={settingBtn}>アイコンを変更</button>
        <button onClick={()=>setShowBdModal(true)} style={settingBtn}>生年月日を設定</button>
        <button onClick={()=>handleSignOut()} disabled={loading}
          style={settingBtn}>{loading ? '...' : 'ログアウト'}</button>
        <button onClick={()=>setShowWithdraw(true)}
          style={{...settingBtn,color:'var(--color-danger)',borderBottom:'none'}}>退会する</button>
      </div>
    </div>
  )

  const tabContent: Record<Tab, React.ReactNode> = {
    mypage:    <MypageTab/>,
    works:     <WorksTab/>,
    bookmarks: <BookmarksTab/>,
    history:   <HistoryTab/>,
    tweet:     <TweetTab/>,
    mission:   <MissionTab/>,
    contest:   <ContestTab/>,
    settings:  <SettingsTab/>,
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--color-bg)'}}>
      <Header profile={profile} user={true} />

      <div style={{width:'100%',padding:'0'}}>
        <ProfileHeader/>

        {isMobile ? (
          // モバイル：横スクロールタブ
          <>
            <div style={{
              background:'var(--color-bg-card)',
              borderBottom:'1px solid var(--color-brand-border)',
              overflowX:'auto', scrollbarWidth:'none' as any,
              position:'sticky', top:54, zIndex:10,
            }}>
              <div style={{display:'flex',minWidth:'max-content'}}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    style={{
                      padding:'10px 14px', fontSize:12,
                      fontWeight: activeTab===tab.id ? 700 : 400,
                      color: activeTab===tab.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
                      background:'none', border:'none', cursor:'pointer',
                      borderBottom: activeTab===tab.id ? '2px solid var(--color-brand)' : '2px solid transparent',
                      whiteSpace:'nowrap' as const,
                    }}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{minHeight:400, padding:'16px'}}>
              {tabContent[activeTab]}
            </div>
            <div style={{height:80}}/>
          </>
        ) : (
          // デスクトップ：左サイドナビ＋右コンテンツ
          <div style={{display:'flex',gap:32,marginTop:0,alignItems:'flex-start',padding:'24px 40px 40px'}}>
            {/* 左サイドナビ */}
            <div style={{
              width:160, flexShrink:0,
              position:'sticky', top:90,
              borderRight:'1px solid var(--color-brand-border)',
              paddingRight:8,
            }}>
              {TABS.map((tab) => (
                <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                  style={{
                    width:'100%', padding:'10px 16px',
                    textAlign:'left' as const,
                    fontSize:14,
                    fontWeight: activeTab===tab.id ? 700 : 400,
                    color: activeTab===tab.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
                    background: 'none',
                    border:'none',
                    borderRadius:8,
                    cursor:'pointer',
                    transition:'all .12s',
                    display:'block',
                    marginBottom:2,
                  }}
                  onMouseEnter={e=>{if(activeTab!==tab.id)(e.currentTarget as HTMLElement).style.color='var(--color-text)'}}
                  onMouseLeave={e=>{if(activeTab!==tab.id)(e.currentTarget as HTMLElement).style.color='var(--color-text-muted)'}}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 右コンテンツ */}
            <div style={{flex:1,minWidth:0,minHeight:400}}>
              {tabContent[activeTab]}
            </div>
          </div>
        )}
      </div>

      {/* ===== 話の公開管理モーダル（S9） ===== */}
      {epManageTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,width:'100%',maxWidth:500,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--color-brand-border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'var(--color-text)'}}>話の公開管理</div>
                <div style={{fontSize:11,color:'var(--color-text-muted)',marginTop:2}}>{epManageTarget.title}</div>
              </div>
              <button onClick={()=>{setEpManageTarget(null);setEpList([])}}
                style={{width:28,height:28,border:'1px solid var(--color-brand-border)',borderRadius:'50%',background:'var(--color-bg-card)',cursor:'pointer',fontSize:14,color:'var(--color-text-muted)',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {epList.length === 0 ? (
                <div style={{textAlign:'center',padding:'40px',color:'var(--color-text-faint)',fontSize:13}}>話がありません</div>
              ) : epList.map((ep:any, i:number) => (
                <div key={ep.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<epList.length-1?'1px solid var(--color-brand-light)':'none'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:'var(--color-text-faint)',marginBottom:2}}>第{ep.ep_number}話</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--color-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ep.title}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <span style={{fontSize:10,fontWeight:600,
                      color:ep.published?'#15803d':'#757575',
                      background:ep.published?'#f0fdf4':'#f5f5f5',
                      border:`1px solid ${ep.published?'#86efac':'#e0e0e0'}`,
                      padding:'2px 8px',borderRadius:8}}>
                      {ep.published ? '公開中' : '非公開'}
                    </span>
                    <button
                      onClick={()=>handleToggleEpPublish(ep.id, ep.published)}
                      disabled={epToggling === ep.id}
                      style={{
                        fontSize:11,fontWeight:600,padding:'5px 12px',borderRadius:8,cursor:'pointer',
                        border:`1px solid ${ep.published?'var(--color-brand-border)':'#86efac'}`,
                        color:ep.published?'var(--color-text-muted)':'#15803d',
                        background:'var(--color-bg-card)',
                        opacity:epToggling===ep.id?0.5:1,
                        whiteSpace:'nowrap' as const,
                      }}>
                      {epToggling===ep.id ? '...' : ep.published ? '非公開にする' : '公開する'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== 章管理モーダル ===== */}
      {chapterTarget && (
        <ChapterEditModal novelId={chapterTarget.id} novelTitle={chapterTarget.title} onClose={()=>setChapterTarget(null)}/>
      )}

      {/* ===== ストーリーボードモーダル ===== */}
      {showBoard && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',padding: isMobile ? 0 : 20}}>
          <div style={{
            position: isMobile ? 'absolute' : 'relative',
            bottom: isMobile ? 0 : undefined,
            width: isMobile ? '100%' : '95%',
            maxWidth:1200,
            height: isMobile ? '92vh' : '88vh',
            borderRadius: isMobile ? '16px 16px 0 0' : 12,
            overflow:'hidden',display:'flex',flexDirection:'column',
            boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
          } as any}>
            <StoryBoard userId={profile.user_id} onClose={()=>setShowBoard(false)} isModal={true}/>
          </div>
        </div>
      )}

      {/* ===== バッジ図鑑モーダル ===== */}
      {showBadgeBook && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(5,3,12,0.92)',padding: isMobile ? 0 : 20}}>
          <div style={{position:'absolute',inset:0}} onClick={()=>setShowBadgeBook(false)}/>
          <div style={{
            position: isMobile ? 'absolute' : 'relative',
            bottom: isMobile ? 0 : undefined,
            zIndex:1,
            width: isMobile ? '100%' : '94%',
            maxWidth:940,
            height: isMobile ? '92vh' : '86vh',
            display:'flex',
            borderRadius: isMobile ? '18px 18px 0 0' : 10,
            overflow:'visible',
            filter:'drop-shadow(0 40px 60px rgba(0,0,0,0.9))',
          } as any}>
            {!isMobile && (
              <div style={{width:32,flexShrink:0,borderRadius:'10px 0 0 10px',background:'linear-gradient(180deg, #3d1a0a 0%, #5c2a10 20%, #3d1a0a 50%, #2a1006 100%)',borderRight:'2px solid #7a3a18',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
                <div style={{width:1,height:60,background:'rgba(255,220,150,0.3)'}}/>
                <div style={{writingMode:'vertical-rl' as any,fontSize:9,color:'rgba(255,210,120,0.5)',letterSpacing:'0.15em',fontWeight:600}}>BADGE COLLECTION</div>
                <div style={{width:1,height:60,background:'rgba(255,220,150,0.3)'}}/>
              </div>
            )}
            <div style={{flex:1,display:'flex',flexDirection:'column',borderRadius: isMobile ? '18px 18px 0 0' : '0 10px 10px 0',overflow:'hidden',background:'#f5ede0',borderTop: isMobile ? 'none' : '1px solid #c8a87a',borderRight: isMobile ? 'none' : '1px solid #c8a87a',borderBottom: isMobile ? 'none' : '1px solid #c8a87a'}}>
              <div style={{background:'linear-gradient(180deg, #2d1206 0%, #4a1e0a 100%)',padding: isMobile ? '14px 16px 12px' : '16px 24px 14px',position:'relative',borderBottom:'3px solid #7a3a18'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent 0%,#c8922a 20%,#ffd87a 50%,#c8922a 80%,transparent 100%)'}}/>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize: isMobile ? 16 : 20,fontWeight:700,color:'#ffd87a',fontFamily:"'Noto Serif JP',serif",letterSpacing:'0.12em'}}>バッジ図鑑</div>
                    <div style={{fontSize: isMobile ? 10 : 11,color:'rgba(255,200,100,0.6)',letterSpacing:'0.1em',marginTop:1}}>{claimedSet.size} / {ALL_BADGES.filter(b=>!b.id.startsWith('_')).length} 獲得済み</div>
                  </div>
                  <button onClick={()=>setShowBadgeBook(false)} style={{width:28,height:28,border:'1px solid rgba(255,200,100,0.3)',borderRadius:'50%',background:'rgba(0,0,0,0.3)',color:'rgba(255,200,100,0.7)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                </div>
                <div style={{marginTop:10,height:4,background:'rgba(0,0,0,0.3)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'linear-gradient(90deg,#c8922a,#ffd87a,#c8922a)',width:`${(claimedSet.size/ALL_BADGES.filter(b=>!b.id.startsWith('_')).length)*100}%`,transition:'width .4s'}}/>
                </div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding: isMobile ? '16px 12px' : '20px 28px'}}>
                <div style={{display:'grid',gridTemplateColumns: isMobile ? 'repeat(4,1fr)' : 'repeat(6,1fr)',gap: isMobile ? 12 : 18}}>
                  {ALL_BADGES.slice(badgePage*perPage,(badgePage+1)*perPage).map(badge => {
                    const owned = claimedSet.has(badge.id)
                    const isSlot = badge.id.startsWith('_')
                    const sz = isMobile ? 58 : 72
                    return (
                      <div key={badge.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,opacity: isSlot ? 0.2 : 1}}>
                        <div style={{width:sz+10,height:sz+10,borderRadius:'50%',
                          background: owned ? `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.9), ${badge.color} 40%, ${badge.color}bb)` : 'radial-gradient(circle at 40% 35%, #aaa 0%, #666 60%, #444)',
                          border: owned ? `3px solid ${badge.color}` : '3px solid #888',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          boxShadow: owned ? `0 4px 14px ${badge.color}88` : '0 3px 8px rgba(0,0,0,0.25)',
                          position:'relative',overflow:'hidden'}}>
                          {owned
                            ? <span style={{fontSize: isMobile ? 9 : 11,fontWeight:700,color:'#fff',textAlign:'center',lineHeight:1.25,padding:'0 4px',zIndex:1,textShadow:'0 1px 3px rgba(0,0,0,0.6)'}}>{badge.name.replace(' Lv.', '\nLv.')}</span>
                            : <span style={{fontSize: isMobile ? 16 : 20,color:'rgba(255,255,255,0.15)',fontWeight:700}}>{isSlot ? '' : '?'}</span>
                          }
                        </div>
                        <div style={{fontSize: isMobile ? 9 : 10,color: owned ? '#5a3010' : '#c4a882',textAlign:'center',lineHeight:1.3,fontWeight: owned ? 600 : 400}}>
                          {isSlot ? '' : owned ? badge.name : '未獲得'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {totalPages > 1 && (
                <div style={{background:'linear-gradient(180deg,#ede0cc,#e0cdb0)',borderTop:'2px solid #c8a87a',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <button onClick={()=>setBadgePage(p=>Math.max(0,p-1))} disabled={badgePage===0}
                    style={{padding:'6px 14px',border:'1px solid #a07840',borderRadius:16,background:badgePage===0?'transparent':'#4a1e0a',color:badgePage===0?'#c4a882':'#ffd87a',cursor:badgePage===0?'not-allowed':'pointer',fontSize:12,fontWeight:600}}>‹ 前</button>
                  <span style={{fontSize:11,color:'#a07840'}}>{badgePage+1} / {totalPages}</span>
                  <button onClick={()=>setBadgePage(p=>Math.min(totalPages-1,p+1))} disabled={badgePage===totalPages-1}
                    style={{padding:'6px 14px',border:'1px solid #a07840',borderRadius:16,background:badgePage===totalPages-1?'transparent':'#4a1e0a',color:badgePage===totalPages-1?'#c4a882':'#ffd87a',cursor:badgePage===totalPages-1?'not-allowed':'pointer',fontSize:12,fontWeight:600}}>次 ›</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 各種モーダル ===== */}
      {showEmailModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'28px',maxWidth:420,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--color-text)',marginBottom:16}}>メールアドレスを変更</div>
            <div style={{marginBottom:10}}><label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>新しいメールアドレス</label><input type="email" value={newEmail} onChange={e=>{setNewEmail(e.target.value);setEmailError('')}} placeholder="new@example.com" style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none'}}/></div>
            <div style={{marginBottom:16}}><label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>現在のパスワード</label><input type="password" value={emailPw} onChange={e=>{setEmailPw(e.target.value);setEmailError('')}} style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${emailError?'var(--color-danger)':'var(--color-brand-border)'}`,borderRadius:8,fontSize:13,outline:'none'}}/></div>
            {emailError && <div style={{fontSize:11,color:'var(--color-danger)',marginBottom:12}}>{emailError}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowEmailModal(false);setNewEmail('');setEmailPw('');setEmailError('')}} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleEmailChange} disabled={emailSaving} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer',opacity:emailSaving?0.6:1}}>{emailSaving?'送信中...':'変更する'}</button>
            </div>
          </div>
        </div>
      )}
      {showPwModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'28px',maxWidth:420,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--color-text)',marginBottom:16}}>パスワードを変更</div>
            <div style={{marginBottom:10}}><label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>現在のパスワード</label><input type="password" value={currentPw} onChange={e=>{setCurrentPw(e.target.value);setPwError('')}} style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none'}}/></div>
            <div style={{marginBottom:10}}><label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>新しいパスワード（6文字以上）</label><input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwError('')}} style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none'}}/></div>
            <div style={{marginBottom:16}}><label style={{fontSize:11,color:'var(--color-text-muted)',fontWeight:600,display:'block',marginBottom:4}}>新しいパスワード（確認）</label><input type="password" value={newPwConfirm} onChange={e=>{setNewPwConfirm(e.target.value);setPwError('')}} style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${pwError?'var(--color-danger)':'var(--color-brand-border)'}`,borderRadius:8,fontSize:13,outline:'none'}}/></div>
            {pwError && <div style={{fontSize:11,color:'var(--color-danger)',marginBottom:12}}>{pwError}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowPwModal(false);setCurrentPw('');setNewPw('');setNewPwConfirm('');setPwError('')}} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handlePwChange} disabled={pwSaving} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer',opacity:pwSaving?0.6:1}}>{pwSaving?'変更中...':'変更する'}</button>
            </div>
          </div>
        </div>
      )}
      {showBdModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'28px',maxWidth:380,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--color-text)',marginBottom:16}}>生年月日を設定</div>
            <p style={{fontSize:12,color:'var(--color-text-muted)',lineHeight:1.8,marginBottom:16}}>18歳以上の方はR18コンテンツを閲覧できます。13歳未満の方はご利用いただけません。</p>
            <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
              <select value={bdYear} onChange={e=>setBdYear(e.target.value)} style={{flex:2,padding:'8px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13}}>
                <option value="">年</option>
                {Array.from({length:100},(_,i)=>new Date().getFullYear()-i-5).map(y=><option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={bdMonth} onChange={e=>setBdMonth(e.target.value)} style={{flex:1,padding:'8px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13}}>
                <option value="">月</option>
                {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}
              </select>
              <select value={bdDay} onChange={e=>setBdDay(e.target.value)} style={{flex:1,padding:'8px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13}}>
                <option value="">日</option>
                {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}日</option>)}
              </select>
            </div>
            {bdError && <div style={{fontSize:11,color:'var(--color-danger)',marginBottom:12}}>{bdError}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowBdModal(false);setBdError('')}} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleSaveBirthdate} disabled={bdSaving} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer',opacity:bdSaving?0.6:1}}>{bdSaving?'保存中…':'設定する'}</button>
            </div>
          </div>
        </div>
      )}
      {showBioModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'28px',maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--color-text)',marginBottom:16}}>自己紹介を編集</div>
            <textarea value={bioInput} onChange={e=>setBioInput(e.target.value)} rows={6} maxLength={300} placeholder="自己紹介（300文字以内）"
              style={{width:'100%',padding:'10px 14px',border:'1.5px solid var(--color-brand-border)',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',lineHeight:1.8}}/>
            <div style={{fontSize:11,color:'var(--color-text-faint)',textAlign:'right',marginBottom:16}}>{bioInput.length}/300</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowBioModal(false);setBioInput(profile.bio||'')}} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleSaveBio} disabled={bioSaving} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-brand)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer',opacity:bioSaving?0.6:1}}>{bioSaving?'保存中...':'保存する'}</button>
            </div>
          </div>
        </div>
      )}
      {showWithdraw && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'32px',maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--color-danger)',marginBottom:16}}>退会の確認</div>
            <div style={{fontSize:13,color:'var(--color-text)',lineHeight:1.8,marginBottom:16,background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 16px'}}>
              投稿した作品は削除されません。退会前にご自身で削除してください。この操作は取り消せません。
            </div>
            <input type={profile.login_provider==='google'?'text':'password'} value={withdrawPw} onChange={e=>{setWithdrawPw(e.target.value);setWithdrawError('')}}
              placeholder={profile.login_provider==='google'?'「退会」と入力':'パスワード'}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${withdrawError?'var(--color-danger)':'var(--color-brand-border)'}`,borderRadius:8,fontSize:13,marginBottom:8,outline:'none'}}/>
            {withdrawError && <div style={{fontSize:11,color:'var(--color-danger)',marginBottom:12}}>{withdrawError}</div>}
            <div style={{display:'flex',gap:10,marginTop:8}}>
              <button onClick={()=>{setShowWithdraw(false);setWithdrawPw('');setWithdrawError('')}} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
              <button onClick={handleWithdraw} disabled={!withdrawPw||withdrawing}
                style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:withdrawPw?'var(--color-danger)':'#f5f5f5',color:withdrawPw?'var(--color-bg-card)':'var(--color-text-faint)',fontSize:13,fontWeight:700,cursor:withdrawPw?'pointer':'not-allowed'}}>
                {withdrawing?'処理中...':'退会する'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'var(--color-bg-card)',borderRadius:16,padding:'28px',maxWidth:460,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--color-danger)',marginBottom:16}}>削除の確認</div>
            {!deleteMode && (<>
              <p style={{fontSize:13,color:'var(--color-text)',marginBottom:16,lineHeight:1.8}}>「<strong>{deleteTarget.title}</strong>」の削除方法を選んでください</p>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                <button onClick={()=>setDeleteMode('episode')} style={{padding:'14px 16px',border:'1.5px solid var(--color-brand-border)',borderRadius:10,background:'var(--color-bg)',cursor:'pointer',textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--color-text)',marginBottom:2}}>特定の話を削除する</div>
                  <div style={{fontSize:11,color:'var(--color-text-muted)'}}>選んだ話だけ削除します。作品は残ります。</div>
                </button>
                <button onClick={()=>setDeleteMode('novel')} style={{padding:'14px 16px',border:'1.5px solid #fca5a5',borderRadius:10,background:'#fef2f2',cursor:'pointer',textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--color-danger)',marginBottom:2}}>作品全体を削除する</div>
                  <div style={{fontSize:11,color:'var(--color-text-faint)'}}>すべての話・コメント・いいねが削除されます。取り消せません。</div>
                </button>
              </div>
              <button onClick={()=>setDeleteTarget(null)} style={{width:'100%',padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>キャンセル</button>
            </>)}
            {deleteMode==='episode'&&!deleteEpId&&(<>
              <p style={{fontSize:13,color:'var(--color-text)',marginBottom:12}}>削除する話を選んでください</p>
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:240,overflowY:'auto',marginBottom:16}}>
                {deleteTarget.episodes.length===0
                  ?<div style={{fontSize:12,color:'var(--color-text-faint)',textAlign:'center',padding:16}}>話がありません</div>
                  :deleteTarget.episodes.map(ep=>(
                    <button key={ep.id} onClick={()=>setDeleteEpId(ep.id)} style={{padding:'10px 14px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',cursor:'pointer',textAlign:'left',fontSize:13,color:'var(--color-text)'}}>{ep.title}</button>
                  ))}
              </div>
              <button onClick={()=>setDeleteMode(null)} style={{width:'100%',padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>戻る</button>
            </>)}
            {deleteMode==='episode'&&deleteEpId&&(<>
              <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13,color:'var(--color-danger)',lineHeight:1.7}}>
                「<strong>{deleteTarget.episodes.find(e=>e.id===deleteEpId)?.title}</strong>」を削除します。この操作は取り消せません。
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setDeleteEpId('')} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>戻る</button>
                <button onClick={handleDeleteConfirm} disabled={deleteLoading} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-danger)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer',opacity:deleteLoading?0.6:1}}>{deleteLoading?'削除中…':'削除する'}</button>
              </div>
            </>)}
            {deleteMode==='novel'&&(<>
              <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13,color:'var(--color-danger)',lineHeight:1.7}}>
                「<strong>{deleteTarget.title}</strong>」を完全に削除します。この操作は取り消せません。
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setDeleteMode(null)} style={{flex:1,padding:'10px',border:'1px solid var(--color-brand-border)',borderRadius:8,background:'var(--color-bg-card)',color:'var(--color-text-muted)',fontSize:13,cursor:'pointer'}}>戻る</button>
                <button onClick={handleDeleteConfirm} disabled={deleteLoading} style={{flex:1,padding:'10px',border:'none',borderRadius:8,background:'var(--color-danger)',color:'var(--color-bg-card)',fontSize:13,fontWeight:700,cursor:'pointer',opacity:deleteLoading?0.6:1}}>{deleteLoading?'削除中…':'完全に削除する'}</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {toast && (
        <div style={{position:'fixed',bottom: isMobile ? 80 : 24,right:24,background:'var(--color-brand)',color:'var(--color-bg-card)',padding:'12px 20px',borderRadius:12,fontSize:13,fontWeight:600,zIndex:999}}>
          {toast}
        </div>
      )}

      <style>{`.history-title:hover,.history-title:hover div{color:var(--color-text)!important;opacity:1!important}`}</style>
      <AdBanner />
      <Footer user={true} />
    </div>
  )
}
