-- Public bucket for guest-facing documents (itineraries, info packs).
-- Readable by anyone with the link; writes only via the service role
-- (the admin edge function), never directly from the browser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guest-files',
  'guest-files',
  true,
  20971520, -- 20 MB
  array['application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "guest files are publicly readable" on storage.objects;
create policy "guest files are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'guest-files');

-- No insert/update/delete policies for anon or authenticated: uploads and
-- deletions happen only through the admin edge function (service role).
drop policy if exists "guest files anon insert" on storage.objects;
drop policy if exists "guest files anon update" on storage.objects;
drop policy if exists "guest files anon delete" on storage.objects;
