-- Admin: verify code + fetch RSVP recipients for bulk mailing.

create or replace function public.verify_admin_code(p_access_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
	return exists (
		select 1 from public.admin_access_tokens
		where active = true
			and token_hash = extensions.crypt(p_access_code, token_hash)
	);
end;
$$;

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
	select
		lower(trim(r.email)) as email,
		nullif(trim(coalesce(r.title, '') || ' ' || coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), '') as name
	from public.rsvps r
	where r.email is not null
		and trim(r.email) <> ''
		and (
			p_audience = 'all'
			or (p_audience = 'attending' and r.attending = 'yes')
			or (p_audience = 'declined' and r.attending = 'no')
		);
end;
$$;

grant execute on function public.verify_admin_code(text) to anon, authenticated;
grant execute on function public.get_rsvp_recipients(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
