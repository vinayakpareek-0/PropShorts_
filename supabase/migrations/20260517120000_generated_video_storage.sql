insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generated-videos', 'generated-videos', true, 104857600, array['video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "generated_videos_public_read" on storage.objects;
create policy "generated_videos_public_read"
on storage.objects for select
using (bucket_id = 'generated-videos');

drop policy if exists "generated_videos_user_insert_own_folder" on storage.objects;
create policy "generated_videos_user_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'generated-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "generated_videos_user_update_own_folder" on storage.objects;
create policy "generated_videos_user_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'generated-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'generated-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
