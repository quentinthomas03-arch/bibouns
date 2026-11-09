-- =============================================================================
-- Biboun's — schéma initial
-- =============================================================================
-- Principes :
--  * Un "foyer" (households) regroupe au plus 2 membres (members).
--  * Chaque membre est lié à un utilisateur Supabase anonyme (auth.uid()).
--  * Toutes les données appartiennent à un foyer (household_id) et la
--    Row Level Security (RLS) garantit qu'un foyer ne voit QUE ses données.
--  * Les tables "synchronisées" partagent les mêmes colonnes techniques :
--      id          : UUID généré par le téléphone (=> pas de doublon si on renvoie)
--      updated_at  : horloge du téléphone, sert à "la dernière modif gagne"
--      synced_at   : horloge du serveur, sert de curseur pour la synchro
--      deleted_at  : suppression "douce" (pour que la suppression se synchronise)
--  * Création / jonction / récupération de foyer passent UNIQUEMENT par des
--    fonctions RPC contrôlées (security definer).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Foyers et membres
-- ---------------------------------------------------------------------------
create table public.households (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null default 'Notre foyer',
  invite_code        text unique,
  invite_expires_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  synced_at          timestamptz not null default now()
);

create table public.members (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  user_id        uuid unique,                      -- auth.users.id (session anonyme)
  first_name     text not null check (char_length(first_name) between 1 and 40),
  color          text not null default '#C2603F',
  avatar         text not null default '🦊',
  recovery_hash  text unique,                      -- sha256 du code de secours
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  synced_at      timestamptz not null default now()
);
create index members_household_idx on public.members(household_id);

-- Tentatives de code (anti force brute)
create table public.code_attempts (
  user_id  uuid not null,
  at       timestamptz not null default now()
);
create index code_attempts_user_idx on public.code_attempts(user_id, at);

-- ---------------------------------------------------------------------------
-- Fonctions d'aide RLS
-- ---------------------------------------------------------------------------
create or replace function public.my_household_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select household_id from public.members where user_id = auth.uid()
$$;

create or replace function public.my_member_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.members where user_id = auth.uid()
$$;

-- Génère un code aléatoire (aléa cryptographique via gen_random_uuid)
-- avec un alphabet sans caractères ambigus (pas de 0/O, 1/I/L).
create or replace function public.random_code(len int)
returns text language plpgsql volatile set search_path = public, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := '';
  result text := '';
  i int;
begin
  while length(bytes) < len loop
    bytes := bytes || uuid_send(gen_random_uuid());
  end loop;
  for i in 0..len - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end $$;

