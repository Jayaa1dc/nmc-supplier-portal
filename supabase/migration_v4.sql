-- =====================================================================
-- v4 migration: HIS code is assigned by the admin, not typed by the supplier.
-- Run AFTER schema, migration_v2 and migration_v3.
-- =====================================================================

-- Applications can exist before HIS issues a code
alter table public.suppliers alter column supplier_code drop not null;
alter table public.suppliers drop constraint if exists supplier_code_format;
alter table public.suppliers add constraint supplier_code_format
  check (supplier_code is null or supplier_code ~ '^SP[0-9]{8}$');

-- Reference number shown to the supplier, e.g. APP-KQ8R2F-A1B2
alter table public.suppliers add column if not exists application_ref text unique;

-- An approved supplier must already have its HIS code
alter table public.suppliers drop constraint if exists approved_needs_his_code;
alter table public.suppliers add constraint approved_needs_his_code
  check (status <> 'approved' or supplier_code is not null);
