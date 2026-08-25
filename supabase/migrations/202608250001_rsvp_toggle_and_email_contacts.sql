-- Admin controls: open/close RSVP registration, and manually-added email
-- contacts so the couple can email people who never RSVP'd.

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- 1. RSVP registration open / closed
-- ============================================================

-- Public read: is the RSVP form accepting submissions? Defaults to open.
create or replace function public.get_rsvp_open()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(
    (select s.value = 'true' from public.site_settings s where s.key = 'rsvp_open'),
    true
  );
$$;

-- Admin toggles registration on/off.
create or replace function public.set_rsvp_open(p_access_code text, p_open boolean)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(p_access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  insert into public.site_settings (key, value, updated_at)
  values ('rsvp_open', case when p_open then 'true' else 'false' end, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();

  return p_open;
end;
$$;

grant execute on function public.get_rsvp_open() to anon, authenticated;
grant execute on function public.set_rsvp_open(text, boolean) to anon, authenticated;

-- ============================================================
-- 2. Manually-added email contacts (people who never RSVP'd)
-- ============================================================

create table if not exists public.email_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create unique index if not exists email_contacts_email_key
  on public.email_contacts (lower(trim(email)));

alter table public.email_contacts enable row level security;
revoke all on public.email_contacts from anon, authenticated;

create or replace function public.get_email_contacts(p_access_code text)
returns table (id uuid, email text, name text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(p_access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  return query
  select c.id, c.email, c.name, c.created_at
  from public.email_contacts c
  order by c.created_at desc;
end;
$$;

create or replace function public.add_email_contact(
  p_access_code text,
  p_email text,
  p_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  new_id uuid;
begin
  if not exists (
    select 1 from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(p_access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  if normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Please enter a valid email address.';
  end if;

  insert into public.email_contacts (email, name)
  values (normalized_email, nullif(trim(coalesce(p_name, '')), ''))
  on conflict (lower(trim(email))) do update
    set name = coalesce(excluded.name, email_contacts.name)
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.delete_email_contact(p_access_code text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(p_access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  delete from public.email_contacts where id = p_id;
end;
$$;

grant execute on function public.get_email_contacts(text) to anon, authenticated;
grant execute on function public.add_email_contact(text, text, text) to anon, authenticated;
grant execute on function public.delete_email_contact(text, uuid) to anon, authenticated;

-- ============================================================
-- 3. Recipients now include manual contacts
--    'all' = RSVPs + manual · 'attending'/'declined' = RSVPs only
--    'contacts' = manual only
-- ============================================================

create or replace function public.get_rsvp_recipients(p_access_code text, p_audience text default 'all')
returns table (email text, name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(p_access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  return query
  select x.email, x.name
  from (
    select
      lower(trim(r.email)) as email,
      nullif(trim(coalesce(r.title, '') || ' ' || coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), '') as name,
      r.submitted_at as sort_at
    from public.rsvps r
    where p_audience in ('all', 'attending', 'declined')
      and r.email is not null
      and trim(r.email) <> ''
      and (
        p_audience = 'all'
        or (p_audience = 'attending' and r.attending = 'yes')
        or (p_audience = 'declined' and r.attending = 'no')
      )
    union all
    select
      lower(trim(c.email)) as email,
      nullif(trim(coalesce(c.name, '')), '') as name,
      c.created_at as sort_at
    from public.email_contacts c
    where p_audience in ('all', 'contacts')
  ) x
  order by x.sort_at desc;
end;
$$;

notify pgrst, 'reload schema';

-- ============================================================
-- 4. Block RSVP submissions while registration is closed
-- ============================================================

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

  if not public.get_rsvp_open() then
    raise exception 'RSVP registration is currently closed.';
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

notify pgrst, 'reload schema';
