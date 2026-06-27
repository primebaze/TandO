-- Bulk-mail recipients ordered by most recent RSVP first.
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
		)
	order by r.submitted_at desc;
end;
$$;

notify pgrst, 'reload schema';
