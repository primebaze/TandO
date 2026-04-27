create extension if not exists pgcrypto with schema extensions;

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

grant usage on schema public to anon, authenticated;
grant execute on function public.get_rsvps_admin(text) to anon, authenticated;

notify pgrst, 'reload schema';