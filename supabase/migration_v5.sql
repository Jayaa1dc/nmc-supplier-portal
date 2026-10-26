-- =====================================================================
-- v5 migration: approval workflow, approval history, active/inactive,
-- document expiry dates. Run AFTER schema, v2, v3 and v4.
-- =====================================================================

-- Full approval states
alter type supplier_status add value if not exists 'draft';
alter type supplier_status add value if not exists 'under_review';
alter type supplier_status add value if not exists 'changes_requested';

-- Active / inactive (deactivate instead of delete)
alter table public.suppliers add column if not exists is_active boolean not null default true;

-- Document expiry (licences, VAT, ISO)
alter table public.supplier_documents add column if not exists expires_on date;

-- Approval history: who changed what, when, and why
create table if not exists public.supplier_approval_log (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  reason       text,
  actor_id     uuid references auth.users(id),
  actor_email  text,
  created_at   timestamptz not null default now()
);
create index if not exists supplier_approval_log_idx on public.supplier_approval_log (supplier_id, created_at desc);

alter table public.supplier_approval_log enable row level security;

create policy "admins read approval log"
  on public.supplier_approval_log for select to authenticated using (public.is_admin());
create policy "admins write approval log"
  on public.supplier_approval_log for insert to authenticated with check (public.is_admin());

-- Admins can update document expiry dates
create policy "admins update supplier documents"
  on public.supplier_documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