create or replace function public.hash_code(code text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select encode(sha256(convert_to(upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex')
$$;

-- ---------------------------------------------------------------------------
-- Colonnes et règles communes aux tables synchronisées
-- ---------------------------------------------------------------------------

-- Trigger : "la dernière modification gagne" + horodatage serveur.
create or replace function public.sync_row()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, public.my_member_id());
  end if;
  if tg_op = 'UPDATE' then
    -- Une modif plus ancienne (ex. faite hors ligne il y a 2 h) n'écrase pas
    -- une modif plus récente. On "touche" quand même synced_at pour que le
    -- téléphone en retard récupère la bonne version.
    if new.updated_at < old.updated_at then
      old.synced_at := clock_timestamp();
      return old;
    end if;
    -- Champs non modifiables
    new.id := old.id;
    new.household_id := old.household_id;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

-- Trigger simple pour households/members (horodatage serveur uniquement)
create or replace function public.touch_synced_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

create trigger households_touch before insert or update on public.households
  for each row execute function public.touch_synced_at();
create trigger members_touch before insert or update on public.members
  for each row execute function public.touch_synced_at();

-- Ajoute les colonnes communes, la RLS "même foyer", le trigger et la
-- publication Realtime à une table de données.
create or replace function public.make_synced(tbl regclass, member_private boolean default false)
returns void language plpgsql set search_path = public, pg_temp as $$
declare
  t text := tbl::text;
begin
  execute format($f$
    alter table %1$s
      add column if not exists household_id uuid not null references public.households(id) on delete cascade,
      add column if not exists created_by uuid references public.members(id) on delete set null,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz not null default now(),
      add column if not exists synced_at timestamptz not null default now(),
      add column if not exists deleted_at timestamptz
  $f$, t);
  execute format('create index if not exists %s on %s(household_id, synced_at)',
                 replace(t, 'public.', '') || '_sync_idx', t);
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);

  if member_private then
    -- Visible uniquement par le membre qui a créé la ligne (ex. votes de prénoms)
    execute format($f$
      create policy own_rows on %1$s for all to authenticated
        using (household_id = public.my_household_id() and created_by = public.my_member_id())
        with check (household_id = public.my_household_id() and created_by = public.my_member_id())
    $f$, t);
  else
    execute format($f$
      create policy household_rows on %1$s for all to authenticated
        using (household_id = public.my_household_id())
        with check (household_id = public.my_household_id())
    $f$, t);
  end if;

  execute format('create trigger sync_row before insert or update on %s for each row execute function public.sync_row()', t);
  -- Supabase accorde tous les droits par défaut : on repart de zéro.
  -- Pas de DELETE ni TRUNCATE côté client (suppression douce uniquement).
  execute format('revoke all on %s from anon, authenticated', t);
  execute format('grant select, insert, update on %s to authenticated', t);
  execute format('alter publication supabase_realtime add table %s', t);
end $$;

-- ---------------------------------------------------------------------------
-- Tables de données (V1). Les colonnes communes sont ajoutées par make_synced.
-- ---------------------------------------------------------------------------

-- Réglages partagés clé/valeur (date prévue, alimentation, nom de famille...)
create table public.settings (
  id     uuid primary key,
  key    text not null,
  value  jsonb
);

-- "Mots doux" : petits messages partagés (sert aussi à tester la synchro)
create table public.notes (
  id     uuid primary key,
  body   text not null check (char_length(body) <= 500),
  emoji  text
);

-- Rendez-vous (grossesse et bébé)
create table public.appointments (
  id               uuid primary key,
  subject          text not null default 'pregnancy' check (subject in ('pregnancy', 'baby')),
  kind             text not null default 'consultation',
  title            text not null,
  starts_at        timestamptz not null,
  location         text,
  notes            text,
  questions        text,
  remind_minutes   int[] not null default '{1440}',
  done             boolean not null default false
);

-- Journal de grossesse
create table public.journal_entries (
  id          uuid primary key,
  entry_date  date not null,
  mood        smallint check (mood between 1 and 5),
  symptoms    text[] not null default '{}',
  body        text
);

-- Mesures maman (poids, tension...)
create table public.measurements (
  id           uuid primary key,
  kind         text not null check (kind in ('weight', 'bp')),
  measured_at  timestamptz not null,
  value        numeric not null,
  value2       numeric
);

-- Checklists partagées
create table public.checklists (
  id        uuid primary key,
  title     text not null,
  kind      text not null default 'custom',
  emoji     text,
  position  double precision not null default 0
);

create table public.checklist_items (
  id            uuid primary key,
  checklist_id  uuid not null references public.checklists(id) on delete cascade,
  label         text not null,
  done          boolean not null default false,
  done_by       uuid references public.members(id) on delete set null,
  done_at       timestamptz,
  assignee      uuid references public.members(id) on delete set null,
  due_date      date,
  note          text,
  budget_cents  int check (budget_cents >= 0),
  position      double precision not null default 0
);
create index checklist_items_list_idx on public.checklist_items(checklist_id);

-- Prénoms ajoutés à la main (partagés)
create table public.custom_names (
  id      uuid primary key,
  name    text not null,
  gender  text check (gender in ('f', 'm', 'x')),
  origin  text
);

-- Votes de prénoms : PRIVÉS (chacun ne voit que les siens)
create table public.name_votes (
  id    uuid primary key,
  name  text not null,
  vote  text not null check (vote in ('like', 'meh', 'no'))
);

-- Classement et notes des matchs (partagés)
create table public.name_matches (
  id     uuid primary key,
  name   text not null,
  rank   double precision,
  note   text,
  star   boolean not null default false
);

-- Chrono des contractions
create table public.contractions (
  id          uuid primary key,
  started_at  timestamptz not null,
  ended_at    timestamptz
);

-- Bébé
create table public.babies (
  id          uuid primary key,
  first_name  text,
  sex         text check (sex in ('f', 'm', 'x')),
  born_at     timestamptz,
  weight_g    int,
  length_mm   int,
  head_mm     int
);

-- Événements bébé : repas, couche, sommeil, médicament
create table public.baby_events (
  id          uuid primary key,
  kind        text not null check (kind in ('feed', 'diaper', 'sleep', 'med')),
  started_at  timestamptz not null,
  ended_at    timestamptz,
  data        jsonb not null default '{}'
);

-- Croissance
create table public.growth (
  id           uuid primary key,
  measured_on  date not null,
  weight_g     int,
  length_mm    int,
  head_mm      int
);

-- Vaccins
create table public.vaccines (
  id        uuid primary key,
  code      text not null,
  due_date  date,
  done_on   date,
  lot       text,
  notes     text
);

-- Documents (ordonnances, comptes rendus...)
create table public.documents (
  id          uuid primary key,
  title       text not null,
  kind        text,
  doc_date    date,
  notes       text,
  photo_path  text
);

-- Souvenirs
create table public.memories (
  id           uuid primary key,
  memory_date  date not null,
  title        text,
  body         text,
  first_kind   text,
  photo_paths  text[] not null default '{}'
);

select public.make_synced('public.settings');
select public.make_synced('public.notes');
select public.make_synced('public.appointments');
select public.make_synced('public.journal_entries');
select public.make_synced('public.measurements');
select public.make_synced('public.checklists');
select public.make_synced('public.checklist_items');
select public.make_synced('public.custom_names');
select public.make_synced('public.name_votes', member_private => true);
select public.make_synced('public.name_matches');
select public.make_synced('public.contractions');
select public.make_synced('public.babies');
select public.make_synced('public.baby_events');
select public.make_synced('public.growth');
select public.make_synced('public.vaccines');
select public.make_synced('public.documents');
select public.make_synced('public.memories');

create unique index settings_key_uq on public.settings(household_id, key);
create unique index name_votes_uq on public.name_votes(created_by, name);

-- ---------------------------------------------------------------------------
-- RLS : foyers et membres
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.households force row level security;
alter table public.members enable row level security;
alter table public.members force row level security;
alter table public.code_attempts enable row level security;   -- aucune policy => inaccessible

create policy household_read on public.households for select to authenticated
  using (id = public.my_household_id());
create policy household_rename on public.households for update to authenticated
  using (id = public.my_household_id()) with check (id = public.my_household_id());

create policy members_read on public.members for select to authenticated
  using (household_id = public.my_household_id());
create policy members_update_self on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Droits par colonne : on ne peut modifier que son profil, jamais son foyer,
-- son user_id ni le hash du code de secours.
revoke all on public.households, public.members from anon, authenticated;
grant select (id, name, invite_code, invite_expires_at, created_at, updated_at, synced_at)
  on public.households to authenticated;
grant update (name, updated_at) on public.households to authenticated;
grant select (id, household_id, user_id, first_name, color, avatar, created_at, updated_at, synced_at)
  on public.members to authenticated;
grant update (first_name, color, avatar, updated_at) on public.members to authenticated;

alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.members;

-- ---------------------------------------------------------------------------
-- RPC : créer / rejoindre / récupérer un foyer
-- Toutes renvoient du JSON { ok: bool, error?: text, ... } (pas d'exception,
-- pour que les tentatives ratées soient bien enregistrées).
-- ---------------------------------------------------------------------------

create or replace function public.too_many_attempts()
returns boolean language sql volatile security definer set search_path = public, pg_temp as $$
  select count(*) >= 10 from public.code_attempts
  where user_id = auth.uid() and at > now() - interval '1 hour'
$$;

create or replace function public.new_recovery_code()
returns text language sql volatile set search_path = public, pg_temp as $$
  select substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4) || '-' || substr(c, 13, 4)
  from (select public.random_code(16) as c) s
$$;

create or replace function public.create_household(
  p_first_name text, p_color text default '#C2603F', p_avatar text default '🦊',
  p_household_name text default 'Notre foyer')
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_member uuid;
  v_invite text;
  v_recovery text;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'non_connecte'); end if;
  if exists (select 1 from members where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'deja_membre');
  end if;

  v_invite := random_code(6);
  insert into households (name, invite_code, invite_expires_at)
    values (coalesce(nullif(trim(p_household_name), ''), 'Notre foyer'), v_invite, now() + interval '7 days')
    returning id into v_household;

  v_recovery := new_recovery_code();
  insert into members (household_id, user_id, first_name, color, avatar, recovery_hash)
    values (v_household, v_uid, trim(p_first_name), p_color, p_avatar, hash_code(v_recovery))
    returning id into v_member;

  return jsonb_build_object('ok', true, 'household_id', v_household, 'member_id', v_member,
                            'invite_code', v_invite, 'recovery_code', v_recovery);
