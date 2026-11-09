-- =============================================================================
-- Extras : suivi des parents, lettres à Biboun, calendrier iPhone, liste de
-- naissance partagée avec la famille.
-- =============================================================================

-- ---------------------------------------------------------------- suivi des parents
create table public.parent_checkins (
  id          uuid primary key,
  entry_date  date not null,
  mood        smallint check (mood between 1 and 5),
  energy      smallint check (energy between 1 and 5),
  pain        smallint check (pain between 0 and 3),
  feelings    text[] not null default '{}',
  note        text
);
select public.make_synced('public.parent_checkins');

-- ---------------------------------------------------------------- lettres
create table public.letters (
  id          uuid primary key,
  title       text,
  body        text not null check (char_length(body) <= 20000),
  written_on  date not null,
  open_on     date            -- enveloppe scellée jusqu'à cette date (affichage)
);
select public.make_synced('public.letters');

-- ---------------------------------------------------------------- calendrier iPhone
-- Jeton personnel pour l'abonnement (lecture des RDV et échéances du foyer).
create table public.calendar_tokens (
  member_id   uuid primary key references public.members(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now()
);
alter table public.calendar_tokens enable row level security;
revoke all on public.calendar_tokens from anon, authenticated;

create or replace function public.create_calendar_token()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_member uuid := my_member_id();
  v_token text := random_code(32);
begin
  if v_member is null then return jsonb_build_object('ok', false, 'error', 'non_membre'); end if;
  insert into calendar_tokens (member_id, token_hash) values (v_member, hash_code(v_token))
    on conflict (member_id) do update set token_hash = excluded.token_hash, created_at = now();
  return jsonb_build_object('ok', true, 'token', v_token);
end $$;

create or replace function public.revoke_calendar_token()
returns jsonb language sql volatile security definer set search_path = public, pg_temp as $$
  delete from calendar_tokens where member_id = my_member_id();
  select jsonb_build_object('ok', true);
$$;

create or replace function public.has_calendar_token()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from calendar_tokens where member_id = my_member_id())
$$;

-- ---------------------------------------------------------------- liste de naissance publique
alter table public.checklist_items
  add column if not exists reserved_by text check (char_length(reserved_by) <= 60),
  add column if not exists reserved_at timestamptz;

create table public.wishlist_shares (
  checklist_id  uuid primary key references public.checklists(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  token_hash    text not null unique,
  message       text check (char_length(message) <= 500),
  created_at    timestamptz not null default now()
);
alter table public.wishlist_shares enable row level security;
revoke all on public.wishlist_shares from anon, authenticated;

create table public.wishlist_events (share uuid not null, at timestamptz not null default now());
alter table public.wishlist_events enable row level security;
revoke all on public.wishlist_events from anon, authenticated;

create or replace function public.create_wishlist_share(p_checklist uuid, p_message text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_household uuid := my_household_id();
  v_token text := random_code(20);
begin
  if not exists (select 1 from checklists where id = p_checklist and household_id = v_household and deleted_at is null) then
    return jsonb_build_object('ok', false, 'error', 'liste_introuvable');
  end if;
  insert into wishlist_shares (checklist_id, household_id, token_hash, message)
    values (p_checklist, v_household, hash_code(v_token), left(p_message, 500))
    on conflict (checklist_id) do update set token_hash = excluded.token_hash, message = excluded.message, created_at = now();
  return jsonb_build_object('ok', true, 'token', v_token);
end $$;

create or replace function public.revoke_wishlist_share(p_checklist uuid)
returns jsonb language sql volatile security definer set search_path = public, pg_temp as $$
  delete from wishlist_shares where checklist_id = p_checklist and household_id = my_household_id();
  select jsonb_build_object('ok', true);
$$;

create or replace function public.wishlist_shared(p_checklist uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from wishlist_shares where checklist_id = p_checklist and household_id = my_household_id())
$$;

-- Lecture publique : uniquement les libellés de CETTE liste (ni budget, ni notes, ni responsables)
create or replace function public.public_wishlist(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_share wishlist_shares%rowtype;
begin
  select * into v_share from wishlist_shares where token_hash = hash_code(p_token);
  if v_share.checklist_id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object(
    'ok', true,
    'message', v_share.message,
    'title', (select title from checklists where id = v_share.checklist_id),
    'parents', (select string_agg(first_name, ' & ' order by created_at) from members where household_id = v_share.household_id),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'label', i.label, 'done', i.done, 'reserved_by', i.reserved_by) order by i.position)
      from checklist_items i where i.checklist_id = v_share.checklist_id and i.deleted_at is null), '[]'::jsonb)
  );
end $$;

-- Réserver (ou libérer, avec le même prénom) un cadeau
create or replace function public.reserve_wishlist_item(p_token text, p_item uuid, p_name text, p_cancel boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_share wishlist_shares%rowtype;
  v_item checklist_items%rowtype;
  v_name text := left(trim(coalesce(p_name, '')), 60);
begin
  select * into v_share from wishlist_shares where token_hash = hash_code(p_token);
  if v_share.checklist_id is null then return jsonb_build_object('ok', false, 'error', 'lien_invalide'); end if;
  if (select count(*) from wishlist_events where share = v_share.checklist_id and at > now() - interval '10 minutes') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'trop_de_demandes');
  end if;
  insert into wishlist_events (share) values (v_share.checklist_id);
  select * into v_item from checklist_items where id = p_item and checklist_id = v_share.checklist_id and deleted_at is null for update;
  if v_item.id is null then return jsonb_build_object('ok', false, 'error', 'introuvable'); end if;
  if v_name = '' then return jsonb_build_object('ok', false, 'error', 'prenom'); end if;
  if p_cancel then
    if lower(coalesce(v_item.reserved_by, '')) <> lower(v_name) then return jsonb_build_object('ok', false, 'error', 'pas_le_votre'); end if;
    update checklist_items set reserved_by = null, reserved_at = null, updated_at = clock_timestamp() where id = p_item;
    return jsonb_build_object('ok', true);
  end if;
  if v_item.done or v_item.reserved_by is not null then return jsonb_build_object('ok', false, 'error', 'deja_pris'); end if;
  update checklist_items set reserved_by = v_name, reserved_at = now(), updated_at = clock_timestamp() where id = p_item;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.create_calendar_token(), public.revoke_calendar_token(), public.has_calendar_token(),
  public.create_wishlist_share(uuid, text), public.revoke_wishlist_share(uuid), public.wishlist_shared(uuid),
  public.public_wishlist(text), public.reserve_wishlist_item(text, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.create_calendar_token(), public.revoke_calendar_token(), public.has_calendar_token(),
  public.create_wishlist_share(uuid, text), public.revoke_wishlist_share(uuid), public.wishlist_shared(uuid) to authenticated;
grant execute on function public.public_wishlist(text), public.reserve_wishlist_item(text, uuid, text, boolean) to anon, authenticated;
