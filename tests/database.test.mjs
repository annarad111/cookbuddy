// Run with: node --test tests/database.test.mjs (requires @electric-sql/pglite).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
test("migration, RLS isolation, shared access, conflict protection and quotas", async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    insert into auth.users values('${A}'),('${B}'),('${C}');`);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/202611130001_cookbuddy_kitchen.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration); // also verify rerun safety
  const calories = await readFile(
    new URL(
      "../supabase/migrations/202611140001_recipe_calories.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(calories);
  await db.exec(calories); // rerun safety
  async function user(id, sql) {
    return db.transaction(async (tx) => {
      await tx.exec(
        `set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`,
      );
      return tx.query(sql);
    });
  }
  const hA = (
    await user(A, "select public.cookbuddy_current_household() as id")
  ).rows[0].id;
  const hB = (
    await user(B, "select public.cookbuddy_current_household() as id")
  ).rows[0].id;
  assert.notEqual(hA, hB);
  assert.equal(
    (await user(A, "select public.cookbuddy_current_household() as id")).rows[0]
      .id,
    hA,
  );
  assert.equal(
    (
      await user(
        B,
        `select * from public.cookbuddy_state where household_id='${hA}'`,
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    user(B, `select public.cookbuddy_save_state('${hA}',0,'{}')`),
    /FORBIDDEN/,
  );
  await user(
    A,
    `insert into public.recipes(user_id,title,servings,time,steps,calories) values('${A}','Private',2,20,'Cook',450)`,
  );
  assert.equal((await user(B, `select * from public.recipes`)).rows.length, 0);
  await user(A, `update public.recipes set calories=520 where title='Private'`);
  assert.equal(
    (await user(A, `select calories from public.recipes where title='Private'`))
      .rows[0].calories,
    520,
    "owner can edit calories",
  );
  await assert.rejects(
    user(A, `update public.recipes set calories=99999 where title='Private'`),
    /recipes_calories_range/,
  );
  await assert.rejects(
    user(
      B,
      `insert into public.recipes(user_id,household_id,title,servings,time,steps) values('${B}','${hA}','Forbidden',2,20,'Cook')`,
    ),
    /row-level security/,
  );
  const code = (
    await user(
      A,
      `select invite_code from public.cookbuddy_households where id='${hA}'`,
    )
  ).rows[0].invite_code;
  await user(B, `select public.cookbuddy_join_household('${code}')`);
  assert.equal(
    (await user(B, "select public.cookbuddy_current_household() as id")).rows[0]
      .id,
    hA,
  );
  await assert.rejects(
    user(C, `select public.cookbuddy_join_household('${code}')`),
    /KITCHEN_FULL/,
  );
  assert.equal(
    (await user(B, "select * from public.recipes")).rows.length,
    0,
    "private recipes stay private after join",
  );
  await user(A, `select public.cookbuddy_share_my_recipes('${hA}')`);
  assert.equal((await user(B, "select * from public.recipes")).rows.length, 1);
  const rev = (
    await user(
      A,
      `select public.cookbuddy_save_state('${hA}',0,'{"plan":[]}') as rev`,
    )
  ).rows[0].rev;
  assert.equal(rev, 1);
  await assert.rejects(
    user(B, `select public.cookbuddy_save_state('${hA}',0,'{}')`),
    /CONFLICT/,
  );
  assert.equal(
    (
      await user(
        B,
        `select public.cookbuddy_save_state('${hA}',1,'{"plan":[]}') as rev`,
      )
    ).rows[0].rev,
    2,
  );
  await assert.rejects(
    user(A, `select public.cookbuddy_consume_ai('${A}')`),
    /permission denied/,
  );
  assert.equal(
    (await db.query(`select public.cookbuddy_consume_ai('${A}') as allowed`))
      .rows[0].allowed,
    true,
  );
  assert.equal(
    (await db.query(`select public.cookbuddy_consume_ai('${A}') as allowed`))
      .rows[0].allowed,
    false,
  );
  await db.exec(
    `update public.cookbuddy_ai_usage set count=20,last_request=now()-interval '1 minute'`,
  );
  assert.equal(
    (await db.query(`select public.cookbuddy_consume_ai('${A}') as allowed`))
      .rows[0].allowed,
    false,
  );
  await user(A, `select public.cookbuddy_rotate_code('${hA}')`);
  await assert.rejects(
    user(C, `select public.cookbuddy_join_household('${code}')`),
    /INVALID_CODE/,
  );
  await db.close();
});
