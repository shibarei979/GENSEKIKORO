import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '原石航路 - ライトノベル投稿サイト',
  description: 'まだ知られていない物語の原石を、読者とともに発掘するライトノベル投稿サイト。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{background:'#FFF9F2'}} className="font-sans bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  )
}
