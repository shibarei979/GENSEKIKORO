'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

export default function RandomVoyageButton() {
  const [loading, setLoading] = useState(false)
  const [novel, setNovel] = useState(null as any)
  const [mounted, setMounted] = useState(false)

  useState(() => { setMounted(true) })

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/random-voyage')
      const data = await res.json()
      if (data.novel) setNovel(data.novel)
    } catch (e) {}
    setLoading(false)
  }

  return (
    <>
      <button onClick={handleClick} disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 700, color: 'var(--color-bg-card)',
          background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-dark))',
          border: 'none',
          borderRadius: 16, padding: '7px 16px',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(242,106,33,0.35)',
          opacity: loading ? 0.7 : 1,
        }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-bg-card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
          <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="8 21 3 21 3 16"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>
        </svg>
        {loading ? '航海中...' : 'ランダム航海'}
      </button>

      {novel && mounted && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setNovel(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--color-bg-card)', borderRadius: 16, width: '100%', maxWidth: 420,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-brand) 0%, #ff8c4a 100%)', padding: '16px 20px', color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, marginBottom: 4 }}>未発掘の原石を見つけました</div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{novel.title}</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: 'var(--color-brand-light)', color: 'var(--color-brand)', border: '1px solid var(--color-tag-border)', padding: '2px 8px', borderRadius: 4 }}>{novel.genre}</span>
                {novel.novel_type && <span style={{ fontSize: 11, background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid var(--color-info-border)', padding: '2px 8px', borderRadius: 4 }}>{novel.novel_type}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>作者：{novel.display_name}</div>
              {(novel.catchcopy || novel.summary) && (
                <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.8, marginBottom: 16, padding: '10px 12px', background: 'var(--color-bg)', borderRadius: 8, borderLeft: '3px solid var(--color-brand-border)' }}>
                  {novel.catchcopy || novel.summary}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleClick} disabled={loading}
                  style={{ flex: 1, padding: '11px', border: '1.5px solid var(--color-brand)', borderRadius: 10, background: 'var(--color-bg-card)', color: 'var(--color-brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  もう一度
                </button>
                <Link href={`/novel/${novel.id}`}
                  style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, background: 'var(--color-brand)', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                  読みに行く
                </Link>
              </div>
              <button onClick={() => setNovel(null)}
                style={{ width: '100%', marginTop: 8, padding: '8px', background: 'none', border: 'none', color: 'var(--color-text-faint)', fontSize: 12, cursor: 'pointer' }}>
                閉じる
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
