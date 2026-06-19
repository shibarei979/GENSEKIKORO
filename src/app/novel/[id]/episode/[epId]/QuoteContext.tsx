'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface QuoteContextValue {
  quotedText: string | null
  setQuotedText: (text: string | null) => void
}

const QuoteContext = createContext<QuoteContextValue | null>(null)

// 話のページ全体を囲み、本文の引用クリックとコメント欄のプレビューを
// 同じ状態（quotedText）で連携させるためのProvider。
export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quotedText, setQuotedText] = useState<string | null>(null)
  return (
    <QuoteContext.Provider value={{ quotedText, setQuotedText }}>
      {children}
    </QuoteContext.Provider>
  )
}

export function useQuote() {
  const ctx = useContext(QuoteContext)
  // Provider外で使われた場合は無害なダミーを返す（既存ページに影響を出さないため）
  if (!ctx) {
    return { quotedText: null as string | null, setQuotedText: () => {} }
  }
  return ctx
}
