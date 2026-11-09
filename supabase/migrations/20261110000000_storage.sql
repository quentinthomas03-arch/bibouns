-- =============================================================================
-- Stockage privé des photos (documents, souvenirs).
-- Chaque fichier est rangé sous "<household_id>/..." : la policy n'autorise
-- un membre qu'à lire/écrire/supprimer dans le dossier de SON foyer.
-- Bucket privé : les images ne sont accessibles que par liens signés temporaires.
-- (Ignoré si le schéma storage n'existe pas, ex. base de test locale.)
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'schéma storage absent : migration de stockage ignorée';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('household-files', 'household-files', false, 5242880,
          array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                                 allowed_mime_types = excluded.allowed_mime_types;

  execute $p$
    create policy "foyer : lire ses fichiers" on storage.objects for select to authenticated
    using (bucket_id = 'household-files' and (storage.foldername(name))[1] = public.my_household_id()::text)
  $p$;
  execute $p$
    create policy "foyer : ajouter ses fichiers" on storage.objects for insert to authenticated
    with check (bucket_id = 'household-files' and (storage.foldername(name))[1] = public.my_household_id()::text)
  $p$;
  execute $p$
    create policy "foyer : supprimer ses fichiers" on storage.objects for delete to authenticated
    using (bucket_id = 'household-files' and (storage.foldername(name))[1] = public.my_household_id()::text)
  $p$;
end $$;
