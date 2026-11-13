-- Run once in the Supabase SQL Editor, or apply with `supabase db push`.
-- Existing recipes are retained. Existing recipe policies are replaced with private/household access.
begin;
create table if not exists public.cookbuddy_households (
  id uuid primary key default gen_random_uuid(), name text not null default 'Bucătăria noastră',
  owner_id uuid not null references auth.users(id), invite_code uuid not null unique default gen_random_uuid()
);
create table if not exists public.cookbuddy_members (
  household_id uuid not null references public.cookbuddy_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, primary key(household_id,user_id)
);
create table if not exists public.cookbuddy_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_household uuid not null references public.cookbuddy_households(id)
);
create table if not exists public.cookbuddy_state (
  household_id uuid primary key references public.cookbuddy_households(id) on delete cascade,
  revision integer not null default 0, payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
  title text not null, image_url text, servings integer not null, time integer not null,
  ingredients jsonb not null default '[]'::jsonb, steps text not null, notes text,
  is_favorite boolean not null default false
);
alter table public.recipes add column if not exists household_id uuid references public.cookbuddy_households(id);
alter table public.recipes add column if not exists meal_type text default 'any';
create index if not exists recipes_household_idx on public.recipes(household_id);
create index if not exists recipes_user_idx on public.recipes(user_id);
create table if not exists public.cookbuddy_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null, count integer not null default 0, last_request timestamptz,
  primary key(user_id,day)
);
create or replace function public.cookbuddy_is_member(p_household uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.cookbuddy_members where household_id=p_household and user_id=auth.uid());
$$;
revoke all on function public.cookbuddy_is_member(uuid) from public;
grant execute on function public.cookbuddy_is_member(uuid) to authenticated;

alter table public.cookbuddy_households enable row level security;
alter table public.cookbuddy_members enable row level security;
alter table public.cookbuddy_profiles enable row level security;
alter table public.cookbuddy_state enable row level security;
alter table public.recipes enable row level security;
alter table public.cookbuddy_ai_usage enable row level security;
-- Re-run safe. No permissive legacy recipe policy can bypass household access.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname='public' and tablename in ('recipes','cookbuddy_households','cookbuddy_members','cookbuddy_profiles','cookbuddy_state','cookbuddy_ai_usage') loop
    execute format('drop policy %I on public.%I', p.policyname,p.tablename);
  end loop;
end $$;
create policy kitchen_read on public.cookbuddy_households for select to authenticated using (public.cookbuddy_is_member(id));
create policy members_read on public.cookbuddy_members for select to authenticated using (public.cookbuddy_is_member(household_id));
create policy profile_read on public.cookbuddy_profiles for select to authenticated using(user_id=auth.uid());
create policy state_read on public.cookbuddy_state for select to authenticated using(public.cookbuddy_is_member(household_id));
create policy recipe_read on public.recipes for select to authenticated using (
  (household_id is null and user_id=auth.uid()) or public.cookbuddy_is_member(household_id)
);
create policy recipe_insert on public.recipes for insert to authenticated with check (
  user_id=auth.uid() and (household_id is null or public.cookbuddy_is_member(household_id))
);
create policy recipe_update on public.recipes for update to authenticated using (
  (household_id is null and user_id=auth.uid()) or public.cookbuddy_is_member(household_id)
) with check ((household_id is null and user_id=auth.uid()) or public.cookbuddy_is_member(household_id));
create policy recipe_delete on public.recipes for delete to authenticated using (
  (household_id is null and user_id=auth.uid()) or public.cookbuddy_is_member(household_id)
);
grant select on public.cookbuddy_households,public.cookbuddy_members,public.cookbuddy_profiles,public.cookbuddy_state to authenticated;
grant select,insert,delete on public.recipes to authenticated;
revoke update on public.recipes from authenticated;
grant update(title,image_url,servings,time,ingredients,steps,notes,is_favorite,meal_type) on public.recipes to authenticated;
revoke all on public.cookbuddy_ai_usage from anon,authenticated;
revoke insert,update,delete on public.cookbuddy_households,public.cookbuddy_members,public.cookbuddy_profiles,public.cookbuddy_state from anon,authenticated;

