-- ============================================================
-- Custom Access Token Hook: injeta tenant_id/role no JWT do staff,
-- lendo de tenant_users. Necessário para as RLS policies (que checam
-- public.current_tenant_id(), definida em 001_schema.sql).
-- Rodar no SQL Editor do Supabase, depois de 001 e 002.
--
-- Depois de rodar este arquivo, ainda é preciso HABILITAR o hook no
-- Dashboard (não dá para fazer isso só via SQL):
--   Authentication > Hooks > Custom Access Token >
--   selecionar a função public.custom_access_token_hook
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  staff_tenant_id uuid;
  staff_role text;
begin
  select tu.tenant_id, tu.role
  into staff_tenant_id, staff_role
  from public.tenant_users tu
  where tu.user_id = (event ->> 'user_id')::uuid
  limit 1;

  claims := event -> 'claims';

  if staff_tenant_id is not null then
    claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(staff_tenant_id::text));
    claims := jsonb_set(claims, '{app_metadata,tenant_role}', to_jsonb(staff_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- O Auth Server roda como supabase_auth_admin, não como o usuário logado.
-- Precisa de permissão explícita para executar a função e ler tenant_users
-- (RLS continua ligado; esta policy libera só essa role específica).
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant select on public.tenant_users to supabase_auth_admin;

create policy "Allow auth admin to read tenant_users for the hook"
  on public.tenant_users
  as permissive
  for select
  to supabase_auth_admin
  using (true);
