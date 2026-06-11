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
        primary:  '#F26A21',
        'primary-dark': '#d95a18',
        bg:       '#FFF9F2',
        'bg-sub': '#FFF1E6',
        card:     '#FFFFFF',
        border:   '#F0D9C9',
        text:     '#2B211B',
        muted:    '#77706A',
        faint:    '#B8AEA8',
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
