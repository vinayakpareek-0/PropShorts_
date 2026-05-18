alter table public.profiles
  add column if not exists profile_photo_url text,
  add column if not exists website_url text,
  add column if not exists calendar_url text;
