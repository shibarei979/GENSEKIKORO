export type LoginProvider = 'google' | 'email'

export interface Profile {
  user_id: string
  display_name: string
  email: string
  icon_url: string | null
  login_provider: LoginProvider
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Novel {
  id: string
  author_id: string
  title: string
  summary: string | null
  genre: string
  tags: string[]
  is_serial: boolean
  published: boolean
  views: number
  created_at: string
  updated_at: string
  // JOINで付加
  author?: Pick<Profile, 'user_id' | 'display_name' | 'icon_url'>
  counts?: NovelCounts
}

export interface NovelCounts {
  novel_id: string
  like_count: number
  bookmark_count: number
  discover_count: number
  comment_count: number
}

export interface Episode {
  id: string
  novel_id: string
  title: string
  body: string
  preface: string | null
  afterword: string | null
  ep_number: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  novel_id: string
  user_id: string
  body: string
  is_pinned: boolean
  created_at: string
  author?: Pick<Profile, 'display_name' | 'icon_url' | 'user_id'>
}

export const GENRES = [
  '異世界', 'ファンタジー', 'SF', '恋愛', '学園',
  'ミステリー', 'ホラー', '歴史・時代', '日常', 'アクション', 'コメディ', 'その他'
] as const

export type Genre = typeof GENRES[number]
