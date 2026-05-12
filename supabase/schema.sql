-- キミイロ TikTok成長ダッシュボード - Supabase Schema

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tiktok_id text not null unique,
  tiktok_display_name text default '',
  purpose text default 'メインアカウント',
  status text default '運用中',
  start_date date,
  created_at timestamptz default now(),
  note text default ''
);

create table if not exists follower_records (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  record_date date not null,
  follower_count integer not null check (follower_count >= 0),
  note text default '',
  created_at timestamptz default now(),
  unique(character_id, record_date)
);

create index if not exists idx_records_character on follower_records(character_id);
create index if not exists idx_records_date on follower_records(record_date desc);

-- RLS (Row Level Security) - public access for this internal tool
alter table characters enable row level security;
alter table follower_records enable row level security;

create policy "Allow all on characters" on characters for all using (true) with check (true);
create policy "Allow all on follower_records" on follower_records for all using (true) with check (true);
