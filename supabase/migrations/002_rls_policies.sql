-- ============================================================
-- Completa as RLS policies que 001_schema.sql deixou só como
-- exemplo (aplicadas apenas em `patients`), e adiciona o token
-- público de acesso do paciente ao leito.
-- Rodar no SQL Editor do Supabase, depois de 001_schema.sql.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Token público do leito (link do paciente) ----------
-- O paciente acessa o cardápio via /order/<public_token>, sem login.
-- A rota resolve o token -> bed -> ocupação atual -> paciente no server,
-- usando o service role (ver src/lib/patient-access.ts), então este
-- token não precisa de policy de RLS própria: nunca é lido via client
-- com a anon key.
alter table public.beds
  add column public_token text not null unique
  default encode(gen_random_bytes(12), 'hex');

-- ---------- Tabelas com tenant_id direto: mesmo padrão de `patients` ----------
do $$
declare
  t text;
begin
  foreach t in array array['locations', 'beds', 'patient_occupancy', 'menus', 'products', 'orders']
  loop
    execute format(
      'create policy "tenant_isolation_select" on public.%I for select using (tenant_id = public.current_tenant_id());',
      t
    );
    execute format(
      'create policy "tenant_isolation_write" on public.%I for insert with check (tenant_id = public.current_tenant_id());',
      t
    );
    execute format(
      'create policy "tenant_isolation_update" on public.%I for update using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());',
      t
    );
    execute format(
      'create policy "tenant_isolation_delete" on public.%I for delete using (tenant_id = public.current_tenant_id());',
      t
    );
  end loop;
end $$;

-- ---------- Tabelas sem tenant_id direto: isolamento via join ----------

-- patient_allergens (via patients.tenant_id)
create policy "tenant_isolation_select" on public.patient_allergens
  for select using (
    exists (
      select 1 from public.patients p
      where p.id = patient_allergens.patient_id
        and p.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.patient_allergens
  for insert with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_allergens.patient_id
        and p.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_delete" on public.patient_allergens
  for delete using (
    exists (
      select 1 from public.patients p
      where p.id = patient_allergens.patient_id
        and p.tenant_id = public.current_tenant_id()
    )
  );

-- product_allergens (via products.tenant_id)
create policy "tenant_isolation_select" on public.product_allergens
  for select using (
    exists (
      select 1 from public.products pr
      where pr.id = product_allergens.product_id
        and pr.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.product_allergens
  for insert with check (
    exists (
      select 1 from public.products pr
      where pr.id = product_allergens.product_id
        and pr.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_delete" on public.product_allergens
  for delete using (
    exists (
      select 1 from public.products pr
      where pr.id = product_allergens.product_id
        and pr.tenant_id = public.current_tenant_id()
    )
  );

-- menu_groups (via menus.tenant_id)
create policy "tenant_isolation_select" on public.menu_groups
  for select using (
    exists (
      select 1 from public.menus m
      where m.id = menu_groups.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.menu_groups
  for insert with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_groups.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_update" on public.menu_groups
  for update using (
    exists (
      select 1 from public.menus m
      where m.id = menu_groups.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  ) with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_groups.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_delete" on public.menu_groups
  for delete using (
    exists (
      select 1 from public.menus m
      where m.id = menu_groups.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );

-- menu_availability (via menus.tenant_id)
create policy "tenant_isolation_select" on public.menu_availability
  for select using (
    exists (
      select 1 from public.menus m
      where m.id = menu_availability.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.menu_availability
  for insert with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_availability.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_update" on public.menu_availability
  for update using (
    exists (
      select 1 from public.menus m
      where m.id = menu_availability.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  ) with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_availability.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_delete" on public.menu_availability
  for delete using (
    exists (
      select 1 from public.menus m
      where m.id = menu_availability.menu_id
        and m.tenant_id = public.current_tenant_id()
    )
  );

-- menu_group_products (via menu_groups -> menus.tenant_id)
create policy "tenant_isolation_select" on public.menu_group_products
  for select using (
    exists (
      select 1 from public.menu_groups mg
      join public.menus m on m.id = mg.menu_id
      where mg.id = menu_group_products.menu_group_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.menu_group_products
  for insert with check (
    exists (
      select 1 from public.menu_groups mg
      join public.menus m on m.id = mg.menu_id
      where mg.id = menu_group_products.menu_group_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_update" on public.menu_group_products
  for update using (
    exists (
      select 1 from public.menu_groups mg
      join public.menus m on m.id = mg.menu_id
      where mg.id = menu_group_products.menu_group_id
        and m.tenant_id = public.current_tenant_id()
    )
  ) with check (
    exists (
      select 1 from public.menu_groups mg
      join public.menus m on m.id = mg.menu_id
      where mg.id = menu_group_products.menu_group_id
        and m.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_delete" on public.menu_group_products
  for delete using (
    exists (
      select 1 from public.menu_groups mg
      join public.menus m on m.id = mg.menu_id
      where mg.id = menu_group_products.menu_group_id
        and m.tenant_id = public.current_tenant_id()
    )
  );

-- order_items (via orders.tenant_id)
create policy "tenant_isolation_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_update" on public.order_items
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  ) with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_delete" on public.order_items
  for delete using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );

-- order_status_history (via orders.tenant_id) — log de auditoria, sem update/delete
create policy "tenant_isolation_select" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );
create policy "tenant_isolation_write" on public.order_status_history
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and o.tenant_id = public.current_tenant_id()
    )
  );

-- ---------- tenants: cada staff só enxerga a própria clínica ----------
create policy "tenant_isolation_select" on public.tenants
  for select using (id = public.current_tenant_id());

-- ---------- tenant_users: cada staff enxerga seu próprio vínculo e os colegas do mesmo tenant ----------
create policy "tenant_users_select_own" on public.tenant_users
  for select using (user_id = auth.uid());

create policy "tenant_users_select_same_tenant" on public.tenant_users
  for select using (tenant_id = public.current_tenant_id());

-- ---------- allergens ----------
-- A tabela é uma taxonomia global (sem tenant_id), compartilhada entre
-- clínicas. Neste MVP (uma clínica-piloto) liberamos CRUD completo para
-- qualquer staff autenticado, como pedido no escopo do admin.
create policy "allergens_select_authenticated" on public.allergens
  for select to authenticated using (true);
create policy "allergens_write_authenticated" on public.allergens
  for insert to authenticated with check (true);
create policy "allergens_update_authenticated" on public.allergens
  for update to authenticated using (true) with check (true);
create policy "allergens_delete_authenticated" on public.allergens
  for delete to authenticated using (true);

-- ---------- índices de apoio ----------
create index if not exists idx_patient_occupancy_bed_lookup
  on public.patient_occupancy (bed_id, occupancy_date, shift);
create index if not exists idx_orders_tenant_status
  on public.orders (tenant_id, status);
create index if not exists idx_tenant_users_user_id
  on public.tenant_users (user_id);
