update storage.buckets
set allowed_mime_types = array['video/mp4', 'audio/mpeg']
where id = 'generated-videos';