end $$;

create or replace function public.join_household(
  p_code text, p_first_name text, p_color text default '#E0897A', p_avatar text default '🐻')
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_member uuid;
  v_recovery text;
  v_count int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'non_connecte'); end if;
  if exists (select 1 from members where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'deja_membre');
  end if;
  if too_many_attempts() then return jsonb_build_object('ok', false, 'error', 'trop_de_tentatives'); end if;

  select id into v_household from households
    where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))
      and invite_expires_at > now()
    for update;
  if v_household is null then
    insert into code_attempts (user_id) values (v_uid);
    return jsonb_build_object('ok', false, 'error', 'code_invalide');
  end if;

  select count(*) into v_count from members where household_id = v_household;
  if v_count >= 2 then
    return jsonb_build_object('ok', false, 'error', 'foyer_complet');
  end if;

  v_recovery := new_recovery_code();
  insert into members (household_id, user_id, first_name, color, avatar, recovery_hash)
    values (v_household, v_uid, trim(p_first_name), p_color, p_avatar, hash_code(v_recovery))
    returning id into v_member;

  -- Le foyer est complet : le code d'invitation ne sert plus à rien.
  update households set invite_code = null, invite_expires_at = null where id = v_household;

  return jsonb_build_object('ok', true, 'household_id', v_household, 'member_id', v_member,
                            'recovery_code', v_recovery);
