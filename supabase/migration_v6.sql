-- =====================================================================
-- v6 migration: centres, multi-centre suppliers, centre-specific price
-- lists, categories (Pharmacy / Lab / General Stores), price history
-- details, supplier agreements and document uploads.
-- Reuses existing tables. Run AFTER v2, v3, v4 and v5.
-- =====================================================================

-- ---------- 1. Centres ----------
create table if not exists public.centres (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  code        text not null unique,
  sort_order  int  not null default 0
);
insert into public.centres (name, code, sort_order) values
  ('Panadura', 'PCM', 1),
  ('Kiribathgoda', 'KMC', 2),
  ('Battaramulla', 'BMC', 3),
  ('Ja-Ela', 'JMC', 4),
  ('Kirillawala', 'CC', 5),
  ('Kurunegala', 'KLB', 6)
on conflict (name) do nothing;

-- ---------- 2. Supplier <-> centre (many to many) ----------
create table if not exists public.supplier_centres (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  centre_id   uuid not null references public.centres(id) on delete cascade,
  primary key (supplier_id, centre_id)
);
-- Backfill from the existing suppliers.branches column
insert into public.supplier_centres (supplier_id, centre_id)
select distinct s.id, c.id
from public.suppliers s
cross join lateral unnest(coalesce(s.branches, '{}'::text[])) as b(name)
join public.centres c
  on lower(c.name) = lower(trim(b.name))
  or upper(c.code) = upper(trim(b.name))
  or (c.name = 'Panadura' and upper(trim(b.name)) = 'PMC')
  or (c.name = 'Kirillawala' and lower(trim(b.name)) = 'kirillawela')
on conflict do nothing;

-- ---------- 3. Supplier <-> category (Pharmacy / Lab / General Stores) ----------
create table if not exists public.supplier_departments (
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  dept        text not null check (dept in ('pharmacy', 'lab', 'general_stores')),
  primary key (supplier_id, dept)
);
-- Backfill from the "Departments:" note written by the legacy import
insert into public.supplier_departments (supplier_id, dept)
select s.id, d.dept
from public.suppliers s
cross join lateral (values
  ('pharmacy', 'OPD Pharmacy'),
  ('lab', 'Lab Store'),
  ('general_stores', 'General Store')
) as d(dept, label)
where s.review_notes ilike '%' || d.label || '%'
on conflict do nothing;

-- ---------- 4. Price list rows: centre and category ----------
alter table public.supplier_items add column if not exists centre_id uuid references public.centres(id);
alter table public.supplier_items add column if not exists category text
  check (category in ('pharmacy', 'lab', 'general_stores'));
alter table public.supplier_items add column if not exists effective_date date not null default current_date;

-- Backfill: suppliers with exactly one centre / one category
update public.supplier_items si
set centre_id = x.centre_id
from (
  select supplier_id, (array_agg(centre_id))[1] as centre_id
  from public.supplier_centres group by supplier_id having count(*) = 1
) x
where si.supplier_id = x.supplier_id and si.centre_id is null;

update public.supplier_items si
set category = x.dept
from (
  select supplier_id, (array_agg(dept))[1] as dept
  from public.supplier_departments group by supplier_id having count(*) = 1
) x
where si.supplier_id = x.supplier_id and si.category is null;

-- ---------- 5. Price history details ----------
alter table public.supplier_price_history add column if not exists item_code text;
alter table public.supplier_price_history add column if not exists centre_id uuid references public.centres(id);
alter table public.supplier_price_history add column if not exists category text;
alter table public.supplier_price_history add column if not exists effective_date date;
alter table public.supplier_price_history add column if not exists actor_email text;

-- ---------- 6. Document types ----------
alter type supplier_doc_type add value if not exists 'supplier_agreement';

-- ---------- 7. Row Level Security for the new tables ----------
alter table public.centres enable row level security;
alter table public.supplier_centres enable row level security;
alter table public.supplier_departments enable row level security;

create policy "signed in users read centres"
  on public.centres for select to authenticated using (true);
create policy "admins manage centres"
  on public.centres for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admins manage supplier centres"
  on public.supplier_centres for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage supplier departments"
  on public.supplier_departments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Uploads from the portal run with the admin's session
create policy "admins insert supplier documents"
  on public.supplier_documents for insert to authenticated with check (public.is_admin());
create policy "admins upload supplier document files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'supplier-documents' and public.is_admin());
