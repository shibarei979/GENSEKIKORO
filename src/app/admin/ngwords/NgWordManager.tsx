'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NgWord { id: string; word: string; created_at: string }

const btn = (color: string, bg: string, border: string) => ({
  padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',
  color,background:bg,border:`1px solid ${border}`,
})

export default function NgWordManager({ initialWords }: { initialWords: NgWord[] }) {
  const supabase = createClient()
  const [words,   setWords]   = useState(initialWords)
  const [input,   setInput]   = useState('')
  const [bulk,    setBulk]    = useState('')
  const [mode,    setMode]    = useState<'single'|'bulk'>('single')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')

  const filtered = words.filter(w => w.word.includes(search))

  async function handleAdd() {
    setError('')
    const word = input.trim()
    if (!word) { setError('ワードを入力してください'); return }
    if (words.some(w => w.word === word)) { setError('すでに登録されています'); return }
    setLoading(true)
    const { data, error: err } = await supabase.from('ng_words').insert({ word }).select().single()
    setLoading(false)
    if (err) { setError('登録に失敗しました'); return }
    setWords(prev => [data, ...prev])
    setInput('')
  }

  async function handleBulkAdd() {
    setError('')
    const newWords = [...new Set(
      bulk.split(/[\n,、，]/).map(w => w.trim()).filter(w => w.length > 0)
    )].filter(w => !words.some(existing => existing.word === w))

    if (newWords.length === 0) { setError('新しいワードがありません'); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('ng_words')
      .insert(newWords.map(word => ({ word })))
      .select()
    setLoading(false)
    if (err) { setError('登録に失敗しました: ' + err.message); return }
    setWords(prev => [...(data||[]), ...prev])
    setBulk('')
  }

  async function handleDelete(id: string) {
    await supabase.from('ng_words').delete().eq('id', id)
    setWords(prev => prev.filter(w => w.id !== id))
  }

  async function handleDeleteAll() {
    if (!confirm(`${words.length}件のNGワードをすべて削除しますか？`)) return
    await supabase.from('ng_words').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setWords([])
  }

  return (
    <div>
      {/* 説明 */}
      <div style={{background:'#fefce8',border:'1px solid #fde68a',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:12,color:'#92400e',lineHeight:1.7}}>
        登録したワードは投稿・コメント時にチェックされます。含まれている場合は投稿をブロックします。<br/>
        大文字・小文字は区別しません。
      </div>

      {/* 入力モード切替 */}
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        <button onClick={()=>setMode('single')} style={btn(mode==='single'?'#fff':'#64748b',mode==='single'?'#F26A21':'#fff',mode==='single'?'#F26A21':'#e2e8f0')}>
          1件ずつ追加
        </button>
        <button onClick={()=>setMode('bulk')} style={btn(mode==='bulk'?'#fff':'#64748b',mode==='bulk'?'#F26A21':'#fff',mode==='bulk'?'#F26A21':'#e2e8f0')}>
          まとめて追加
        </button>
      </div>

      {/* 入力エリア */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'16px',marginBottom:16}}>
        {mode === 'single' ? (
          <div style={{display:'flex',gap:8}}>
            <input
              value={input}
              onChange={e=>{setInput(e.target.value);setError('')}}
              onKeyDown={e=>e.key==='Enter'&&handleAdd()}
              placeholder="NGワードを入力..."
              style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none'}}
            />
            <button onClick={handleAdd} disabled={loading||!input.trim()}
              style={{...btn('#fff','#F26A21','#F26A21'),opacity:loading||!input.trim()?0.5:1}}>
              {loading?'追加中...':'追加'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>改行・カンマ・読点で区切って複数入力できます</div>
            <textarea
              value={bulk}
              onChange={e=>{setBulk(e.target.value);setError('')}}
              rows={5}
              placeholder={'例：\nバカ\nアホ、クズ\n死ね'}
              style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}
            />
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button onClick={handleBulkAdd} disabled={loading||!bulk.trim()}
                style={{...btn('#fff','#F26A21','#F26A21'),opacity:loading||!bulk.trim()?0.5:1}}>
                {loading?'追加中...':'まとめて追加'}
              </button>
            </div>
          </div>
        )}
        {error && <div style={{fontSize:11,color:'#ef4444',marginTop:8}}>{error}</div>}
      </div>

      {/* 一覧 */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f8fafc'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>登録済みNGワード（{words.length}件）</span>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="検索..."
              style={{padding:'5px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:12,outline:'none',width:120}}
            />
            {words.length > 0 && (
              <button onClick={handleDeleteAll} style={btn('#dc2626','#fef2f2','#fca5a5')}>
                全削除
              </button>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{padding:'48px',textAlign:'center',color:'#94a3b8',fontSize:13}}>
            {search ? '該当するワードがありません' : 'NGワードが登録されていません'}
          </div>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap',gap:8,padding:'16px'}}>
            {filtered.map(w => (
              <div key={w.id} style={{display:'inline-flex',alignItems:'center',gap:6,background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:20,padding:'4px 12px'}}>
                <span style={{fontSize:12,color:'#dc2626',fontWeight:600}}>{w.word}</span>
                <button onClick={()=>handleDelete(w.id)}
                  style={{width:16,height:16,borderRadius:'50%',border:'none',background:'#fca5a5',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,padding:0,lineHeight:1}}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
