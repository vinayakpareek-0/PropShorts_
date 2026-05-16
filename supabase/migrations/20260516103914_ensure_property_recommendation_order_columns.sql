alter table public.property_recommendations
  add column if not exists sort_order integer;

alter table public.property_recommendations
  add column if not exists created_at timestamptz not null default now();

create index if not exists property_recommendations_run_sort_idx
  on public.property_recommendations(run_id, sort_order);
