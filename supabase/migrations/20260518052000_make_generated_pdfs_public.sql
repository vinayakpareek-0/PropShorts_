update storage.buckets
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf']
where id = 'generated-pdfs';
