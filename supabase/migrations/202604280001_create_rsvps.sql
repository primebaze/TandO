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
drop policy if exists "submit_rsvp function can insert RSVPs" on public.rsvps;
create policy "submit_rsvp function can insert RSVPs"
  on public.rsvps
  for insert
  to postgres
  with check (true);

revoke all on public.rsvps from anon, authenticated;

create table if not exists public.rsvp_submission_events (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.rsvp_submission_events enable row level security;
revoke all on public.rsvp_submission_events from anon, authenticated;

create or replace function public.submit_rsvp(
  p_attending text,
  p_title text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_allergies text default null,
  p_companions jsonb default '[]'::jsonb,
  p_song text default null,
  p_message text default null,
  p_honeypot text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_phone text := trim(p_phone);
  request_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  request_ip text := split_part(coalesce(request_headers ->> 'x-forwarded-for', request_headers ->> 'cf-connecting-ip', ''), ',', 1);
  new_rsvp_id uuid;
begin
  if length(trim(coalesce(p_honeypot, ''))) > 0 then
    return gen_random_uuid();
  end if;

  if p_attending not in ('yes', 'no') then
    raise exception 'Please choose whether you can attend.';
  end if;

  if normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Please enter a valid email address.';
  end if;

  if exists (
    select 1
    from public.rsvp_submission_events e
    where e.created_at > now() - interval '10 minutes'
      and (
        e.email = normalized_email
        or e.phone = normalized_phone
        or (request_ip <> '' and e.ip_address = request_ip)
      )
    group by coalesce(e.email, ''), coalesce(e.phone, ''), coalesce(e.ip_address, '')
    having count(*) >= 3
  ) then
    raise exception 'Please wait before submitting another RSVP.';
  end if;

  insert into public.rsvp_submission_events (email, phone, ip_address)
  values (normalized_email, normalized_phone, nullif(request_ip, ''));

  insert into public.rsvps (
    attending,
    title,
    first_name,
    last_name,
    email,
    phone,
    allergies,
    companions,
    song,
    message,
    notification_email
  ) values (
    p_attending,
    nullif(trim(coalesce(p_title, '')), ''),
    trim(p_first_name),
    trim(p_last_name),
    normalized_email,
    normalized_phone,
    nullif(trim(coalesce(p_allergies, '')), ''),
    coalesce(p_companions, '[]'::jsonb),
    nullif(trim(coalesce(p_song, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    'primebazeweb@gmail.com'
  )
  returning id into new_rsvp_id;

  return new_rsvp_id;
end;
$$;

grant execute on function public.submit_rsvp(text, text, text, text, text, text, text, jsonb, text, text, text) to anon, authenticated;

create table if not exists public.admin_access_tokens (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  token_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_access_tokens enable row level security;
revoke all on public.admin_access_tokens from anon, authenticated;

create table if not exists public.admin_access_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_address text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin_access_attempts enable row level security;
revoke all on public.admin_access_attempts from anon, authenticated;

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
declare
  request_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  request_ip text := split_part(coalesce(request_headers ->> 'x-forwarded-for', request_headers ->> 'cf-connecting-ip', ''), ',', 1);
begin
  if (
    select count(*)
    from public.admin_access_attempts a
    where a.success = false
      and a.created_at > now() - interval '10 minutes'
      and (request_ip = '' or a.ip_address = request_ip)
  ) >= 5 then
    raise exception 'Too many admin attempts. Please wait and try again.';
  end if;

  if not exists (
    select 1
    from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(access_code, token_hash)
  ) then
    insert into public.admin_access_attempts (ip_address, success)
    values (nullif(request_ip, ''), false);

    raise exception 'Invalid admin access code';
  end if;

  insert into public.admin_access_attempts (ip_address, success)
  values (nullif(request_ip, ''), true);

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
