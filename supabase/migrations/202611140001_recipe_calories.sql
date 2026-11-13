-- Calories per portion (kcal), optional. Run after 202611130001_cookbuddy_kitchen.sql.
-- Safe to run more than once.
begin;
alter table public.recipes add column if not exists calories integer;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'recipes_calories_range') then
    alter table public.recipes add constraint recipes_calories_range check (calories is null or calories between 0 and 5000);
  end if;
end $$;
-- Recipes only grant UPDATE per column; allow editing the new one too.
grant update(calories) on public.recipes to authenticated;
commit;
