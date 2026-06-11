'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profile?: { display_name: string; user_number?: number } | null
  user?: any
  activeGenre?: string
}

export default function Header({ profile, user, activeGenre }: Props) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [ageVerified,    setAgeVerified]    = useState(false)
  const [notifications,  setNotifications]  = useState<any[]>([])
  const [showNotif,      setShowNotif]      = useState(false)
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [showAllNotif,   setShowAllNotif]   = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const lastCheck = localStorage.getItem('age_check_date')
    const today = new Date().toDateString()
    if (lastCheck !== today) {
      fetch('/api/age-check', { method: 'POST' })
        .then(r => r.json())
        .then(d => {
          setAgeVerified(d.age_verified)
          if (d.age_verified) localStorage.setItem('age_check_date', today)
        })
        .catch(() => {})
    } else {
      fetch('/api/age-check', { method: 'POST' })
        .then(r => r.json())
        .then(d => setAgeVerified(d.age_verified))
        .catch(() => {})
    }
  }, [])

  const userNumber = profile?.user_number
    ? '#' + String(profile.user_number).padStart(4, '0')
    : null

  async function handleOpenNotif() {
    setShowNotif(!showNotif)
    if (!showNotif && unreadCount > 0 && user) {
      const supaClient = createClient()
      await supaClient.from('notifications').update({ is_read: true })
        .eq('user_id', user.id).eq('is_read', false)
      setUnreadCount(0)
      setNotifications(prev => prev.map((n: any) => ({ ...n, is_read: true })))
    }
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
    if (q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <>
      <header style={{background:'#fff',borderBottom:'1px solid #F0D9C9',position:'sticky',top:0,zIndex:50,boxShadow:'0 1px 4px rgba(242,106,33,.07)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',gap:16,height:66,position:'relative'}}>
          <Link href="/" style={{flexShrink:0}}>
            <img src="/logo.png" alt="原石航路" style={{height:90,width:'auto',display:'block',objectFit:'contain'}}/>
          </Link>
          <form onSubmit={handleSearch} style={{position:'absolute',left:'calc(50% - 60px)',transform:'translateX(-50%)',width:540,display:'flex',alignItems:'center',border:'1.5px solid #F0D9C9',borderRadius:24,background:'#FFF9F2',overflow:'hidden'}}>
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
                <Link href="/post" className="header-post-btn" style={{border:'1.5px solid #F26A21',color:'#F26A21',padding:'6px 18px',borderRadius:20,background:'#fff',fontSize:13,fontWeight:500,display:'inline-block'}}>＋ 投稿する</Link>

                <div ref={notifRef} style={{position:'relative'}}>
                  <button onClick={handleOpenNotif}
                    style={{position:'relative',width:36,height:36,borderRadius:'50%',border:'1.5px solid #F0D9C9',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#77706A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unreadCount > 0 && (
                      <span style={{position:'absolute',top:0,right:0,width:16,height:16,background:'#F26A21',borderRadius:'50%',fontSize:9,color:'#fff',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotif && (
                    <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',width:320,background:'#fff',border:'1px solid #F0D9C9',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden',maxHeight:showAllNotif?'80vh':'360px',transition:'max-height .25s ease',display:'flex',flexDirection:'column'}}>
                      <div style={{padding:'10px 14px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#2B211B'}}>通知</span>
                        <button onClick={()=>setShowAllNotif(!showAllNotif)} style={{fontSize:11,color:'#F26A21',background:'none',border:'none',cursor:'pointer'}}>{showAllNotif?'‹ 閉じる':'もっと見る ›'}</button>
                      </div>
                      {notifications.length === 0 ? (
                        <div style={{padding:'24px',textAlign:'center',fontSize:12,color:'#B8AEA8'}}>通知はありません</div>
                      ) : <div style={{overflowY:'auto',flex:1}}>{(showAllNotif?notifications:notifications.slice(0,5)).map(n => (
                        <a key={n.id} href={n.link||'#'} onClick={()=>setShowNotif(false)}
                          style={{display:'block',padding:'10px 14px',borderBottom:'1px solid #FFF1E6',textDecoration:'none',background:n.is_read?'#fff':'#FFF9F2'}}>
                          <div style={{fontSize:12,color:'#2B211B',lineHeight:1.6,marginBottom:2}}>{n.message}</div>
                          <div style={{fontSize:10,color:'#B8AEA8'}}>{fmtDate(n.created_at)}</div>
                        </a>
                      ))}</div>}
                    </div>
                  )}
                </div>

                <div style={{position:'relative'}} className="user-menu">
                  <Link href="/mypage" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:20,background:'#FFF9F2',border:'1.5px solid #F0D9C9',textDecoration:'none',fontSize:13}}>
                    <span style={{color:'#B8AEA8',fontSize:12}}>ユーザー：</span>
                    <span style={{color:'#F26A21',fontWeight:700}}>{(profile?.display_name || 'ユーザー').length > 8 ? (profile?.display_name || 'ユーザー').slice(0, 8) + '…' : (profile?.display_name || 'ユーザー')}</span>
                  </Link>
                  {userNumber && (
                    <div className="user-tooltip" style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'#2B211B',color:'#fff',borderRadius:8,padding:'8px 14px',fontSize:12,whiteSpace:'nowrap',pointerEvents:'none',opacity:0,transition:'opacity .15s',zIndex:100,boxShadow:'0 4px 12px rgba(0,0,0,.15)'}}>
                      <div style={{color:'#B8AEA8',fontSize:11,marginBottom:2}}>ユーザーID</div>
                      <div style={{fontWeight:700,fontSize:14}}>{userNumber}</div>
                      <div style={{position:'absolute',top:-5,right:20,width:10,height:10,background:'#2B211B',transform:'rotate(45deg)',borderRadius:2}}/>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{border:'1.5px solid #F26A21',color:'#F26A21',padding:'6px 18px',borderRadius:20,background:'#fff',fontSize:13,fontWeight:500}}>ログイン</Link>
                <Link href="/auth/register" style={{background:'#F26A21',color:'#fff',padding:'7px 18px',borderRadius:20,fontSize:13,fontWeight:700}}>新規登録</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <style>{`.user-menu:hover .user-tooltip{opacity:1!important}`}</style>

      {/* メインNAV */}
      <nav style={{background:'#fff',borderBottom:'2px solid #F0D9C9'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',display:'flex',gap:8}}>
          {[
            {label:'ホーム',      href:'/'},
            {label:'ランキング',  href:'/ranking'},
            {label:'作品を探す',  href:'/search'},
            {label:'コンテスト',  href:'/contests'},
          ].map(item => (
            <Link key={item.href} href={item.href}
              style={{padding:'9px 16px',fontSize:13,whiteSpace:'nowrap',textDecoration:'none',display:'inline-block',
                fontWeight:500,color:'#77706A',borderBottom:'2px solid transparent',transition:'all .15s'}}>
              {item.label}
            </Link>
          ))}
          <div style={{flex:1}}/>
          {[
            {label:'閲覧履歴', href:'/history'},
            {label:'マイページ',href:'/mypage'},
          ].map(item => (
            <Link key={item.href} href={item.href}
              style={{padding:'9px 16px',fontSize:13,whiteSpace:'nowrap',textDecoration:'none',display:'inline-block',
                fontWeight:500,color:'#77706A',borderBottom:'2px solid transparent',transition:'all .15s'}}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
