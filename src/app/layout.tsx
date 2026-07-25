import type { Metadata } from 'next'
import Script from 'next/script'

import BackgroundCanvas from '@/components/layout/background-canvas'
import { appConfig } from '@/config'
import { createClient } from '@/lib/supabase/server'

import '@/app/globals.css'
// 新デザイン (home_10) のスタイル。サイト全体へ適用する（読込順は元 index.html と同一）
import '@/styles/home/base.css'
import '@/styles/home/loading.css'
import '@/styles/home/ui.css'
import '@/styles/home/header.css'
import '@/styles/home/bookshelf.css'
import '@/styles/home/book_info.css'
import '@/styles/home/guide.css'
import '@/styles/home/notice.css'
import '@/styles/home/works.css'
import '@/styles/home/reading_list.css'
import '@/styles/home/footer.css'
import '@/styles/home/responsive.css'

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: appConfig.title,
  description: appConfig.description,
  openGraph: {
    title: appConfig.title,
    description: appConfig.description,
    images: ['/og-image.png'],
  },
}

/**
 * テーマ・ビューを描画前に localStorage から復元する（ちらつき防止）。
 * - localStorage("theme")   : light | dark … 旧サイトからのキーを継続利用
 * - localStorage("gsk_view"): reader | writer
 * - 旧実装が <html data-theme> を使っていた名残りがあれば除去して一本化する
 */
const restoreScript = `(function(){try{
var b=document.body;
var t=localStorage.getItem('theme');if(t==='dark'||t==='light')b.dataset.theme=t;
var v=localStorage.getItem('gsk_view');if(v==='reader'||v==='writer')b.dataset.view=v;
document.documentElement.removeAttribute('data-theme');
}catch(e){}})();`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ログイン状態はサーバーが確定し、body の data-auth に出力する
  // （表示切替は CSS の body[data-auth] .guest / .login が担当）
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="ja">
      <head>
        {/* フォント取得を先行接続してレンダリングブロックを短縮 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&family=Zen+Maru+Gothic:wght@400;700&family=BIZ+UDPGothic:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        data-theme="light"
        data-view="reader"
        data-auth={user ? 'login' : 'guest'}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: restoreScript }} />
        {/* 背景キャンバス（ライト: 紙 / ダーク: 装丁）。全ページ共通 */}
        <BackgroundCanvas />
        {children}
        {/* サイト共通挙動（メニュー開閉・テーマ / ビュートグル） */}
        <Script src="/site.js" strategy="afterInteractive" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6967115026241459"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
