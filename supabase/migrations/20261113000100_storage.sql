-- ============================================================================
-- CloseLoop — storage for publish media
--
-- Instagram requires the image to be reachable over public HTTPS at publish
-- time, so this bucket is public. Paths contain random UUIDs and files are
-- deleted after publishing, which keeps the bucket from becoming a directory
-- of client work.
--
-- Writes are service-role only: there are deliberately no storage policies for
-- `authenticated`. Uploads are validated and normalised server-side first.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Defence in depth: make sure no client-role policies grant writes.
drop policy if exists post_media_client_insert on storage.objects;
drop policy if exists post_media_client_update on storage.objects;
drop policy if exists post_media_client_delete on storage.objects;
