import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = '原石航路'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string; epId: string } }) {
  const supabase = await createClient()
  const [{ data: episode }, { data: novel }] = await Promise.all([
    supabase.from('episodes').select('title, illust_url').eq('id', params.epId).maybeSingle(),
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
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #FFF1E6 0%, #FFE0C8 100%)',
          padding: '60px 70px',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', inset: 28,
          border: '2px solid rgba(242,106,33,0.35)',
          borderRadius: 16,
          display: 'flex',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#F26A21', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 700,
          }}>原</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#F26A21' }}>原石航路</div>
        </div>

        {genre && (
          <div style={{
            fontSize: 22, color: '#F26A21', background: '#fff',
            border: '2px solid #F26A21', borderRadius: 8, padding: '6px 18px',
            display: 'flex', marginBottom: 24, width: 'fit-content',
          }}>{genre}</div>
        )}

        <div style={{
          fontSize: 30, color: '#5a3a20', display: 'flex',
          marginBottom: 14, maxWidth: 1000,
        }}>
          {novelTitle.length > 30 ? novelTitle.slice(0, 30) + '…' : novelTitle}
        </div>

        <div style={{
          fontSize: episodeTitle.length > 20 ? 48 : 56,
          fontWeight: 700, color: '#2B211B', lineHeight: 1.3,
          display: 'flex', maxWidth: 1000,
        }}>
          {episodeTitle.length > 36 ? episodeTitle.slice(0, 36) + '…' : episodeTitle}
        </div>

        {authorName && (
          <div style={{
            position: 'absolute', bottom: 56, right: 70,
            fontSize: 26, color: '#77706A', display: 'flex',
          }}>
            作者：{authorName}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
