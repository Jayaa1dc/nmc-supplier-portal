-- =====================================================================
-- NMC Supplier Directory & Pre-Qualification Portal
-- Run once on a fresh Supabase project (SQL Editor).
-- supplier_code = EXISTING HIS supplier code. It is never generated here.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- Enums ----------
create type supplier_status as enum ('pending', 'approved', 'rejected');
create type supplier_source as enum ('application', 'legacy_import');
create type supplier_doc_type as enum (
  'business_registration', 'vat_certificate', 'iso_certificate',
  'past_experience', 'deposit_receipt', 'other'
);

-- ---------- Admin users (procurement officers) ----------
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  full_name  text,
  created_at timestamptz not null default now()
);

-- ---------- Suppliers ----------
create table public.suppliers (
  id                   uuid primary key default gen_random_uuid(),
  supplier_code        text not null unique,          -- Existing HIS code
  company_name         text not null,
  head_office_address  text,
  factory_address      text,
  telephone            text,
  mobile               text,
  fax                  text,
  email                text,
  contact_person       text,
  contact_title        text,
  business_nature      text check (business_nature in ('manufacturer','wholesaler','stockist','retailer')),
  categories           text[]  not null default '{}',
  branches             text[]  not null default '{}',  -- branches using this supplier (legacy import)
  iso_9000             boolean not null default false,
  iso_certificate_no   text,
  production_capacity  text,
  quality_controls     text,
  price_validity_until date,
  deposit_amount       numeric(12,2),
  deposit_receipt_no   text,
  status               supplier_status not null default 'pending',
  source               supplier_source not null default 'application',
  review_notes         text,
  reviewed_by          uuid references auth.users(id),
  reviewed_at          timestamptz,
  submitted_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint supplier_code_format check (supplier_code ~ '^SP[0-9]{8}$'),
  -- Applications must be complete; legacy HIS imports may be partial.
  constraint application_completeness check (
    source = 'legacy_import' or (
      head_office_address is not null and telephone is not null and email is not null
      and contact_person is not null and business_nature is not null
    )
  )
);

create index suppliers_status_idx        on public.suppliers (status);
create index suppliers_categories_gin    on public.suppliers using gin (categories);
create index suppliers_name_trgm         on public.suppliers using gin (company_name gin_trgm_ops);
create index suppliers_code_trgm         on public.suppliers using gin (supplier_code gin_trgm_ops);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger suppliers_touch
before update on public.suppliers
for each row execute function public.touch_updated_at();

-- ---------- Price list items (linked to supplier by HIS code) ----------
create table public.supplier_items (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers(id) on delete cascade,
  line_no      int  not null,
  his_item_code text,
  description  text not null,
  brand        text,
  unit         text not null default 'Each',
  unit_price   numeric(14,2) not null check (unit_price >= 0),
  currency     text not null default 'LKR',
  created_at   timestamptz not null default now(),
  unique (supplier_id, line_no)
);
create index supplier_items_supplier_idx on public.supplier_items (supplier_id);

-- ---------- Uploaded documents (files live in Supabase Storage) ----------
create table public.supplier_documents (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references public.suppliers(id) on delete cascade,
  doc_type     supplier_doc_type not null,
  storage_path text not null unique,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   int  not null,
  uploaded_at  timestamptz not null default now()
);
create index supplier_documents_supplier_idx on public.supplier_documents (supplier_id);

-- ---------- Admin check (SECURITY DEFINER avoids RLS recursion) ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- ---------- Row Level Security ----------
-- Public (anon) role: NO policies, so no direct access to any table.
-- Public registrations are written by a server action using the service-role key.
alter table public.admin_users       enable row level security;
alter table public.suppliers         enable row level security;
alter table public.supplier_items    enable row level security;
alter table public.supplier_documents enable row level security;

create policy "admins read admin_users"
  on public.admin_users for select to authenticated using (public.is_admin());

create policy "admins read suppliers"
  on public.suppliers for select to authenticated using (public.is_admin());
create policy "admins update suppliers"
  on public.suppliers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admins read supplier items"
  on public.supplier_items for select to authenticated using (public.is_admin());

create policy "admins read supplier documents"
  on public.supplier_documents for select to authenticated using (public.is_admin());

-- ---------- Storage: private bucket for supplier documents ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-documents', 'supplier-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Admins may read files (via short-lived signed URLs). Uploads use the service role.
create policy "admins read supplier documents files"
  on storage.objects for select to authenticated
  using (bucket_id = 'supplier-documents' and public.is_admin());

-- ---------- Seed the first admin ----------
-- 1) Supabase Dashboard → Authentication → Users → "Add user" (email + password).
-- 2) Then run:
--
-- insert into public.admin_users (user_id, email, full_name)
-- select id, email, 'Procurement Officer'
-- from auth.users
-- where email = 'procurement@nawaloka.com'
-- on conflict (user_id) do nothing;
