-- =====================================================================
-- v3 migration: full PDF questionnaire answers, price list upload,
-- signed form scans. Run AFTER schema.sql and migration_v2.sql.
-- =====================================================================

-- All PDF answers that do not have their own column (JSON)
alter table public.suppliers
  add column if not exists application jsonb not null default '{}'::jsonb;

-- New document types
alter type supplier_doc_type add value if not exists 'price_list';
alter type supplier_doc_type add value if not exists 'signed_form';

-- Allow Excel / Word / CSV uploads in the documents bucket
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/csv'
]
where id = 'supplier-documents';
