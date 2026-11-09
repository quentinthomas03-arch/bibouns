-- =============================================================================
-- Notifications push (Web Push).
--   push_subscriptions : un abonnement par téléphone (chacun gère les siens)
--   push_config        : clés VAPID + secret du cron (jamais lisible par l'appli)
--   push_log           : rappels déjà envoyés (anti-doublon)
-- Le cron appelle la fonction "push" toutes les 5 minutes.
-- =============================================================================

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_ok_at    timestamptz,
  fail_count    int not null default 0
);
create index push_subscriptions_member_idx on public.push_subscriptions(member_id);
alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
create policy own_subscriptions on public.push_subscriptions for all to authenticated
  using (member_id = public.my_member_id())
  with check (member_id = public.my_member_id() and household_id = public.my_household_id());

create table public.push_config (
  id                 int primary key check (id = 1),
  vapid_public       text,
  vapid_private_jwk  jsonb,
  cron_secret        text not null,
  function_url       text
);
alter table public.push_config enable row level security;  -- aucune policy
revoke all on public.push_config from anon, authenticated;
insert into public.push_config (id, cron_secret) values (1, public.random_code(40)) on conflict do nothing;

create table public.push_log (
  key      text primary key,
  sent_at  timestamptz not null default now()
);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- Clé publique VAPID (nécessaire au téléphone pour s'abonner)
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select vapid_public from push_config where id = 1
$$;
revoke execute on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- Cron : toutes les 5 minutes (si les extensions sont disponibles)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    perform cron.schedule('bibouns-push-tick', '*/5 * * * *', $job$
      select net.http_post(
        url := c.function_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', c.cron_secret),
        body := '{"action":"tick"}'::jsonb,
        timeout_milliseconds := 20000)
      from public.push_config c
      where c.id = 1 and c.function_url is not null
    $job$);
    -- Purge du journal (plus de 60 jours), chaque nuit
    perform cron.schedule('bibouns-push-log-purge', '17 3 * * *', $job$
      delete from public.push_log where sent_at < now() - interval '60 days'
    $job$);
  else
    raise notice 'pg_cron/pg_net indisponibles : cron des notifications non installé';
  end if;
end $$;
