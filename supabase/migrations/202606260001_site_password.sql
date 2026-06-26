-- Server-managed site password (replaces the hardcoded client-side constant).
create extension if not exists pgcrypto with schema extensions;

-- Key/value settings store (holds the hashed site password).
create table if not exists public.site_settings (
	key text primary key,
	value text not null,
	updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

-- Rate-limit log for password attempts (anti-spam).
create table if not exists public.site_access_attempts (
	id uuid primary key default gen_random_uuid(),
	ip_address text,
	success boolean not null default false,
	created_at timestamptz not null default now()
);

alter table public.site_access_attempts enable row level security;
revoke all on public.site_access_attempts from anon, authenticated;

-- Seed with the current password (hashed) so existing guests aren't locked out.
insert into public.site_settings (key, value)
values ('site_password_hash', extensions.crypt('ToTheTaros2026', extensions.gen_salt('bf')))
on conflict (key) do nothing;

-- Verify a submitted password. Rate-limited per IP. Returns true/false.
create or replace function public.verify_site_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
	request_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
	request_ip text := split_part(coalesce(request_headers ->> 'x-forwarded-for', request_headers ->> 'cf-connecting-ip', ''), ',', 1);
	stored text;
	ok boolean;
begin
	-- Block after 15 failed attempts in 10 minutes from the same IP.
	if (
		select count(*)
		from public.site_access_attempts a
		where a.success = false
			and a.created_at > now() - interval '10 minutes'
			and (request_ip = '' or a.ip_address = request_ip)
	) >= 15 then
		raise exception 'Too many attempts. Please wait a few minutes and try again.';
	end if;

	select value into stored from public.site_settings where key = 'site_password_hash';
	ok := stored is not null and stored = extensions.crypt(p_password, stored);

	insert into public.site_access_attempts (ip_address, success)
	values (nullif(request_ip, ''), ok);

	return ok;
end;
$$;

-- Admin sets/changes the site password (validated against admin_access_tokens).
create or replace function public.set_site_password(p_access_code text, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
	if length(coalesce(p_new_password, '')) < 4 then
		raise exception 'Password must be at least 4 characters.';
	end if;

	if not exists (
		select 1
		from public.admin_access_tokens
		where active = true
			and token_hash = extensions.crypt(p_access_code, token_hash)
	) then
		raise exception 'Invalid admin access code';
	end if;

	insert into public.site_settings (key, value, updated_at)
	values ('site_password_hash', extensions.crypt(p_new_password, extensions.gen_salt('bf')), now())
	on conflict (key) do update
		set value = excluded.value, updated_at = now();
end;
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.verify_site_password(text) to anon, authenticated;
grant execute on function public.set_site_password(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
