-- English default kitchen name. Safe to run more than once.
begin;
alter table public.cookbuddy_households alter column name set default 'Our kitchen';
update public.cookbuddy_households set name = 'Our kitchen' where name = 'Bucătăria noastră';
commit;
