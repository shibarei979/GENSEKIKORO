'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const [q, setQ] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAllNotif, setShowAllNotif] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
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
    if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}`); setShowMobileSearch(false) }
  }

  return (
    <>
      <header style={{background:'#fff',borderBottom:'1px solid #F0D9C9',position:'sticky',top:0,zIndex:50,boxShadow:'0 1px 4px rgba(242,106,33,.07)'}}>
        {/* デスクトップヘッダー */}
        <div className="desktop-header" style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:16,height:66,position:'relative'}}>
          <Link href="/" style={{flexShrink:0}}>
            <img src="/logo.png" alt="原石航路" style={{height:90,width:'auto',display:'block',objectFit:'contain'}}/>
          </Link>
          <form onSubmit={handleSearch} style={{position:'absolute',left:'calc(50% - 80px)',transform:'translateX(-50%)',width:520,display:'flex',alignItems:'center',border:'1.5px solid #F0D9C9',borderRadius:24,background:'#FFF9F2',overflow:'hidden'}}>
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
                <Link href="/post" className="header-post-btn" style={{border:'1.5px solid #F26A21',color:'#F26A21',padding:'6px 18px',borderRadius:20,background:'#fff',fontSize:13,fontWeight:500,display:'inline-block',textDecoration:'none'}}>＋ 投稿する</Link>
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
                      {notifications.length === 0 ? <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'#B8AEA8'}}>通知はありません</div>
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
                    style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:20,background:'#FFF9F2',border:'1.5px solid #F0D9C9',cursor:'pointer',fontSize:13}}>
                    <span style={{color:'#B8AEA8',fontSize:12}}>ユーザー：</span>
                    <span style={{color:'#F26A21',fontWeight:700}}>{(profile?.display_name||'ユーザー').length>8?(profile?.display_name||'ユーザー').slice(0,8)+'…':(profile?.display_name||'ユーザー')}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#77706A" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
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

        {/* モバイルヘッダー */}
        <div className="mobile-header" style={{display:'none',alignItems:'center',justifyContent:'center',padding:'0 16px',height:130,position:'relative',background:'#fff'}}>
          {/* ロゴ中央 */}
          <Link href="/" style={{position:'absolute',left:'50%',transform:'translateX(-50%)'}}>
            <img src="/logo.png" alt="原石航路" style={{height:144,width:'auto',display:'block',objectFit:'contain'}}/>
          </Link>
          {/* 右上にボタン */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
            <button onClick={()=>setShowMobileSearch(!showMobileSearch)}
              style={{width:34,height:34,borderRadius:'50%',border:'1.5px solid #F0D9C9',background:'#FFF9F2',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
              </svg>
            </button>
            <button onClick={()=>setShowMobileMenu(!showMobileMenu)}
              style={{width:34,height:34,borderRadius:'50%',border:'1.5px solid #F0D9C9',background:'#FFF9F2',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
              <span style={{display:'block',width:15,height:1.5,background:'#77706A',borderRadius:1}}/>
              <span style={{display:'block',width:15,height:1.5,background:'#77706A',borderRadius:1}}/>
              <span style={{display:'block',width:15,height:1.5,background:'#77706A',borderRadius:1}}/>
            </button>
          </div>
        </div>

        {/* モバイル検索バー */}
        {showMobileSearch && (
          <div className="mobile-header" style={{display:'none',padding:'0 16px 10px'}}>
            <form onSubmit={handleSearch} style={{display:'flex',alignItems:'center',border:'1.5px solid #F0D9C9',borderRadius:24,background:'#FFF9F2',overflow:'hidden'}}>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="検索..." autoFocus
                style={{flex:1,padding:'8px 16px',border:'none',background:'transparent',fontSize:13,color:'#2B211B',outline:'none'}}/>
              <button type="submit" style={{padding:'8px 14px',background:'none',border:'none',borderLeft:'1px solid #F0D9C9',cursor:'pointer'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F26A21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* モバイルメニュー */}
        {showMobileMenu && (
          <div className="mobile-header" style={{display:'none',borderTop:'1px solid #F0D9C9',background:'#fff'}}>
            {user ? (
              <>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #FFF1E6',background:'#FFF9F2',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>{profile?.display_name}</div>
                    {userNumber && <div style={{fontSize:11,color:'#B8AEA8'}}>{userNumber}</div>}
                  </div>
                </div>
                {[
                  {label:'ホーム',href:'/'},
                  {label:'ランキング',href:'/ranking'},
                  {label:'作品を探す',href:'/search'},
                  {label:'コンテスト',href:'/contests'},
                  {label:'投稿する',href:'/post'},
                  {label:'閲覧履歴',href:'/history'},
                  {label:'マイページ',href:'/mypage'},
                ].map(item=>(
                  <Link key={item.href} href={item.href} onClick={()=>setShowMobileMenu(false)}
                    style={{display:'block',padding:'12px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',color:'#2B211B',fontSize:14}}>
                    {item.label}
                  </Link>
                ))}
                <button onClick={()=>{setShowSettingsModal(true);setShowMobileMenu(false)}}
                  style={{display:'block',width:'100%',padding:'12px 16px',borderBottom:'1px solid #FFF1E6',background:'#fff',border:'none',cursor:'pointer',fontSize:14,color:'#2B211B',textAlign:'left'}}>
                  設定
                </button>
                <button onClick={handleLogout}
                  style={{display:'block',width:'100%',padding:'12px 16px',background:'#fff',border:'none',cursor:'pointer',fontSize:14,color:'#dc2626',textAlign:'left'}}>
                  ログアウト
                </button>
              </>
            ) : (
              <>
                {[
                  {label:'ホーム',href:'/'},
                  {label:'ランキング',href:'/ranking'},
                  {label:'作品を探す',href:'/search'},
                  {label:'コンテスト',href:'/contests'},
                ].map(item=>(
                  <Link key={item.href} href={item.href} onClick={()=>setShowMobileMenu(false)}
                    style={{display:'block',padding:'12px 16px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',color:'#2B211B',fontSize:14}}>
                    {item.label}
                  </Link>
                ))}
                <div style={{display:'flex',gap:8,padding:'12px 16px'}}>
                  <Link href="/auth/login" onClick={()=>setShowMobileMenu(false)}
                    style={{flex:1,padding:'10px',border:'1.5px solid #F26A21',borderRadius:8,color:'#F26A21',fontSize:14,fontWeight:600,textDecoration:'none',textAlign:'center'}}>
                    ログイン
                  </Link>
                  <Link href="/auth/register" onClick={()=>setShowMobileMenu(false)}
                    style={{flex:1,padding:'10px',background:'#F26A21',borderRadius:8,color:'#fff',fontSize:14,fontWeight:700,textDecoration:'none',textAlign:'center'}}>
                    新規登録
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* デスクトップNAV */}
      <nav className="desktop-header" style={{display:'flex',background:'#fff',borderBottom:'2px solid #F0D9C9'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'flex',gap:8}}>
          {[
            {label:'ホーム',href:'/'},
            {label:'ランキング',href:'/ranking'},
            {label:'作品を探す',href:'/search'},
            {label:'コンテスト',href:'/contests'},
          ].map(item=>(
            <Link key={item.href} href={item.href}
              style={{padding:'9px 16px',fontSize:13,whiteSpace:'nowrap',textDecoration:'none',display:'inline-block',fontWeight:500,color:'#77706A',borderBottom:'2px solid transparent',transition:'all .15s'}}>
              {item.label}
            </Link>
          ))}
          <div style={{flex:1}}/>
          {[
            {label:'閲覧履歴',href:'/history'},
            {label:'マイページ',href:'/mypage'},
          ].map(item=>(
            <Link key={item.href} href={item.href}
              style={{padding:'9px 16px',fontSize:13,whiteSpace:'nowrap',textDecoration:'none',display:'inline-block',fontWeight:500,color:'#77706A',borderBottom:'2px solid transparent',transition:'all .15s'}}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <SettingsModal show={showSettingsModal} onClose={()=>setShowSettingsModal(false)} profile={profile} userId={user?.id||''} />

      <style>{`
        .desktop-header { display: flex !important; }
        .mobile-header { display: none !important; }
        .header-post-btn:hover { background: #fff8f5 !important; transform: translateY(-1px); transition: all .15s; box-shadow: 0 2px 8px rgba(242,106,33,.12); }
        @media (max-width: 768px) {
          .desktop-header { display: none !important; }
          .mobile-header { display: block !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .desktop-header form { width: 380px !important; left: calc(50% - 60px) !important; }
        }
      `}</style>
    </>
  )
}
