'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import SettingsModal from '@/components/SettingsModal'

interface Props {
  profile?: { display_name: string; user_number?: number; icon_url?: string | null } | null
  user?: any
  activeGenre?: string
}

export default function Header({ profile, user, activeGenre }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAllNotif, setShowAllNotif] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const lastCheck = localStorage.getItem('age_check_date')
    const today = new Date().toDateString()
    if (lastCheck !== today) {
      fetch('/api/age-check', { method: 'POST' })
        .then(r => r.json())
        .then(d => { if (d.age_verified) localStorage.setItem('age_check_date', today) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showMobileMenu])

  // ===== A7: スクロール検知でヘッダーを縮小・半透明化 =====
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 24)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const userNumber = profile?.user_number
    ? '#' + String(profile.user_number).padStart(4, '0')
    : null

  async function handleOpenNotif() {
    setShowNotif(!showNotif)
    if (!showNotif && unreadCount > 0 && user) {
      await supabase.from('notifications').update({ is_read: true })
        .eq('user_id', user.id).eq('is_read', false)
      setUnreadCount(0)
      setNotifications(prev => prev.map((n: any) => ({ ...n, is_read: true })))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function fmtDate(s: string) {
    const d = new Date(s), now = new Date(), diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'たった今'
    if (diff < 3600000) return `${Math.floor(diff/60000)}分前`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')
    setShowMobileMenu(false)
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const NAV_LEFT = [
    {label:'ホーム',    href:'/'},
    {label:'ランキング', href:'/ranking'},
    {label:'作品を探す', href:'/search'},
    {label:'コンテスト', href:'/contests'},
  ]

  return (
    <>
      {/* ===== 統合ヘッダー（ロゴ＋検索＋ユーザー操作＋ナビを1ブロックに） ===== */}
      <header style={{
        background: scrolled ? 'rgba(255,255,255,0.88)' : '#fff',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom:'1px solid #F0D9C9',
        position:'sticky', top:0, zIndex:50,
        boxShadow: scrolled ? '0 2px 12px rgba(242,106,33,.08)' : '0 1px 4px rgba(242,106,33,.07)',
        transition:'background .25s ease, box-shadow .25s ease, backdrop-filter .25s ease',
      }}>

        {/* ===== デスクトップ：上段（ロゴ・検索・ユーザー操作） ===== */}
        <div className="desktop-header" style={{
          maxWidth:1200, margin:'0 auto', padding:'0 32px',
          display:'flex', alignItems:'center', gap:16,
          height: scrolled ? 52 : 66,
          position:'relative',
          transition:'height .25s ease',
        }}>
          <Link href="/" style={{flexShrink:0}}>
            <img src="/logo.png" alt="原石航路" style={{
              height: scrolled ? 68 : 90, width:'auto', display:'block', objectFit:'contain',
              transition:'height .25s ease',
            }}/>
          </Link>
          <form onSubmit={handleSearch} style={{position:'absolute',left:'calc(50% - 40px)',transform:'translateX(-50%)',width:380,display:'flex',alignItems:'center',border:'1.5px solid #F0D9C9',borderRadius:20,background:'#FFF9F2',overflow:'hidden'}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="作品名・作者名・キーワードで検索"
              style={{flex:1,padding:'7px 16px',border:'none',background:'transparent',fontSize:13,color:'#2B211B',outline:'none'}}/>
            <button type="submit" style={{padding:'7px 14px',background:'none',border:'none',borderLeft:'1px solid #F0D9C9',cursor:'pointer',display:'flex',alignItems:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
              </svg>
            </button>
          </form>
          <div style={{flex:1}}/>
          <div style={{display:'flex',alignItems:'center',gap:12,position:'relative',zIndex:1}}>
            {user ? (
              <>
                <Link href="/post" className="header-post-btn"
                  style={{
                    border:'1.5px solid #F26A21', color:'#F26A21', borderRadius:'50%',
                    background:'#fff', fontSize:'13px', fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
                    textDecoration:'none', whiteSpace:'nowrap',
                    width:'38px', height:'38px', padding:0, flexShrink:0, boxSizing:'border-box',
                  }}>
                  <span style={{fontSize:'18px',lineHeight:1}}>＋</span>
                  <span className="header-post-btn-text">投稿する</span>
                </Link>
                <div ref={notifRef} style={{position:'relative'}}>
                  <button onClick={handleOpenNotif}
                    style={{position:'relative',width:36,height:36,borderRadius:'50%',border:'1.5px solid #F0D9C9',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#77706A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unreadCount > 0 && <span style={{position:'absolute',top:0,right:0,width:16,height:16,background:'#F26A21',borderRadius:'50%',fontSize:9,color:'#fff',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  {showNotif && (
                    <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',width:320,background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden',maxHeight:showAllNotif?'80vh':'360px',display:'flex',flexDirection:'column'}}>
                      <div style={{padding:'10px 14px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>通知</span>
                        <button onClick={()=>setShowAllNotif(!showAllNotif)} style={{fontSize:11,color:'#F26A21',background:'none',border:'none',cursor:'pointer'}}>{showAllNotif?'‹ 閉じる':'もっと見る ›'}</button>
                      </div>
                      {notifications.length === 0
                        ? <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'#B8AEA8'}}>通知はありません</div>
                        : <div style={{overflowY:'auto',flex:1}}>{(showAllNotif?notifications:notifications.slice(0,5)).map(n=>(
                          <a key={n.id} href={n.link||'#'} onClick={()=>setShowNotif(false)} style={{display:'block',padding:'10px 14px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',background:n.is_read?'#fff':'#FFF9F2'}}>
                            <div style={{fontSize:12,color:'#2B211B',lineHeight:1.6,marginBottom:2}}>{n.message}</div>
                            <div style={{fontSize:10,color:'#B8AEA8'}}>{fmtDate(n.created_at)}</div>
                          </a>
                        ))}</div>}
                    </div>
                  )}
                </div>
                <div ref={userMenuRef} style={{position:'relative'}}>
                  <button onClick={()=>{setShowUserMenu(!showUserMenu);setShowSettings(false)}}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',width:38,height:38,borderRadius:'50%',background:'#FFF9F2',border: profile?.icon_url ? '1.5px solid #F0D9C9' : 'none',cursor:'pointer',padding:0,overflow:'hidden'}}>
                    {profile?.icon_url ? (
                      <img src={profile.icon_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <div style={{width:'100%',height:'100%',background:'#F26A21',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#fff'}}>
                        {(profile?.display_name||'?').slice(0,1)}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',width:200,background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden'}}>
                      <div style={{padding:'10px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>{profile?.display_name}</div>
                        {userNumber && <div style={{fontSize:11,color:'#B8AEA8',marginTop:2}}>{userNumber}</div>}
                      </div>
                      <Link href="/mypage" onClick={()=>setShowUserMenu(false)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',color:'#2B211B',fontSize:13}}>
                        <span>マイページ</span><span style={{color:'#B8AEA8',fontSize:12}}>›</span>
                      </Link>
                      <Link href="/history" onClick={()=>setShowUserMenu(false)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',color:'#2B211B',fontSize:13}}>
                        <span>閲覧履歴</span><span style={{color:'#B8AEA8',fontSize:12}}>›</span>
                      </Link>
                      <Link href="/mission" onClick={()=>setShowUserMenu(false)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',color:'#2B211B',fontSize:13}}>
                        <span>ミッション</span><span style={{color:'#B8AEA8',fontSize:12}}>›</span>
                      </Link>
                      <button onClick={()=>{setShowSettingsModal(true);setShowUserMenu(false)}}
                        style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'11px 16px',borderBottom:'1px solid #FFF1E6',background:'#fff',border:'none',cursor:'pointer',fontSize:13,color:'#2B211B'}}>
                        <span>設定</span><span style={{color:'#B8AEA8',fontSize:12}}>›</span>
                      </button>
                      <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',width:'100%',border:'none',background:'#fff',cursor:'pointer',fontSize:13,color:'#dc2626',textAlign:'left'}}>
                        ログアウト
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{border:'1.5px solid #F26A21',color:'#F26A21',padding:'6px 18px',borderRadius:20,background:'#fff',fontSize:13,fontWeight:500,textDecoration:'none'}}>ログイン</Link>
                <Link href="/auth/register" style={{background:'#F26A21',color:'#fff',padding:'7px 18px',borderRadius:20,fontSize:13,fontWeight:700,textDecoration:'none'}}>新規登録</Link>
              </>
            )}
          </div>
        </div>

        {/* ===== デスクトップ：下段（ナビゲーション、同ブロック内） ===== */}
        <nav className="desktop-header" style={{
          borderTop:'1px solid #FFF1E6',
          maxHeight: scrolled ? 0 : 40,
          opacity: scrolled ? 0 : 1,
          overflow:'hidden',
          transition:'max-height .25s ease, opacity .2s ease',
        }}>
          <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'flex',width:'100%'}}>
            {NAV_LEFT.map(item=>(
              <Link key={item.href} href={item.href}
                style={{padding:'9px 16px',fontSize:13,whiteSpace:'nowrap',textDecoration:'none',display:'inline-block',fontWeight:500,
                  color:isActive(item.href)?'#F26A21':'#77706A',
                  borderBottom:isActive(item.href)?'2px solid #F26A21':'2px solid transparent',
                  transition:'all .15s'}}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* ===== モバイルヘッダー ===== */}
        <div className="mobile-header">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',height: scrolled ? 54 : 64,transition:'height .25s ease'}}>
            <div style={{width:36}}>
              {user ? (
                <div ref={notifRef} style={{position:'relative'}}>
                  <button onClick={handleOpenNotif}
                    style={{width:36,height:36,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#77706A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unreadCount > 0 && <span style={{position:'absolute',top:4,right:4,width:13,height:13,background:'#F26A21',borderRadius:'50%',fontSize:8,color:'#fff',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  {showNotif && (
                    <div style={{position:'absolute',left:0,top:'calc(100% + 8px)',width:300,background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.15)',zIndex:200,overflow:'hidden',maxHeight:'70vh',display:'flex',flexDirection:'column'}}>
                      <div style={{padding:'10px 14px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>通知</span>
                        <button onClick={()=>setShowNotif(false)} style={{fontSize:18,color:'#B8AEA8',background:'none',border:'none',cursor:'pointer',lineHeight:1}}>×</button>
                      </div>
                      {notifications.length === 0
                        ? <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'#B8AEA8'}}>通知はありません</div>
                        : <div style={{overflowY:'auto',flex:1}}>{notifications.map((n:any)=>(
                          <a key={n.id} href={n.link||'#'} onClick={()=>setShowNotif(false)} style={{display:'block',padding:'10px 14px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',background:n.is_read?'#fff':'#FFF9F2'}}>
                            <div style={{fontSize:12,color:'#2B211B',lineHeight:1.6,marginBottom:2}}>{n.message}</div>
                            <div style={{fontSize:10,color:'#B8AEA8'}}>{fmtDate(n.created_at)}</div>
                          </a>
                        ))}</div>}
                    </div>
                  )}
                </div>
              ) : <div/>}
            </div>

            <Link href="/" style={{position:'absolute',left:'50%',transform:'translateX(-50%)'}}>
              <img src="/logo.png" alt="原石航路" style={{height: scrolled ? 46 : 58,width:'auto',display:'block',objectFit:'contain',transition:'height .25s ease'}}/>
            </Link>

            <button onClick={()=>setShowMobileMenu(!showMobileMenu)}
              style={{width:36,height:36,borderRadius:8,border:'1px solid #F0D9C9',background:'#FFF9F2',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4.5}}>
              <span style={{display:'block',width:16,height:1.5,background:'#77706A',borderRadius:1}}/>
              <span style={{display:'block',width:16,height:1.5,background:'#77706A',borderRadius:1}}/>
              <span style={{display:'block',width:16,height:1.5,background:'#77706A',borderRadius:1}}/>
            </button>
          </div>
        </div>

        {/* モバイルドロワーメニュー */}
        {showMobileMenu && (
          <div className="mobile-header" style={{position:'fixed',inset:0,zIndex:100}}>
            <div onClick={()=>setShowMobileMenu(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)'}}/>
            <div style={{position:'absolute',top:0,right:0,width:'78%',maxWidth:300,height:'100%',background:'#fff',display:'flex',flexDirection:'column',overflowY:'auto'}}>
              <div style={{padding:'14px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFF9F2'}}>
                <img src="/logo.png" alt="原石航路" style={{height:36,width:'auto',objectFit:'contain'}}/>
                <button onClick={()=>setShowMobileMenu(false)} style={{width:30,height:30,border:'none',background:'none',cursor:'pointer',fontSize:18,color:'#77706A'}}>×</button>
              </div>
              {user && (
                <div style={{padding:'12px 16px',borderBottom:'1px solid #F0D9C9',background:'#FFF9F2'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>{profile?.display_name}</div>
                  {userNumber && <div style={{fontSize:11,color:'#B8AEA8',marginTop:1}}>{userNumber}</div>}
                </div>
              )}
              <div style={{flex:1}}>
                {[
                  {label:'ホーム',       href:'/'},
                  {label:'ランキング',    href:'/ranking'},
                  {label:'作品を探す',    href:'/search'},
                  {label:'コンテスト',    href:'/contests'},
                  {label:'閲覧履歴',     href:'/history'},
                  {label:'ミッション',    href:'/mission'},
                  ...(user ? [{label:'投稿する', href:'/post'},{label:'マイページ', href:'/mypage'}] : []),
                ].map(item=>(
                  <Link key={item.href} href={item.href} onClick={()=>setShowMobileMenu(false)}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',
                      color:isActive(item.href)?'#F26A21':'#2B211B',
                      fontSize:14,fontWeight:isActive(item.href)?700:400,
                      background:isActive(item.href)?'#FFF9F2':'#fff'}}>
                    {item.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8AEA8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </Link>
                ))}
                {user && (
                  <button onClick={()=>{setShowSettingsModal(true);setShowMobileMenu(false)}}
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'13px 16px',borderBottom:'1px solid #FFF1E6',background:'#fff',border:'none',cursor:'pointer',fontSize:14,color:'#2B211B',textAlign:'left'}}>
                    設定
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B8AEA8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}
              </div>
              {user ? (
                <div style={{padding:'14px 16px',borderTop:'1px solid #F0D9C9'}}>
                  <button onClick={handleLogout} style={{width:'100%',padding:'11px',border:'1px solid #fca5a5',borderRadius:8,background:'#fff',color:'#dc2626',fontSize:14,cursor:'pointer'}}>
                    ログアウト
                  </button>
                </div>
              ) : (
                <div style={{padding:'14px 16px',borderTop:'1px solid #F0D9C9',display:'flex',gap:8}}>
                  <Link href="/auth/login" onClick={()=>setShowMobileMenu(false)}
                    style={{flex:1,padding:'11px',border:'1.5px solid #F26A21',borderRadius:8,color:'#F26A21',fontSize:14,fontWeight:600,textDecoration:'none',textAlign:'center',display:'block'}}>
                    ログイン
                  </Link>
                  <Link href="/auth/register" onClick={()=>setShowMobileMenu(false)}
                    style={{flex:1,padding:'11px',background:'#F26A21',borderRadius:8,color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none',textAlign:'center',display:'block'}}>
                    新規登録
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ===== ボトムナビ（モバイルのみ） ===== */}
      <nav className="mobile-header" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:49,background:'#fff',borderTop:'1px solid #F0D9C9',boxShadow:'0 -1px 8px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'stretch'}}>
          {[
            {href:'/',      label:'ホーム',     icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill={a?'#FFF1E6':'none'} stroke={a?'#F26A21':'#77706A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
            {href:'/search', label:'探す',      icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?'#F26A21':'#77706A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>},
            {href:'/ranking',label:'ランキング', icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?'#F26A21':'#77706A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>},
            {href:'/contests',label:'コンテスト',icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={a?'#F26A21':'#77706A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>},
            {href:user?'/mypage':'/auth/login', label:'マイページ', icon:(a:boolean)=><svg width="21" height="21" viewBox="0 0 24 24" fill={a?'#FFF1E6':'none'} stroke={a?'#F26A21':'#77706A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>},
          ].map(({href,label,icon})=>{
            const active = href==='/'?pathname==='/':pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'7px 4px 5px',textDecoration:'none',gap:2,minHeight:54}}>
                {icon(active)}
                <span style={{fontSize:9,fontWeight:active?700:400,color:active?'#F26A21':'#77706A',lineHeight:1}}>{label}</span>
              </Link>
            )
          })}
        </div>
        <div style={{height:'env(safe-area-inset-bottom,0px)'}}/>
      </nav>

      <SettingsModal show={showSettingsModal} onClose={()=>setShowSettingsModal(false)} profile={profile} userId={user?.id||''} />

      <style>{`
        .desktop-header { display: flex !important; }
        .mobile-header  { display: none !important; }
        @media (max-width: 768px) {
          .desktop-header { display: none !important; }
          .mobile-header  { display: block !important; }
        }
        nav a:hover { color: #F26A21 !important; opacity: 1; }

        .header-post-btn { transition: width .25s ease, border-radius .25s ease, background .15s ease, padding .25s ease; }
        .header-post-btn-text {
          display: inline-block;
          max-width: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-width .25s ease, opacity .2s ease;
        }
        .header-post-btn:hover {
          background: #fff8f5 !important;
          width: 110px !important;
          border-radius: 20px !important;
          padding: 0 16px 0 12px !important;
        }
        .header-post-btn:hover .header-post-btn-text { max-width: 70px; opacity: 1; }
      `}</style>
    </>
  )
}
