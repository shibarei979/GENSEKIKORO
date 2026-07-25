/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * React
   */
  reactStrictMode: true,

  /**
   * Security
   */
  poweredByHeader: false,

  /**
   * Images
   */
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  /**
   * Performance
   * 本番ビルドで console.log を除去（error / warn は残す）
   */
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  /**
   * recharts のバンドルを使用コンポーネントのみに最適化
   */
  experimental: {
    optimizePackageImports: ['recharts'],
  },
}
module.exports = nextConfig
