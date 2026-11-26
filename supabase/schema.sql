create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  thumbnail_url text,
  cover_url text,
  video_url text,
  description text,
  category text not null,
  brand_name text,
  year integer,
  credits text,
  featured boolean default false,
  published boolean default false,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  description text,
  website_url text,
  featured boolean default false,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  portrait_url text,
  biography text,
  skills text[],
  linkedin_url text,
  portfolio_url text,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  project_type text,
  budget text,
  message text not null,
  submission_token uuid not null default gen_random_uuid(),
  status text default 'new',
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.inquiries add column if not exists phone text;
alter table public.inquiries add column if not exists submission_token uuid;
update public.inquiries set submission_token = gen_random_uuid() where submission_token is null;
alter table public.inquiries alter column submission_token set default gen_random_uuid();
alter table public.inquiries alter column submission_token set not null;
create unique index if not exists inquiries_submission_token_idx
on public.inquiries (submission_token);

create table if not exists public.site_settings (
  id integer primary key default 1,
  homepage_headline text,
  about_text text,
  vision text,
  mission text,
  contact_email text,
  linkedin_url text,
  instagram_url text,
  youtube_url text,
  footer_description text,
  updated_at timestamptz default now(),
  constraint only_single_settings_row check (id = 1)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Add only trusted admin account IDs to this table after creating them in Supabase Auth.

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.projects enable row level security;
alter table public.brands enable row level security;
alter table public.team_members enable row level security;
alter table public.inquiries enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Published projects are public" on public.projects;
drop policy if exists "Brands are public" on public.brands;
drop policy if exists "Team is public" on public.team_members;
drop policy if exists "Settings are public" on public.site_settings;
drop policy if exists "Anyone can submit inquiries" on public.inquiries;
drop policy if exists "Admins manage projects" on public.projects;
drop policy if exists "Admins manage brands" on public.brands;
drop policy if exists "Admins manage team" on public.team_members;
drop policy if exists "Admins manage inquiries" on public.inquiries;
drop policy if exists "Admins update inquiries" on public.inquiries;
drop policy if exists "Admins delete inquiries" on public.inquiries;
drop policy if exists "Admins manage settings" on public.site_settings;
drop policy if exists "Public media read" on storage.objects;
drop policy if exists "Authenticated media upload" on storage.objects;
drop policy if exists "Authenticated media update" on storage.objects;
drop policy if exists "Authenticated media delete" on storage.objects;
drop policy if exists "Admin media upload" on storage.objects;
drop policy if exists "Admin media update" on storage.objects;
drop policy if exists "Admin media delete" on storage.objects;

create policy "Published projects are public"
on public.projects for select using (published = true);
create policy "Brands are public"
on public.brands for select using (true);
create policy "Team is public"
on public.team_members for select using (true);
create policy "Settings are public"
on public.site_settings for select using (true);
create policy "Anyone can submit inquiries"
on public.inquiries for insert with check (true);

create policy "Admins manage projects"
on public.projects for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage brands"
on public.brands for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage team"
on public.team_members for all using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage inquiries"
on public.inquiries for select using ((select public.is_admin()));
create policy "Admins update inquiries"
on public.inquiries for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete inquiries"
on public.inquiries for delete using ((select public.is_admin()));
create policy "Admins manage settings"
on public.site_settings for all using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

create policy "Public media read"
on storage.objects for select using (bucket_id = 'media');
create policy "Admin media upload"
on storage.objects for insert with check (bucket_id = 'media' and (select public.is_admin()));
create policy "Admin media update"
on storage.objects for update using (bucket_id = 'media' and (select public.is_admin()));
create policy "Admin media delete"
on storage.objects for delete using (bucket_id = 'media' and (select public.is_admin()));
