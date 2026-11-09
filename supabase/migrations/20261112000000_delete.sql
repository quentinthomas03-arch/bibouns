-- =============================================================================
-- Suppression définitive de TOUTES les données du foyer (droit à l'effacement).
-- Les photos du stockage sont supprimées par l'appli juste avant (API Storage).
-- Supprimer le foyer supprime en cascade : membres, toutes les tables de
-- données, abonnements aux notifications, jetons de raccourcis.
-- =============================================================================
create or replace function public.delete_household(p_confirm text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_household uuid := my_household_id();
begin
  if v_household is null then return jsonb_build_object('ok', false, 'error', 'non_membre'); end if;
  if p_confirm is distinct from 'SUPPRIMER' then return jsonb_build_object('ok', false, 'error', 'confirmation'); end if;
  delete from push_log where key like v_household::text || ':%';
  delete from households where id = v_household;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.delete_household(text) from public, anon;
grant execute on function public.delete_household(text) to authenticated;
