-- ============================================================
-- 原石航路 - Supabase データベーススキーマ
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- ============================================================

-- ============================================================
-- 1. profiles テーブル（Supabase Auth と連携）
-- ============================================================
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null,
  email          text not null,
  icon_url       text,
  login_provider text not null check (login_provider in ('google','email')),
  bio            text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at 自動更新トリガー
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 新規ユーザー登録時に profiles を自動作成
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, display_name, email, icon_url, login_provider)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    case
      when new.app_metadata->>'provider' = 'google' then 'google'
      else 'email'
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. novels テーブル（作品）
-- ============================================================
create table if not exists public.novels (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles(user_id) on delete cascade,
  title        text not null,
  summary      text,
  genre        text not null,
  tags         text[] default '{}',
  is_serial    boolean not null default true,
  published    boolean not null default false,
  views        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger novels_updated_at
  before update on public.novels
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 3. episodes テーブル（話）
-- ============================================================
create table if not exists public.episodes (
  id         uuid primary key default gen_random_uuid(),
  novel_id   uuid not null references public.novels(id) on delete cascade,
  title      text not null,
  body       text not null,
  preface    text,
  afterword  text,
  ep_number  integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (novel_id, ep_number)
);

-- ============================================================
-- 4. likes テーブル（いいね）
-- ============================================================
create table if not exists public.likes (
  user_id   uuid not null references public.profiles(user_id) on delete cascade,
  novel_id  uuid not null references public.novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

-- ============================================================
-- 5. bookmarks テーブル（ブックマーク）
-- ============================================================
create table if not exists public.bookmarks (
  user_id   uuid not null references public.profiles(user_id) on delete cascade,
  novel_id  uuid not null references public.novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

-- ============================================================
-- 6. discovers テーブル（原石発掘）
-- ============================================================
create table if not exists public.discovers (
  user_id   uuid not null references public.profiles(user_id) on delete cascade,
  novel_id  uuid not null references public.novels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, novel_id)
);

-- ============================================================
-- 7. comments テーブル
-- ============================================================
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  novel_id   uuid not null references public.novels(id) on delete cascade,
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  body       text not null,
  is_pinned  boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 8. カウント集計ビュー（パフォーマンス用）
-- ============================================================
create or replace view public.novel_counts as
select
  n.id as novel_id,
  count(distinct l.user_id) as like_count,
  count(distinct b.user_id) as bookmark_count,
  count(distinct d.user_id) as discover_count,
  count(distinct c.id)      as comment_count
from public.novels n
left join public.likes     l on l.novel_id = n.id
left join public.bookmarks b on b.novel_id = n.id
left join public.discovers d on d.novel_id = n.id
left join public.comments  c on c.novel_id = n.id
group by n.id;

-- ============================================================
-- 9. Row Level Security（RLS）
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.novels    enable row level security;
alter table public.episodes  enable row level security;
alter table public.likes     enable row level security;
alter table public.bookmarks enable row level security;
alter table public.discovers enable row level security;
alter table public.comments  enable row level security;

-- profiles: 全員読み取り可、本人のみ更新可
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = user_id);

-- novels: 公開作品は全員読み取り可、作者のみ書き込み
create policy "novels_select" on public.novels for select using (published = true or auth.uid() = author_id);
create policy "novels_insert" on public.novels for insert with check (auth.uid() = author_id);
create policy "novels_update" on public.novels for update using (auth.uid() = author_id);
create policy "novels_delete" on public.novels for delete using (auth.uid() = author_id);

-- episodes: 親novelのルールに従う
create policy "episodes_select" on public.episodes for select
  using (exists (select 1 from public.novels n where n.id = novel_id and (n.published = true or n.author_id = auth.uid())));
create policy "episodes_insert" on public.episodes for insert
  with check (exists (select 1 from public.novels n where n.id = novel_id and n.author_id = auth.uid()));
create policy "episodes_update" on public.episodes for update
  using (exists (select 1 from public.novels n where n.id = novel_id and n.author_id = auth.uid()));
create policy "episodes_delete" on public.episodes for delete
  using (exists (select 1 from public.novels n where n.id = novel_id and n.author_id = auth.uid()));

-- likes/bookmarks/discovers: 本人のみ
create policy "likes_all"     on public.likes     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookmarks_all" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "discovers_all" on public.discovers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- comments: 全員読み取り可、本人投稿・削除
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.comments for delete using (auth.uid() = user_id);
