-- ============================================================
--  Rawalpindi K LTD — Supabase schema
--  Run this once in Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Admin allow-list -----------------------------------------
-- Only emails in this table can add / edit / delete cars.
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- (no policies on purpose: nobody can read/write it through the API)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. Cars ------------------------------------------------------
create table if not exists public.cars (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  make          text not null,
  model         text not null,
  variant       text,
  year          int,
  price         numeric,
  mileage       int,
  engine        text,
  transmission  text,
  fuel          text,
  body_type     text,
  drive         text,
  color         text,
  description   text,
  cover_image   text,
  images        text[] not null default '{}',
  status        text not null default 'available'
                check (status in ('available', 'reserved', 'sold')),
  featured      boolean not null default false,
  published     boolean not null default true
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cars_touch on public.cars;
create trigger cars_touch before update on public.cars
for each row execute function public.touch_updated_at();

alter table public.cars enable row level security;

drop policy if exists "public read published" on public.cars;
create policy "public read published" on public.cars
  for select using (published = true or public.is_admin());

drop policy if exists "admin insert" on public.cars;
create policy "admin insert" on public.cars
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin update" on public.cars;
create policy "admin update" on public.cars
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete" on public.cars;
create policy "admin delete" on public.cars
  for delete to authenticated using (public.is_admin());

-- 3. Image storage --------------------------------------------
insert into storage.buckets (id, name, public)
values ('cars', 'cars', true)
on conflict (id) do update set public = true;

drop policy if exists "admin upload car images" on storage.objects;
create policy "admin upload car images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cars' and public.is_admin());

drop policy if exists "admin update car images" on storage.objects;
create policy "admin update car images" on storage.objects
  for update to authenticated
  using (bucket_id = 'cars' and public.is_admin());

drop policy if exists "admin list car images" on storage.objects;
create policy "admin list car images" on storage.objects
  for select to authenticated
  using (bucket_id = 'cars' and public.is_admin());

drop policy if exists "admin delete car images" on storage.objects;
create policy "admin delete car images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cars' and public.is_admin());

-- 4. Add yourself as an admin ---------------------------------
-- Replace with the email you will log in with, then run:
-- insert into public.admins (email) values ('you@example.com');
