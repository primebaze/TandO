create extension if not exists pgcrypto with schema extensions;

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
			and token_hash = extensions.crypt(access_code, token_hash)
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

grant usage on schema public to anon, authenticated;
grant execute on function public.get_rsvps_admin(text) to anon, authenticated;

notify pgrst, 'reload schema';