create or replace function public.cookbuddy_current_household() returns uuid
language plpgsql security definer set search_path = '' as $$
declare h uuid; u uuid := auth.uid(); begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text, 0));
  select active_household into h from public.cookbuddy_profiles where user_id=u;
  if h is not null and public.cookbuddy_is_member(h) then return h; end if;
  insert into public.cookbuddy_households(owner_id) values(u) returning id into h;
  insert into public.cookbuddy_members values(h,u);
  insert into public.cookbuddy_state(household_id) values(h);
  insert into public.cookbuddy_profiles(user_id,active_household) values(u,h)
    on conflict(user_id) do update set active_household=excluded.active_household;
  return h;
end $$;
create or replace function public.cookbuddy_join_household(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare h uuid; u uuid := auth.uid(); begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  select id into h from public.cookbuddy_households where invite_code::text=lower(trim(p_code)) for update;
  if h is null then raise exception 'INVALID_CODE'; end if;
  if not public.cookbuddy_is_member(h) and (select count(*) from public.cookbuddy_members where household_id=h)>=2 then raise exception 'KITCHEN_FULL'; end if;
  insert into public.cookbuddy_members values(h,u) on conflict do nothing;
  insert into public.cookbuddy_profiles values(u,h) on conflict(user_id) do update set active_household=h;
  return h;
end $$;
create or replace function public.cookbuddy_rotate_code(p_household uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare code uuid; begin
  update public.cookbuddy_households set invite_code=gen_random_uuid() where id=p_household and owner_id=auth.uid() returning invite_code into code;
  if code is null then raise exception 'FORBIDDEN'; end if; return code;
end $$;
create or replace function public.cookbuddy_save_state(p_household uuid,p_revision integer,p_payload jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare r integer; begin
  if not public.cookbuddy_is_member(p_household) then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>1500000 then raise exception 'INVALID_STATE'; end if;
  update public.cookbuddy_state set payload=p_payload,revision=revision+1,updated_at=now()
    where household_id=p_household and revision=p_revision returning revision into r;
  if r is null then raise exception 'CONFLICT'; end if;
  return r;
end $$;
create or replace function public.cookbuddy_share_my_recipes(p_household uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer; begin
  if not public.cookbuddy_is_member(p_household) then raise exception 'FORBIDDEN'; end if;
  update public.recipes set household_id=p_household where user_id=auth.uid() and household_id is null;
  get diagnostics n = row_count; return n;
end $$;
-- Server-only, atomic per-user quota: 20/day, at least 5 seconds between requests.
create or replace function public.cookbuddy_consume_ai(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer; begin
  insert into public.cookbuddy_ai_usage(user_id,day,count,last_request) values(p_user,(now() at time zone 'UTC')::date,1,now())
  on conflict(user_id,day) do update set count=public.cookbuddy_ai_usage.count+1,last_request=now()
  where public.cookbuddy_ai_usage.count<20 and public.cookbuddy_ai_usage.last_request<now()-interval '5 seconds'
  returning count into n; return n is not null;
end $$;
revoke all on function public.cookbuddy_consume_ai(uuid) from public,anon,authenticated;
grant execute on function public.cookbuddy_consume_ai(uuid) to service_role;
revoke all on function public.cookbuddy_current_household(),public.cookbuddy_join_household(text),public.cookbuddy_rotate_code(uuid),public.cookbuddy_save_state(uuid,integer,jsonb),public.cookbuddy_share_my_recipes(uuid) from public;
grant execute on function public.cookbuddy_current_household(),public.cookbuddy_join_household(text),public.cookbuddy_rotate_code(uuid),public.cookbuddy_save_state(uuid,integer,jsonb),public.cookbuddy_share_my_recipes(uuid) to authenticated;
-- Photo upload paths are namespaced by the authenticated user's UUID.
insert into storage.buckets(id,name,public) values('recipe-images','recipe-images',true) on conflict(id) do nothing;
drop policy if exists cookbuddy_image_upload on storage.objects;
create policy cookbuddy_image_upload on storage.objects for insert to authenticated with check(bucket_id='recipe-images' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
