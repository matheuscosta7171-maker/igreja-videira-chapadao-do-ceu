-- Igreja Videira — configuração segura do primeiro superadministrador
-- 1. Supabase > Authentication > Users.
-- 2. Abra o usuário e copie o campo UUID / User ID.
-- 3. Substitua apenas o texto COLOQUE_AQUI_O_ID_DO_USUARIO abaixo.
-- 4. Execute este arquivo no SQL Editor.

do $$
declare
  usuario_id_texto text := 'COLOQUE_AQUI_O_ID_DO_USUARIO';
  usuario_id uuid;
begin
  if usuario_id_texto = 'COLOQUE_AQUI_O_ID_DO_USUARIO' then
    raise exception 'Substitua COLOQUE_AQUI_O_ID_DO_USUARIO pelo UUID copiado em Authentication > Users.';
  end if;

  usuario_id := usuario_id_texto::uuid;

  if not exists (select 1 from auth.users where id = usuario_id) then
    raise exception 'O UUID informado não existe em Authentication > Users.';
  end if;

  insert into public.profiles(id, full_name, email)
  select id, coalesce(raw_user_meta_data->>'full_name', ''), email
  from auth.users
  where id = usuario_id
  on conflict(id) do update
    set email = excluded.email, updated_at = now();

  insert into public.user_roles(user_id, role, assigned_by)
  values(usuario_id, 'superadmin', usuario_id)
  on conflict(user_id, role) do update
    set assigned_by = excluded.assigned_by;
end $$;
