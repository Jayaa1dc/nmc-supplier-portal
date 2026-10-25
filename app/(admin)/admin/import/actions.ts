'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { parseSupplierSheet, type ParseError } from '@/lib/import';

export type ImportReport = {
  ok: boolean;
  message?: string;
  sheet?: string;
  inserted?: number;
  merged?: number;
  skipped?: number;
  errors?: ParseError[];
};

type Existing = {
  id: string;
  supplier_code: string;
  branches: string[] | null;
  telephone: string | null;
  email: string | null;
  contact_person: string | null;
};

const MAX_BYTES = 5 * 1024 * 1024;
const CHUNK = 500;

/**
 * Bulk import of the existing HIS supplier list (CSV or XLSX).
 * - New HIS codes are inserted as approved legacy records.
 * - Existing codes are never re-statused or overwritten: we only add the branch
 *   and fill blank contact fields. Pre-qualification data is never touched.
 */
export async function importLegacySuppliers(
  _prev: ImportReport | null,
  formData: FormData,
): Promise<ImportReport> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = user ? await supabase.rpc('is_admin') : { data: false };
  if (!isAdmin) return { ok: false, message: 'Not authorised.' };

  const file = formData.get('file');
  const branch = String(formData.get('branch') ?? '').trim();
  const status = String(formData.get('status') ?? 'approved');

  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a CSV or Excel file.' };
  if (file.size > MAX_BYTES) return { ok: false, message: 'File must be 5 MB or smaller.' };
  if (!branch) return { ok: false, message: 'Select the branch this list belongs to.' };
  if (!['approved', 'pending'].includes(status)) return { ok: false, message: 'Invalid status.' };

  let parsed;
  try {
    parsed = parseSupplierSheet(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  const db = adminClient();
  const codes = parsed.rows.map((r) => r.supplier_code);
  const existing = new Map<string, Existing>();

  for (let i = 0; i < codes.length; i += CHUNK) {
    const { data, error } = await db
      .from('suppliers')
      .select('id, supplier_code, branches, telephone, email, contact_person')
      .in('supplier_code', codes.slice(i, i + CHUNK));
    if (error) return { ok: false, message: `Lookup failed: ${error.message}` };
    data?.forEach((d) => existing.set(d.supplier_code, d as Existing));
  }

  const errors: ParseError[] = [...parsed.errors];
  const toInsert: Record<string, unknown>[] = [];
  let merged = 0;

  for (const r of parsed.rows) {
    const ex = existing.get(r.supplier_code);
    if (ex) {
      const patch: Record<string, unknown> = {
        branches: Array.from(new Set([...(ex.branches ?? []), branch])),
      };
      if (!ex.telephone && r.telephone) patch.telephone = r.telephone;
      if (!ex.email && r.email) patch.email = r.email;
      if (!ex.contact_person && r.contact_person) patch.contact_person = r.contact_person;

      const { error } = await db.from('suppliers').update(patch).eq('id', ex.id);
      if (error) errors.push({ entry: r.entry, reason: `${r.supplier_code}: ${error.message}` });
      else merged++;
    } else {
      toInsert.push({
        supplier_code: r.supplier_code,
        company_name: r.company_name,
        telephone: r.telephone,
        email: r.email,
        contact_person: r.contact_person,
        review_notes: r.notes,
        branches: [branch],
        status,
        source: 'legacy_import',
      });
    }
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { error } = await db.from('suppliers').insert(chunk);
    if (error) {
      return {
        ok: false,
        message: `Insert failed after ${inserted} new records: ${error.message}. Re-running is safe: existing codes are skipped.`,
        inserted,
        merged,
        errors,
      };
    }
    inserted += chunk.length;
  }

  return { ok: true, sheet: parsed.sheet, inserted, merged, skipped: errors.length, errors };
}
