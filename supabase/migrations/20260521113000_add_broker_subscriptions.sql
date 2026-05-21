create table if not exists public.broker_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null default 'free' check (plan_id in ('free', 'starter', 'pro')),
  status text not null default 'free' check (
    status in (
      'free',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists broker_subscriptions_user_id_idx on public.broker_subscriptions(user_id);
create index if not exists broker_subscriptions_stripe_customer_id_idx on public.broker_subscriptions(stripe_customer_id);
create index if not exists broker_subscriptions_stripe_subscription_id_idx on public.broker_subscriptions(stripe_subscription_id);

drop trigger if exists broker_subscriptions_set_updated_at on public.broker_subscriptions;
create trigger broker_subscriptions_set_updated_at
before update on public.broker_subscriptions
for each row execute function public.set_updated_at();

alter table public.broker_subscriptions enable row level security;

create policy "broker_subscriptions_select_own"
on public.broker_subscriptions for select
using (user_id = auth.uid());

create policy "broker_subscriptions_insert_own"
on public.broker_subscriptions for insert
with check (user_id = auth.uid());
