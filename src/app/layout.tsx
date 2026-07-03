import type { Metadata } from 'next'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: '原石航路 - ライトノベル投稿サイト',
  description: 'まだ知られていない物語の原石を、読者とともに発掘するライトノベル投稿サイト。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&family=Zen+Maru+Gothic:wght@400;700&family=BIZ+UDPGothic:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{background:'#FFF9F2'}} className="font-sans bg-bg text-text antialiased">
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6967115026241459"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
