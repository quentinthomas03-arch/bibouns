-- =============================================================================
-- Raccourcis iPhone (app Raccourcis / Siri) : saisie bébé en 1 tap.
-- Le raccourci appelle la fonction quick_log avec un JETON personnel :
--   * le jeton (24 caractères, ~119 bits d'aléa) n'est stocké que haché ;
--   * il ne permet QUE d'ajouter une saisie bébé pour son foyer (aucune lecture) ;
--   * il est révocable à tout moment depuis l'appli ;
--   * limite de 30 saisies / 10 min par jeton.
-- =============================================================================

create table public.shortcut_tokens (
  member_id   uuid primary key references public.members(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  last_used   timestamptz
);
alter table public.shortcut_tokens enable row level security;  -- aucune policy : accès via RPC seulement
revoke all on public.shortcut_tokens from anon, authenticated;

create or replace function public.create_shortcut_token()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_member uuid := my_member_id();
  v_token text := random_code(24);
begin
  if v_member is null then return jsonb_build_object('ok', false, 'error', 'non_membre'); end if;
  insert into shortcut_tokens (member_id, token_hash) values (v_member, hash_code(v_token))
    on conflict (member_id) do update set token_hash = excluded.token_hash, created_at = now(), last_used = null;
  return jsonb_build_object('ok', true, 'token', v_token);
end $$;

create or replace function public.revoke_shortcut_token()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  delete from shortcut_tokens where member_id = my_member_id();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.has_shortcut_token()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from shortcut_tokens where member_id = my_member_id())
$$;

-- Actions : biberon, pipi, caca, pipi_caca, dodo, reveil, tetee_g, tetee_d, fin_tetee, soin
create or replace function public.quick_log(token text, action text, ml int default null, name text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_member members%rowtype;
  v_kind text;
  v_data jsonb;
  v_ml int;
  v_running uuid;
  v_name text;
  v_msg text;
begin
  select m.* into v_member from shortcut_tokens t join members m on m.id = t.member_id
    where t.token_hash = hash_code(quick_log.token);
  if v_member.id is null then
    return jsonb_build_object('ok', false, 'message', 'Jeton invalide : recrée le raccourci depuis l’appli.');
  end if;
  if (select count(*) from baby_events where created_by = v_member.id and created_at > now() - interval '10 minutes') >= 30 then
    return jsonb_build_object('ok', false, 'message', 'Trop de saisies d’un coup, réessaie dans quelques minutes.');
  end if;
  update shortcut_tokens set last_used = now() where member_id = v_member.id;

  case lower(trim(quick_log.action))
    when 'biberon' then
      v_ml := coalesce(quick_log.ml, (select (data->>'ml')::int from baby_events
                where household_id = v_member.household_id and kind = 'feed' and data->>'mode' = 'bottle'
                  and data ? 'ml' and deleted_at is null order by started_at desc limit 1), 90);
      if v_ml <= 0 or v_ml > 500 then return jsonb_build_object('ok', false, 'message', 'Quantité invalide.'); end if;
      v_kind := 'feed'; v_data := jsonb_build_object('mode', 'bottle', 'ml', v_ml);
      v_msg := format('Biberon %s ml noté 🍼', v_ml);
    when 'pipi' then v_kind := 'diaper'; v_data := '{"pee": true, "poo": false}'; v_msg := 'Pipi noté 💧';
    when 'caca' then v_kind := 'diaper'; v_data := '{"pee": false, "poo": true}'; v_msg := 'Caca noté 💩';
    when 'pipi_caca' then v_kind := 'diaper'; v_data := '{"pee": true, "poo": true}'; v_msg := 'Couche notée 💧💩';
    when 'tetee_g', 'tetee_d' then
      -- termine une éventuelle tétée en cours puis démarre la nouvelle
      update baby_events set ended_at = now(), updated_at = now()
        where household_id = v_member.household_id and kind = 'feed' and data->>'mode' = 'breast' and ended_at is null and deleted_at is null;
      v_kind := 'feed'; v_data := jsonb_build_object('mode', 'breast', 'side', case when lower(quick_log.action) = 'tetee_g' then 'L' else 'R' end);
      v_msg := case when lower(quick_log.action) = 'tetee_g' then 'Tétée gauche lancée ⏱️' else 'Tétée droite lancée ⏱️' end;
    when 'fin_tetee' then
      update baby_events set ended_at = now(), updated_at = now()
        where household_id = v_member.household_id and kind = 'feed' and data->>'mode' = 'breast' and ended_at is null and deleted_at is null
        returning id into v_running;
      return jsonb_build_object('ok', true, 'message', case when v_running is null then 'Aucune tétée en cours.' else 'Tétée terminée ✓' end);
    when 'dodo' then
      select id into v_running from baby_events where household_id = v_member.household_id and kind = 'sleep' and ended_at is null and deleted_at is null limit 1;
      if v_running is not null then return jsonb_build_object('ok', true, 'message', 'Déjà endormi·e 😴'); end if;
      v_kind := 'sleep'; v_data := '{}'; v_msg := 'Chut… dodo lancé 😴';
    when 'reveil' then
      update baby_events set ended_at = now(), updated_at = now()
        where household_id = v_member.household_id and kind = 'sleep' and ended_at is null and deleted_at is null
        returning id into v_running;
      return jsonb_build_object('ok', true, 'message', case when v_running is null then 'Aucun sommeil en cours.' else 'Réveil noté ☀️' end);
    when 'soin' then
      v_name := coalesce(nullif(trim(quick_log.name), ''), (select value->>0 from settings where household_id = v_member.household_id and key = 'meds' and deleted_at is null), 'Vitamine D');
      v_kind := 'med'; v_data := jsonb_build_object('name', left(v_name, 60)); v_msg := format('%s noté 💊', v_name);
    else
      return jsonb_build_object('ok', false, 'message', 'Action inconnue.');
  end case;

  insert into baby_events (id, household_id, created_by, kind, started_at, ended_at, data, updated_at)
    values (gen_random_uuid(), v_member.household_id, v_member.id, v_kind, now(), null, v_data, now());
  return jsonb_build_object('ok', true, 'message', v_msg);
end $$;

revoke execute on function public.create_shortcut_token(), public.revoke_shortcut_token(), public.has_shortcut_token(),
  public.quick_log(text, text, int, text) from public, anon, authenticated;
grant execute on function public.create_shortcut_token(), public.revoke_shortcut_token(), public.has_shortcut_token() to authenticated;
grant execute on function public.quick_log(text, text, int, text) to anon, authenticated;