end $$;

-- Rattache le téléphone actuel à un membre existant grâce à son code de secours.
create or replace function public.recover_member(p_recovery_code text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_member members%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'non_connecte'); end if;
  if exists (select 1 from members where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'deja_membre');
  end if;
  if too_many_attempts() then return jsonb_build_object('ok', false, 'error', 'trop_de_tentatives'); end if;

  select * into v_member from members where recovery_hash = hash_code(p_recovery_code) for update;
  if v_member.id is null then
    insert into code_attempts (user_id) values (v_uid);
    return jsonb_build_object('ok', false, 'error', 'code_invalide');
  end if;

  update members set user_id = v_uid, updated_at = now() where id = v_member.id;
  return jsonb_build_object('ok', true, 'household_id', v_member.household_id, 'member_id', v_member.id);
end $$;

-- Nouveau code d'invitation (si le premier a expiré).
create or replace function public.regenerate_invite_code()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_household uuid := my_household_id();
  v_code text;
begin
  if v_household is null then return jsonb_build_object('ok', false, 'error', 'non_membre'); end if;
  if (select count(*) from members where household_id = v_household) >= 2 then
    return jsonb_build_object('ok', false, 'error', 'foyer_complet');
  end if;
  v_code := random_code(6);
  update households set invite_code = v_code, invite_expires_at = now() + interval '7 days'
    where id = v_household;
  return jsonb_build_object('ok', true, 'invite_code', v_code);
end $$;

-- Nouveau code de secours (l'ancien devient invalide).
create or replace function public.regenerate_recovery_code()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_code text := new_recovery_code();
begin
  if my_member_id() is null then return jsonb_build_object('ok', false, 'error', 'non_membre'); end if;
  update members set recovery_hash = hash_code(v_code) where user_id = auth.uid();
  return jsonb_build_object('ok', true, 'recovery_code', v_code);
end $$;

-- Matchs de prénoms : prénoms "aimés" par les deux membres. Ne révèle
-- jamais les votes "bof"/"non" ni les "j'aime" non partagés.
create or replace function public.name_match_list()
returns table (name text) language sql stable security definer set search_path = public, pg_temp as $$
  select v.name
  from name_votes v
  where v.household_id = my_household_id() and v.vote = 'like' and v.deleted_at is null
  group by v.name
  having count(distinct v.created_by) >= 2
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution : rien pour anon, tout passe par une session.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_household_id(), public.my_member_id(),
  public.create_household(text, text, text, text),
  public.join_household(text, text, text, text),
  public.recover_member(text),
  public.regenerate_invite_code(),
  public.regenerate_recovery_code(),
  public.name_match_list()
to authenticated;

revoke all on public.code_attempts from anon, authenticated;
