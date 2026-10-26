-- =====================================================================
-- v2 migration: price editing, price history, admin edit permissions.
-- Run AFTER schema.sql (SQL Editor). Safe to run once.
-- =====================================================================

-- Track when each price line was last changed
alter table public.supplier_items
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists supplier_items_touch on public.supplier_items;
create trigger supplier_items_touch
before update on public.supplier_items
for each row execute function public.touch_updated_at();

-- Price change history (audit trail)
create table if not exists public.supplier_price_history (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid references public.supplier_items(id) on delete set null,
  supplier_id  uuid not null references public.suppliers(id) on delete cascade,
  description  text not null,
  old_price    numeric(14,2),
  new_price    numeric(14,2) not null,
  changed_by   uuid references auth.users(id),
  changed_at   timestamptz not null default now()
);
create index if not exists supplier_price_history_supplier_idx
  on public.supplier_price_history (supplier_id, changed_at desc);

alter table public.supplier_price_history enable row level security;

create policy "admins read price history"
  on public.supplier_price_history for select to authenticated using (public.is_admin());
create policy "admins write price history"
  on public.supplier_price_history for insert to authenticated with check (public.is_admin());

-- Admins can add, edit and delete price lines (anon still has no access)
create policy "admins insert supplier items"
  on public.supplier_items for insert to authenticated with check (public.is_admin());
create policy "admins update supplier items"
  on public.supplier_items for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins delete supplier items"
  on public.supplier_items for delete to authenticated using (public.is_admin());
