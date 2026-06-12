'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

interface Props {
  show: boolean
  onClose: () => void
  profile: any
  userId: string
}

type SettingTab = 'menu' | 'email' | 'password' | 'icon' | 'name' | 'bio' | 'birthdate'

export default function SettingsModal({ show, onClose, profile, userId }: Props) {
  const [tab, setTab] = useState<SettingTab>('menu')
  const [value, setValue] = useState('')
  const [value2, setValue2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!show) { setTab('menu'); setMsg(''); setValue(''); setValue2('') }
  }, [show])

  const items: { key: SettingTab; label: string }[] = [
    { key: 'email',     label: 'メールアドレスを変更' },
    { key: 'password',  label: 'パスワードを変更' },
    { key: 'icon',      label: 'アイコンを変更' },
    { key: 'name',      label: '名前を変更' },
    { key: 'bio',       label: '自己紹介を編集' },
    { key: 'birthdate', label: '生年月日を設定' },
  ]

  async function handleSave() {
    setLoading(true); setMsg('')
    try {
      if (tab === 'email') {
        const { error } = await supabase.auth.updateUser({ email: value })
        if (error) throw error
        setMsg('確認メールを送信しました')
      } else if (tab === 'password') {
        if (value !== value2) { setMsg('パスワードが一致しません'); setLoading(false); return }
        const { error } = await supabase.auth.updateUser({ password: value })
        if (error) throw error
        setMsg('パスワードを変更しました')
      } else if (tab === 'name') {
        const { error } = await supabase.from('profiles').update({ display_name: value }).eq('user_id', userId)
        if (error) throw error
        setMsg('名前を変更しました')
      } else if (tab === 'bio') {
        const { error } = await supabase.from('profiles').update({ bio: value }).eq('user_id', userId)
        if (error) throw error
        setMsg('自己紹介を更新しました')
      } else if (tab === 'birthdate') {
        const { error } = await supabase.from('profiles').update({ birthdate: value }).eq('user_id', userId)
        if (error) throw error
        setMsg('生年月日を設定しました')
      } else if (tab === 'icon') {
        // アイコン変更はファイルアップロード
        setMsg('マイページからアイコンを変更してください')
      }
    } catch (e: any) {
      setMsg('エラー: ' + e.message)
    }
    setLoading(false)
  }

  if (!show || !mounted) return null

  const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #F0D9C9', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' as const }

  return createPortal(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'#fff', border:'1px solid #F0D9C9', borderRadius:16,
        width:360, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.15)',
        overflow:'hidden', animation:'modalIn .2s ease',
      }}>
        {/* ヘッダー */}
        <div style={{background:'#FFF1E6',padding:'12px 16px',borderBottom:'1px solid #F0D9C9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {tab !== 'menu' && (
              <button onClick={()=>{setTab('menu');setMsg('');setValue('');setValue2('')}}
                style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#77706A',padding:'0 4px'}}>‹</button>
            )}
            <span style={{fontSize:14,fontWeight:700,color:'#2B211B'}}>
              {tab === 'menu' ? '設定' : items.find(i=>i.key===tab)?.label}
            </span>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#B8AEA8'}}>×</button>
        </div>

        {/* メニュー */}
        {tab === 'menu' && (
          <div>
            {items.map((item, idx) => (
              <button key={item.key} onClick={()=>{setTab(item.key);setValue('');setValue2('');setMsg('')}}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'13px 16px',border:'none',borderBottom:idx<items.length-1?'1px solid #FFF1E6':'none',background:'#fff',cursor:'pointer',fontSize:13,color:'#2B211B',textAlign:'left'}}>
                <span>{item.label}</span>
                <span style={{color:'#B8AEA8',fontSize:12}}>›</span>
              </button>
            ))}
          </div>
        )}

        {/* 各設定フォーム */}
        {tab !== 'menu' && (
          <div style={{padding:'20px 16px'}}>
            {tab === 'email' && (
              <div>
                <div style={{fontSize:12,color:'#77706A',marginBottom:4}}>新しいメールアドレス</div>
                <input style={inp} type="email" value={value} onChange={e=>setValue(e.target.value)} placeholder="new@example.com"/>
              </div>
            )}
            {tab === 'password' && (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{fontSize:12,color:'#77706A',marginBottom:4}}>新しいパスワード</div>
                  <input style={inp} type="password" value={value} onChange={e=>setValue(e.target.value)} placeholder="8文字以上"/>
                </div>
                <div>
                  <div style={{fontSize:12,color:'#77706A',marginBottom:4}}>確認</div>
                  <input style={inp} type="password" value={value2} onChange={e=>setValue2(e.target.value)} placeholder="もう一度入力"/>
                </div>
              </div>
            )}
            {tab === 'name' && (
              <div>
                <div style={{fontSize:12,color:'#77706A',marginBottom:4}}>新しい名前</div>
                <input style={inp} value={value} onChange={e=>setValue(e.target.value)} placeholder={profile?.display_name || '名前'}/>
              </div>
            )}
            {tab === 'bio' && (
              <div>
                <div style={{fontSize:12,color:'#77706A',marginBottom:4}}>自己紹介</div>
                <textarea style={{...inp,resize:'vertical',minHeight:80}} value={value} onChange={e=>setValue(e.target.value)} placeholder={profile?.bio || '自己紹介を入力'}/>
              </div>
            )}
            {tab === 'birthdate' && (
              <div>
                <div style={{fontSize:12,color:'#77706A',marginBottom:4}}>生年月日</div>
                <input style={inp} type="date" value={value} onChange={e=>setValue(e.target.value)}/>
              </div>
            )}
            {tab === 'icon' && (
              <div style={{textAlign:'center',padding:'8px 0'}}>
                <div style={{fontSize:13,color:'#77706A',lineHeight:1.7}}>
                  アイコンの変更はマイページから行えます
                </div>
                <a href="/mypage" style={{display:'inline-block',marginTop:12,padding:'8px 20px',background:'#F26A21',color:'#fff',borderRadius:8,fontSize:13,fontWeight:700,textDecoration:'none'}}>
                  マイページへ
                </a>
              </div>
            )}

            {msg && (
              <div style={{marginTop:12,fontSize:12,color:msg.includes('エラー')?'#dc2626':'#10b981',textAlign:'center'}}>
                {msg}
              </div>
            )}

            {tab !== 'icon' && (
              <button onClick={handleSave} disabled={loading||!value.trim()}
                style={{marginTop:16,width:'100%',padding:'10px',background:'#F26A21',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',opacity:loading||!value.trim()?0.5:1}}>
                {loading ? '保存中...' : '保存する'}
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body
  )
}
