revoke execute on function public.handle_new_user() from public;
revoke execute on function public.set_updated_at() from public;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end;
$$;
