import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 新デザイン (home_10) パレットの CSS 変数を参照する。
        // 値は src/app/globals.css → src/styles/home/base.css で解決され、
        // body[data-theme] によりライト / ダークへ自動追従する。
        primary:  'var(--color-brand)',
        'primary-dark': 'var(--color-brand-dark)',
        bg:       'var(--color-bg)',
        'bg-sub': 'var(--color-brand-light)',
        card:     'var(--color-bg-card)',
        border:   'var(--color-brand-border)',
        text:     'var(--color-text)',
        muted:    'var(--color-text-muted)',
        faint:    'var(--color-text-faint)',
        // #fff の使用は廃止。ライトではベースカラー1、
        // ダークでは bg-card / テキスト逆転色としてコントラストを確保する
        white:    'var(--color-bg-card)',
        // gray 系もパレットへ寄せる（明→暗）
        // gray 系はテーマ追従の意味変数へ（ダークでも正しいコントラストになる）
        gray: {
          50:  'var(--color-bg-card)',
          100: 'var(--color-brand-light)',
          200: 'var(--color-brand-border)',
          300: 'var(--color-brand-border)',
          400: 'var(--color-text-faint)',
          500: 'var(--color-text-faint)',
          600: 'var(--color-text-muted)',
          700: 'var(--color-text-muted)',
          800: 'var(--color-text)',
          900: 'var(--color-text)',
        },
      },
      fontFamily: {
        sans:  ['Noto Sans JP', 'sans-serif'],
        serif: ['Noto Serif JP', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
