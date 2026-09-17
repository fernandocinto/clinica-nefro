-- ============================================================
-- App Copa Clínica — Schema inicial multi-tenant (MVP)
-- Rodar no SQL Editor do Supabase
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- TENANTS (Clínicas) ----------
create table public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subdomain text not null unique, -- ex: 'clinicaabc' -> clinicaabc.seudominio.com
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now()
);

-- ---------- TENANT_USERS (staff / copa / admin da clínica) ----------
create table public.tenant_users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin','admin','copa','copeira')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- ---------- LOCATIONS (Unidade / Sala) ----------
create table public.locations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null -- ex: "Unidade Centro", "Sala 2"
);

-- ---------- BEDS (Leitos / Poltronas) ----------
create table public.beds (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  label text not null -- ex: "Poltrona 04"
);

-- ---------- ALLERGENS (tags globais de alergia) ----------
create table public.allergens (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique -- ex: 'glúten', 'lactose', 'frutos do mar'
);

-- ---------- PATIENTS ----------
create table public.patients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  birth_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.patient_allergens (
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen_id uuid not null references public.allergens(id) on delete cascade,
  primary key (patient_id, allergen_id)
);

-- Ocupação: qual paciente está em qual leito, em qual turno/data
create table public.patient_occupancy (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  bed_id uuid not null references public.beds(id) on delete cascade,
  shift text not null check (shift in ('manha','tarde','noite')),
  occupancy_date date not null,
  created_at timestamptz not null default now()
);

-- ---------- MENUS (Cardápios) ----------
create table public.menus (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, -- ex: "Cardápio Padrão", "Cardápio de Natal"
  active boolean not null default true
);

-- Regras de disponibilidade (data/hora) de cada cardápio
create table public.menu_availability (
  id uuid primary key default uuid_generate_v4(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  start_date date, -- null = sem restrição de data inicial
  end_date date,   -- null = sem restrição de data final
  days_of_week int[], -- 0=domingo ... 6=sábado; null = todos os dias
  start_time time,
  end_time time
);

-- ---------- MENU GROUPS (categorias: Entradas, Pratos, Sobremesas...) ----------
create table public.menu_groups (
  id uuid primary key default uuid_generate_v4(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

-- ---------- PRODUCTS ----------
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true
);

create table public.product_allergens (
  product_id uuid not null references public.products(id) on delete cascade,
  allergen_id uuid not null references public.allergens(id) on delete cascade,
  primary key (product_id, allergen_id)
);

-- Produto dentro de um grupo de cardápio (N:N)
create table public.menu_group_products (
  menu_group_id uuid not null references public.menu_groups(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order int not null default 0,
  primary key (menu_group_id, product_id)
);

-- ---------- ORDERS (Pedidos / Kanban) ----------
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  bed_id uuid not null references public.beds(id),
  status text not null default 'recebido'
    check (status in ('recebido','em_preparo','em_montagem','pronto','entregue','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null default 1,
  notes text
);

-- Histórico de mudança de status (auditoria do Kanban)
create table public.order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

-- ============================================================
-- RLS (Row Level Security) — isolamento por tenant_id
-- ============================================================

alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.locations enable row level security;
alter table public.beds enable row level security;
alter table public.patients enable row level security;
alter table public.patient_allergens enable row level security;
alter table public.patient_occupancy enable row level security;
alter table public.menus enable row level security;
alter table public.menu_availability enable row level security;
alter table public.menu_groups enable row level security;
alter table public.products enable row level security;
alter table public.product_allergens enable row level security;
alter table public.menu_group_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

-- Função helper: lê o tenant_id do JWT do usuário logado
-- (precisa ser preenchido em app_metadata via Custom Access Token Hook
--  ou ao inserir o registro em tenant_users — ver observações abaixo)
create or replace function public.current_tenant_id()
returns uuid
language sql stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

-- Policy padrão — repetir esse padrão (ajustando o nome da tabela)
-- para locations, beds, patients, menus, products, orders etc.
create policy "tenant_isolation_select" on public.patients
  for select using (tenant_id = public.current_tenant_id());

create policy "tenant_isolation_write" on public.patients
  for insert with check (tenant_id = public.current_tenant_id());

create policy "tenant_isolation_update" on public.patients
  for update using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_isolation_delete" on public.patients
  for delete using (tenant_id = public.current_tenant_id());

-- Repita as 4 policies acima (select/insert/update/delete) para:
-- locations, beds, patient_occupancy, menus, menu_groups, products,
-- orders, order_items, order_status_history, tenant_users
