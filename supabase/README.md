# Migrations

Rodar em ordem, no SQL Editor do projeto Supabase:

1. `migrations/001_schema.sql` — tabelas + RLS de exemplo em `patients`.
2. `migrations/002_rls_policies.sql` — completa as RLS de todas as
   outras tabelas e adiciona `beds.public_token` (link público do
   paciente ao leito).
3. `migrations/003_custom_access_token_hook.sql` — cria a função do
   Custom Access Token Hook e as permissões que ela precisa.
4. `migrations/004_realtime.sql` — habilita Realtime em `orders` e
   `order_items` (usado pelo Kanban e pelo KDS da copa).

Depois de rodar o `003`, habilite o hook manualmente (não dá para
fazer isso via SQL): **Dashboard > Authentication > Hooks > Custom
Access Token**, selecione `public.custom_access_token_hook`.

Sem esse passo manual, o JWT do staff nunca vai ter `app_metadata.tenant_id`
e todas as policies de RLS vão bloquear tudo (retornam 0 linhas).

## Depois de aplicar

- `src/lib/supabase/database.types.ts` foi escrito manualmente para
  bater com este schema. Se o schema mudar, ajuste esse arquivo (ou,
  com a Supabase CLI instalada e logada, rode
  `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts`
  para gerar a versão oficial).
- Crie o primeiro tenant manualmente (`insert into tenants ...`) e o
  vínculo do seu usuário de staff em `tenant_users` — onboarding é
  manual neste MVP.
