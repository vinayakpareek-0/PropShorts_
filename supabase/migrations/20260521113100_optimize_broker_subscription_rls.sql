drop policy if exists "broker_subscriptions_select_own" on public.broker_subscriptions;
drop policy if exists "broker_subscriptions_insert_own" on public.broker_subscriptions;

create policy "broker_subscriptions_select_own"
on public.broker_subscriptions for select
using (user_id = (select auth.uid()));

create policy "broker_subscriptions_insert_own"
on public.broker_subscriptions for insert
with check (user_id = (select auth.uid()));
