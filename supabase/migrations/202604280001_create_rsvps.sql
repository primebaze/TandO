create extension if not exists pgcrypto with schema extensions;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  attending text not null check (attending in ('yes', 'no')),
  title text,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  allergies text,
  companions jsonb not null default '[]'::jsonb,
  song text,
  message text,
  notification_email text not null default 'primebazeweb@gmail.com',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.rsvps enable row level security;

drop policy if exists "Anyone can submit an RSVP" on public.rsvps;
create policy "Anyone can submit an RSVP"
  on public.rsvps
  for insert
  to anon, authenticated
  with check (true);

revoke all on public.rsvps from anon, authenticated;
grant insert on public.rsvps to anon, authenticated;

create table if not exists public.admin_access_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_access_tokens enable row level security;
revoke all on public.admin_access_tokens from anon, authenticated;

create or replace function public.get_rsvps_admin(access_code text)
returns table (
  id uuid,
  attending text,
  title text,
  first_name text,
  last_name text,
  email text,
  phone text,
  allergies text,
  companions jsonb,
  song text,
  message text,
  notification_email text,
  submitted_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1
    from public.admin_access_tokens
    where active = true
      and token_hash = crypt(access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  return query
  select
    r.id,
    r.attending,
    r.title,
    r.first_name,
    r.last_name,
    r.email,
    r.phone,
    r.allergies,
    r.companions,
    r.song,
    r.message,
    r.notification_email,
    r.submitted_at,
    r.created_at
  from public.rsvps r
  order by r.submitted_at desc;
end;
$$;

revoke all on function public.get_rsvps_admin(text) from public;
grant execute on function public.get_rsvps_admin(text) to anon, authenticated;

-- Run this once in Supabase SQL editor after choosing your admin code:
-- insert into public.admin_access_tokens (label, token_hash)
-- values ('primebazeweb@gmail.com', extensions.crypt('CHANGE_THIS_ADMIN_CODE', extensions.gen_salt('bf')));
