import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = '原石航路'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string; epId: string } }) {
  const supabase = await createClient()
  const [{ data: episode }, { data: novel }] = await Promise.all([
    supabase.from('episodes').select('title').eq('id', params.epId).maybeSingle(),
    supabase.from('novels').select('title, genre, author_id').eq('id', params.id).maybeSingle(),
  ])

  let authorName = ''
  if (novel?.author_id) {
    const { data: author } = await supabase.from('profiles').select('display_name').eq('user_id', novel.author_id).maybeSingle()
    authorName = author?.display_name || ''
  }

  const novelTitle = novel?.title || '原石航路'
  const episodeTitle = episode?.title || ''
  const genre = novel?.genre || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'radial-gradient(circle at 18% 15%, #FFD9B0 0%, transparent 45%), radial-gradient(circle at 85% 90%, #FFC89A 0%, transparent 50%), linear-gradient(160deg, #FFF6EC 0%, #FFE3C5 60%, #FFD2A6 100%)',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 26,
          background: 'linear-gradient(180deg, var(--color-brand) 0%, #D9531A 100%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', left: 26, top: 0, bottom: 0, width: 6,
          background: 'rgba(0,0,0,0.12)',
          display: 'flex',
        }} />

        <div style={{
          position: 'absolute', top: 40, left: 64, right: 40, bottom: 40,
          border: '3px solid rgba(217,83,26,0.45)',
          borderRadius: 20,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 48, left: 72, right: 48, bottom: 48,
          border: '1px solid rgba(217,83,26,0.25)',
          borderRadius: 14,
          display: 'flex',
        }} />

        <div style={{
          position: 'absolute', top: -60, right: -60, width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--color-brand) 18%, transparent) 0%, transparent 70%)',
          display: 'flex',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          padding: '76px 96px 76px 110px',
          width: '100%', height: '100%',
          justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--color-brand), #D9531A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-inverse)', fontSize: 26, fontWeight: 700,
              boxShadow: '0 4px 10px rgba(217,83,26,0.35)',
            }}>原</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#D9531A', letterSpacing: 1 }}>原石航路</div>
          </div>

          {genre && (
            <div style={{
              fontSize: 22, color: 'var(--color-text-inverse)', background: 'linear-gradient(135deg, var(--color-brand), #D9531A)',
              borderRadius: 999, padding: '8px 24px',
              display: 'flex', marginBottom: 26, width: 'fit-content', fontWeight: 600,
              boxShadow: '0 3px 8px rgba(217,83,26,0.3)',
            }}>{genre}</div>
          )}

          <div style={{
            fontSize: 32, color: '#8a6a4a', display: 'flex',
            marginBottom: 16, maxWidth: 960, fontWeight: 600,
          }}>
            {novelTitle.length > 30 ? novelTitle.slice(0, 30) + '…' : novelTitle}
          </div>

          <div style={{
            fontSize: episodeTitle.length > 20 ? 54 : 64,
            fontWeight: 800, color: '#2B1A0F', lineHeight: 1.3,
            display: 'flex', maxWidth: 980,
            textShadow: '0 2px 0 color-mix(in srgb, var(--base-color-1) 50%, transparent)',
          }}>
            {episodeTitle.length > 34 ? episodeTitle.slice(0, 34) + '…' : episodeTitle}
          </div>

          {authorName && (
            <div style={{
              position: 'absolute', bottom: 56, right: 56,
              fontSize: 26, color: '#8a6a4a', display: 'flex',
              alignItems: 'center', gap: 8,
              background: 'color-mix(in srgb, var(--base-color-1) 60%, transparent)', borderRadius: 999, padding: '8px 22px',
            }}>
              作者：{authorName}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
