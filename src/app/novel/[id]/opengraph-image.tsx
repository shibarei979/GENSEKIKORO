import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = '原石航路'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: novel } = await supabase
    .from('novels')
    .select('title, genre, catchcopy, summary, novel_type, author_id')
    .eq('id', params.id)
    .maybeSingle()

  let authorName = ''
  if (novel?.author_id) {
    const { data: author } = await supabase.from('profiles').select('display_name').eq('user_id', novel.author_id).maybeSingle()
    authorName = author?.display_name || ''
  }

  const title = novel?.title || '原石航路'
  const catchcopy = novel?.catchcopy || novel?.summary || ''
  const genre = novel?.genre || ''
  const novelType = novel?.novel_type || ''

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
        {/* 装飾の枠線 */}
        <div style={{
          position: 'absolute', inset: 28,
          border: '2px solid rgba(242,106,33,0.35)',
          borderRadius: 16,
          display: 'flex',
        }} />

        {/* ロゴ・サイト名 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#F26A21', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 22, fontWeight: 700,
          }}>原</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#F26A21' }}>原石航路</div>
        </div>

        {/* タグ */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {genre && (
            <div style={{
              fontSize: 22, color: '#F26A21', background: '#fff',
              border: '2px solid #F26A21', borderRadius: 8, padding: '6px 18px', display: 'flex',
            }}>{genre}</div>
          )}
          {novelType && (
            <div style={{
              fontSize: 22, color: '#1d4ed8', background: '#fff',
              border: '2px solid #93c5fd', borderRadius: 8, padding: '6px 18px', display: 'flex',
            }}>{novelType}</div>
          )}
        </div>

        {/* タイトル */}
        <div style={{
          fontSize: title.length > 20 ? 48 : 60,
          fontWeight: 700, color: '#2B211B', lineHeight: 1.3,
          marginBottom: 28, display: 'flex', flexWrap: 'wrap',
          maxWidth: 1000,
        }}>
          {title.length > 40 ? title.slice(0, 40) + '…' : title}
        </div>

        {/* キャッチコピー */}
        {catchcopy && (
          <div style={{
            fontSize: 28, color: '#5a3a20', lineHeight: 1.6,
            display: 'flex', maxWidth: 950,
            borderLeft: '5px solid #f5a060', paddingLeft: 20,
          }}>
            {catchcopy.length > 60 ? catchcopy.slice(0, 60) + '…' : catchcopy}
          </div>
        )}

        {/* 作者名 */}
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
