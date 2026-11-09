-- Tests de sécurité RLS / RPC. Chaque échec lève une exception.
\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, false);
end $$;
create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

set client_min_messages = notice;
set role authenticated;

-- Quentin crée le foyer A
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
create temp table r_q as select public.create_household('Quentin', '#C2603F', '🦊') as r;
select pg_temp.check((select (r->>'ok')::boolean from r_q), 'création de foyer');
select pg_temp.check((select length(r->>'invite_code') = 6 from r_q), 'code invitation 6 caractères');
select pg_temp.check((select (public.create_household('Quentin bis')->>'error') = 'deja_membre'), 'on ne crée pas deux foyers');

-- Un inconnu crée le foyer B
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
create temp table r_x as select public.create_household('Intrus') as r;

-- Aude rejoint A : mauvais code puis bon code
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select public.join_household('ZZZZZZ', 'Aude')->>'error') = 'code_invalide', 'mauvais code refusé');
select pg_temp.check((select (public.join_household(lower((select r->>'invite_code' from r_q)), 'Aude')->>'ok')::boolean), 'Aude rejoint avec le code (minuscules ok)');

-- Un 3e ne peut plus rejoindre A (code effacé) ni avec l'ancien code
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.check((select public.join_household((select r->>'invite_code' from r_q), 'Tiers')->>'error') = 'code_invalide', 'foyer complet : code désactivé');

-- Force brute limitée
select count(*) from (select public.join_household('AAAAA' || i, 'x') from generate_series(1, 10) i) s;
select pg_temp.check((select public.join_household('BBBBBB', 'x')->>'error') = 'trop_de_tentatives', 'anti force brute');

-- Données : Quentin écrit une note dans A
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.notes (id, household_id, body, updated_at)
  values ('aaaaaaaa-0000-0000-0000-000000000001', (select (r->>'household_id')::uuid from r_q), 'Coucou', '2026-01-01T10:00:00Z');
select pg_temp.check((select created_by = public.my_member_id() from public.notes), 'created_by rempli automatiquement');

-- Aude voit la note
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) = 1 from public.notes), 'Aude voit les notes du foyer');
select pg_temp.check((select count(*) = 2 from public.members), 'Aude voit les 2 membres');

-- L'intrus ne voit rien et ne peut pas écrire dans A
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
select pg_temp.check((select count(*) = 0 from public.notes), 'intrus : 0 note visible');
select pg_temp.check((select count(*) = 1 from public.members), 'intrus : ne voit que lui-même');
select pg_temp.check((select count(*) = 1 from public.households), 'intrus : ne voit que son foyer');
do $$ begin
  insert into public.notes (id, household_id, body)
    values (gen_random_uuid(), (select household_id from public.members where first_name = 'Quentin' limit 1), 'pirate');
  raise exception 'ÉCHEC : intrus a pu écrire';
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  raise notice 'ok - intrus ne peut pas écrire (sans connaître l''id)';
end $$;
reset role;
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
set role authenticated;
do $$ declare hid uuid; begin
  reset role; select household_id into hid from public.members where first_name = 'Quentin'; set role authenticated;
  insert into public.notes (id, household_id, body) values (gen_random_uuid(), hid, 'pirate');
  raise exception 'ÉCHEC : intrus a pu écrire';
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  raise notice 'ok - intrus ne peut pas écrire même avec l''id du foyer';
end $$;
update public.notes set body = 'hack';
select pg_temp.check(true, 'update intrus sans effet (vérifié plus bas)');

-- Pas de suppression physique ni de lecture du hash
do $$ begin
  delete from public.notes;
  raise exception 'ÉCHEC : delete autorisé';
exception when insufficient_privilege then raise notice 'ok - DELETE interdit';
end $$;
do $$ begin
  perform recovery_hash from public.members;
  raise exception 'ÉCHEC : hash lisible';
exception when insufficient_privilege then raise notice 'ok - hash du code de secours illisible';
end $$;
do $$ begin
  update public.members set household_id = gen_random_uuid();
  raise exception 'ÉCHEC : changement de foyer';
exception when insufficient_privilege then raise notice 'ok - impossible de changer de foyer';
end $$;

-- Dernière modification gagne
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select body = 'Coucou' from public.notes), 'la modif de l''intrus n''a rien changé');
update public.notes set body = 'Ancienne', updated_at = '2025-12-31T00:00:00Z';
select pg_temp.check((select body = 'Coucou' from public.notes), 'une modif plus ancienne n''écrase pas');
update public.notes set body = 'Récente', updated_at = '2026-01-02T00:00:00Z';
select pg_temp.check((select body = 'Récente' from public.notes), 'une modif plus récente gagne');
-- upsert idempotent (même id renvoyé deux fois)
insert into public.notes (id, household_id, body, updated_at)
  values ('aaaaaaaa-0000-0000-0000-000000000001', public.my_household_id(), 'Récente', '2026-01-02T00:00:00Z')
  on conflict (id) do update set body = excluded.body, updated_at = excluded.updated_at;
select pg_temp.check((select count(*) = 1 from public.notes), 'renvoi du même id : pas de doublon');

-- Prénoms : votes privés, matchs partagés
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.name_votes (id, household_id, created_by, name, vote) values
  (gen_random_uuid(), public.my_household_id(), public.my_member_id(), 'Louise', 'like'),
  (gen_random_uuid(), public.my_household_id(), public.my_member_id(), 'Jules', 'like'),
  (gen_random_uuid(), public.my_household_id(), public.my_member_id(), 'Marcel', 'no');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) = 0 from public.name_votes), 'Aude ne voit pas les votes de Quentin');
insert into public.name_votes (id, household_id, created_by, name, vote) values
  (gen_random_uuid(), public.my_household_id(), public.my_member_id(), 'Louise', 'like'),
  (gen_random_uuid(), public.my_household_id(), public.my_member_id(), 'Jules', 'meh'),
  (gen_random_uuid(), public.my_household_id(), public.my_member_id(), 'Marcel', 'like');
select pg_temp.check((select array_agg(name) = array['Louise'] from public.name_match_list()), 'seul Louise est un match');
do $$ begin
  insert into public.name_votes (id, household_id, created_by, name, vote)
    values (gen_random_uuid(), public.my_household_id(),
            (select id from public.members where first_name = 'Quentin'), 'Triche', 'like');
  raise exception 'ÉCHEC : vote au nom de l''autre';
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  raise notice 'ok - impossible de voter au nom de l''autre';
end $$;

-- Récupération par code de secours sur un nouveau téléphone
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
create temp table r_rec as select public.recover_member(lower(replace((select r->>'recovery_code' from r_q), '-', ' '))) as r;
select pg_temp.check((select (r->>'ok')::boolean from r_rec), 'récupération avec le code de secours (format libre)');
select pg_temp.check((select first_name = 'Quentin' from public.members where user_id = auth.uid()), 'nouveau téléphone = Quentin');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check((select count(*) = 0 from public.notes), 'ancien téléphone déconnecté du foyer');

-- anon n'a accès à rien
reset role;
set role anon;
do $$ begin
  perform 1 from public.notes;
  raise exception 'ÉCHEC : anon lit';
exception when insufficient_privilege then raise notice 'ok - anon : aucune lecture';
end $$;
do $$ begin
  perform public.create_household('x');
  raise exception 'ÉCHEC : anon RPC';
exception when insufficient_privilege then raise notice 'ok - anon : aucune RPC';
end $$;
reset role;
\echo '✅ Tous les tests de sécurité passent'
