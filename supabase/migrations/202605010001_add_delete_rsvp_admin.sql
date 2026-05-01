create or replace function public.delete_rsvp_admin(
  p_rsvp_id uuid,
  p_access_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1
    from public.admin_access_tokens
    where active = true
      and token_hash = extensions.crypt(p_access_code, token_hash)
  ) then
    raise exception 'Invalid admin access code';
  end if;

  delete from public.rsvps where id = p_rsvp_id;

  if not found then
    raise exception 'RSVP not found';
  end if;

  return true;
end;
$$;

grant execute on function public.delete_rsvp_admin(uuid, text) to anon, authenticated;
notify pgrst, 'reload schema';
