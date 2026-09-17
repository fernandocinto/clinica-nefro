-- ============================================================
-- Habilita Realtime (Postgres Changes) nas tabelas que o Kanban
-- da copa e o KDS escutam.
-- Rodar no SQL Editor do Supabase, depois de 001, 002 e 003.
-- ============================================================

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
