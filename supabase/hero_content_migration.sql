-- Create hero_content table
create table if not exists public.hero_content (
  id uuid primary key default gen_random_uuid(),
  subtitle_normal text not null default 'Crafted with passion, inspired by timeless artistry — Horof brings warmth, creativity, and elegance into every corner of your home.',
  subtitle_bold text not null default 'DIY • HANDMADE • DECOR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert a default row (only if table is empty)
insert into public.hero_content (subtitle_normal, subtitle_bold)
select
  'Crafted with passion, inspired by timeless artistry — Horof brings warmth, creativity, and elegance into every corner of your home.',
  'DIY • HANDMADE • DECOR'
where not exists (select 1 from public.hero_content);

-- Enable Row Level Security
alter table public.hero_content enable row level security;

-- Allow public read
create policy "Public read hero_content"
  on public.hero_content for select
  using (true);

-- Allow authenticated users to update/insert (admin panel uses authenticated session)
create policy "Authenticated insert hero_content"
  on public.hero_content for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated update hero_content"
  on public.hero_content for update
  using (auth.role() = 'authenticated');
