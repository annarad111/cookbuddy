-- How many AI requests the signed-in user has left today (limit: 20/day, UTC).
-- Read-only and limited to the caller's own row. Safe to run more than once.
create or replace function public.cookbuddy_ai_remaining() returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(0, 20 - coalesce((
    select count from public.cookbuddy_ai_usage
    where user_id = auth.uid() and day = (now() at time zone 'UTC')::date
  ), 0));
$$;
revoke all on function public.cookbuddy_ai_remaining() from public, anon;
grant execute on function public.cookbuddy_ai_remaining() to authenticated;
