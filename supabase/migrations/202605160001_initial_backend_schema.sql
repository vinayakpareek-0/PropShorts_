create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  phone text,
  email text,
  role text not null default 'broker' check (role in ('broker', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text,
  input_type text not null check (input_type in ('text', 'voice', 'url')),
  raw_input text,
  source_url text,
  audio_file_url text,
  transcribed_text text,
  requirements_json jsonb,
  refined_requirements_json jsonb,
  status text not null default 'draft' check (status in ('draft', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requirement_id uuid not null references public.client_requirements(id) on delete cascade,
  status text not null default 'processing' check (status in ('draft', 'processing', 'completed', 'failed')),
  search_summary_json jsonb,
  search_output_json jsonb,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.property_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  external_property_id text,
  title text,
  area text,
  city text,
  property_category text check (property_category in ('residential', 'commercial', 'land')),
  property_type text,
  rent_or_buy text check (rent_or_buy in ('rent', 'buy', 'unknown')),
  price numeric,
  price_label text,
  currency text,
  bedrooms integer,
  bathrooms integer,
  sqft integer,
  size_label text,
  headline text,
  description text,
  highlights jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  client_safe_data jsonb,
  handoff_notes jsonb,
  missing_data_warnings jsonb not null default '[]'::jsonb,
  sort_order integer,
  created_at timestamptz not null default now()
);

create table if not exists public.property_internal_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid not null references public.property_recommendations(id) on delete cascade,
  source_url text,
  platform text,
  listing_id text,
  agent_name text,
  agent_phone text,
  agent_email text,
  internal_notes text,
  raw_trace_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_pdfs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  pdf_url text,
  page_count integer,
  input_json jsonb,
  status text not null default 'processing' check (status in ('draft', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.generated_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  recommendation_id uuid references public.property_recommendations(id) on delete set null,
  provider text not null default 'remotion',
  provider_job_id text,
  video_url text,
  script text,
  video_plan_json jsonb,
  voiceover_script_json jsonb,
  input_json jsonb,
  duration_seconds integer not null default 60,
  fps integer not null default 30,
  format text not null default 'vertical',
  status text not null default 'processing' check (status in ('draft', 'processing', 'completed', 'failed')),
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.recommendation_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requirement_id uuid not null references public.client_requirements(id) on delete cascade,
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  pdf_id uuid references public.generated_pdfs(id) on delete set null,
  video_id uuid references public.generated_videos(id) on delete set null,
  package_title text,
  package_summary_json jsonb,
  follow_up_message text,
  share_slug text unique,
  status text not null default 'processing' check (status in ('draft', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists client_requirements_user_id_idx on public.client_requirements(user_id);
create index if not exists recommendation_runs_user_id_idx on public.recommendation_runs(user_id);
create index if not exists recommendation_runs_requirement_id_idx on public.recommendation_runs(requirement_id);
create index if not exists property_recommendations_user_id_idx on public.property_recommendations(user_id);
create index if not exists property_recommendations_run_id_idx on public.property_recommendations(run_id);
create index if not exists property_internal_traces_user_id_idx on public.property_internal_traces(user_id);
create index if not exists property_internal_traces_recommendation_id_idx on public.property_internal_traces(recommendation_id);
create index if not exists generated_pdfs_user_id_idx on public.generated_pdfs(user_id);
create index if not exists generated_pdfs_run_id_idx on public.generated_pdfs(run_id);
create index if not exists generated_videos_user_id_idx on public.generated_videos(user_id);
create index if not exists generated_videos_run_id_idx on public.generated_videos(run_id);
create index if not exists recommendation_packages_user_id_idx on public.recommendation_packages(user_id);
create index if not exists recommendation_packages_run_id_idx on public.recommendation_packages(run_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists client_requirements_set_updated_at on public.client_requirements;
create trigger client_requirements_set_updated_at
before update on public.client_requirements
for each row execute function public.set_updated_at();

drop trigger if exists recommendation_runs_set_updated_at on public.recommendation_runs;
create trigger recommendation_runs_set_updated_at
before update on public.recommendation_runs
for each row execute function public.set_updated_at();

drop trigger if exists generated_pdfs_set_updated_at on public.generated_pdfs;
create trigger generated_pdfs_set_updated_at
before update on public.generated_pdfs
for each row execute function public.set_updated_at();

drop trigger if exists generated_videos_set_updated_at on public.generated_videos;
create trigger generated_videos_set_updated_at
before update on public.generated_videos
for each row execute function public.set_updated_at();

drop trigger if exists recommendation_packages_set_updated_at on public.recommendation_packages;
create trigger recommendation_packages_set_updated_at
before update on public.recommendation_packages
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, company_name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    company_name = excluded.company_name,
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.client_requirements enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.property_recommendations enable row level security;
alter table public.property_internal_traces enable row level security;
alter table public.generated_pdfs enable row level security;
alter table public.generated_videos enable row level security;
alter table public.recommendation_packages enable row level security;

create policy "profiles_select_own" on public.profiles for select using (user_id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (user_id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "client_requirements_select_own" on public.client_requirements for select using (user_id = auth.uid());
create policy "client_requirements_insert_own" on public.client_requirements for insert with check (user_id = auth.uid());
create policy "client_requirements_update_own" on public.client_requirements for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "client_requirements_delete_own" on public.client_requirements for delete using (user_id = auth.uid());

create policy "recommendation_runs_select_own" on public.recommendation_runs for select using (user_id = auth.uid());
create policy "recommendation_runs_insert_own" on public.recommendation_runs for insert with check (user_id = auth.uid());
create policy "recommendation_runs_update_own" on public.recommendation_runs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recommendation_runs_delete_own" on public.recommendation_runs for delete using (user_id = auth.uid());

create policy "property_recommendations_select_own" on public.property_recommendations for select using (user_id = auth.uid());
create policy "property_recommendations_insert_own" on public.property_recommendations for insert with check (user_id = auth.uid());
create policy "property_recommendations_update_own" on public.property_recommendations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "property_recommendations_delete_own" on public.property_recommendations for delete using (user_id = auth.uid());

create policy "property_internal_traces_select_own" on public.property_internal_traces for select using (user_id = auth.uid());
create policy "property_internal_traces_insert_own" on public.property_internal_traces for insert with check (user_id = auth.uid());
create policy "property_internal_traces_update_own" on public.property_internal_traces for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "property_internal_traces_delete_own" on public.property_internal_traces for delete using (user_id = auth.uid());

create policy "generated_pdfs_select_own" on public.generated_pdfs for select using (user_id = auth.uid());
create policy "generated_pdfs_insert_own" on public.generated_pdfs for insert with check (user_id = auth.uid());
create policy "generated_pdfs_update_own" on public.generated_pdfs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "generated_pdfs_delete_own" on public.generated_pdfs for delete using (user_id = auth.uid());

create policy "generated_videos_select_own" on public.generated_videos for select using (user_id = auth.uid());
create policy "generated_videos_insert_own" on public.generated_videos for insert with check (user_id = auth.uid());
create policy "generated_videos_update_own" on public.generated_videos for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "generated_videos_delete_own" on public.generated_videos for delete using (user_id = auth.uid());

create policy "recommendation_packages_select_own" on public.recommendation_packages for select using (user_id = auth.uid());
create policy "recommendation_packages_insert_own" on public.recommendation_packages for insert with check (user_id = auth.uid());
create policy "recommendation_packages_update_own" on public.recommendation_packages for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recommendation_packages_delete_own" on public.recommendation_packages for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('requirement-audio', 'requirement-audio', false),
  ('generated-pdfs', 'generated-pdfs', false),
  ('generated-videos', 'generated-videos', false),
  ('property-images', 'property-images', false)
on conflict (id) do nothing;

create policy "storage_select_own_propshorts_assets"
on storage.objects for select
using (
  bucket_id in ('requirement-audio', 'generated-pdfs', 'generated-videos', 'property-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_insert_own_propshorts_assets"
on storage.objects for insert
with check (
  bucket_id in ('requirement-audio', 'generated-pdfs', 'generated-videos', 'property-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_update_own_propshorts_assets"
on storage.objects for update
using (
  bucket_id in ('requirement-audio', 'generated-pdfs', 'generated-videos', 'property-images')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('requirement-audio', 'generated-pdfs', 'generated-videos', 'property-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_delete_own_propshorts_assets"
on storage.objects for delete
using (
  bucket_id in ('requirement-audio', 'generated-pdfs', 'generated-videos', 'property-images')
  and (storage.foldername(name))[1] = auth.uid()::text
);
