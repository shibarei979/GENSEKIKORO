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
          background: 'radial-gradient(circle at 18% 15%, #FFD9B0 0%, transparent 45%), radial-gradient(circle at 85% 90%, #FFC89A 0%, transparent 50%), linear-gradient(160deg, #FFF6EC 0%, #FFE3C5 60%, #FFD2A6 100%)',
          position: 'relative',
        }}
      >
        {/* 左：装飾の縦帯（背表紙のような雰囲気） */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 26,
          background: 'linear-gradient(180deg, #F26A21 0%, #D9531A 100%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', left: 26, top: 0, bottom: 0, width: 6,
          background: 'rgba(0,0,0,0.12)',
          display: 'flex',
        }} />

        {/* 内側の装飾枠 */}
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

        {/* 右上：大きな装飾原石マーク */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,106,33,0.18) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* コンテンツ本体 */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          padding: '76px 96px 76px 110px',
          width: '100%', height: '100%',
          justifyContent: 'center',
        }}>
          {/* ロゴ・サイト名 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14,
              background: 'linear-gradient(135deg, #F26A21, #D9531A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 26, fontWeight: 700,
              boxShadow: '0 4px 10px rgba(217,83,26,0.35)',
            }}>原</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#D9531A', letterSpacing: 1 }}>原石航路</div>
          </div>

          {/* タグ */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
            {genre && (
              <div style={{
                fontSize: 23, color: '#fff', background: 'linear-gradient(135deg, #F26A21, #D9531A)',
                borderRadius: 999, padding: '9px 26px', display: 'flex', fontWeight: 600,
                boxShadow: '0 3px 8px rgba(217,83,26,0.3)',
              }}>{genre}</div>
            )}
            {novelType && (
              <div style={{
                fontSize: 23, color: '#1d4ed8', background: '#fff',
                border: '2.5px solid #93c5fd', borderRadius: 999, padding: '7px 24px', display: 'flex', fontWeight: 600,
              }}>{novelType}</div>
            )}
          </div>

          {/* タイトル */}
          <div style={{
            fontSize: title.length > 20 ? 56 : 68,
            fontWeight: 800, color: '#2B1A0F', lineHeight: 1.25,
            marginBottom: 32, display: 'flex', flexWrap: 'wrap',
            maxWidth: 980,
            textShadow: '0 2px 0 rgba(255,255,255,0.5)',
          }}>
            {title.length > 38 ? title.slice(0, 38) + '…' : title}
          </div>

          {/* キャッチコピー */}
          {catchcopy && (
            <div style={{
              fontSize: 30, color: '#6b4423', lineHeight: 1.7,
              display: 'flex', maxWidth: 880,
              background: 'rgba(255,255,255,0.55)',
              borderLeft: '6px solid #F26A21',
              borderRadius: '4px 14px 14px 4px',
              padding: '18px 28px',
            }}>
              {catchcopy.length > 56 ? catchcopy.slice(0, 56) + '…' : catchcopy}
            </div>
          )}

          {/* 作者名 */}
          {authorName && (
            <div style={{
              position: 'absolute', bottom: 56, right: 56,
              fontSize: 26, color: '#8a6a4a', display: 'flex',
              alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.6)', borderRadius: 999, padding: '8px 22px',
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
