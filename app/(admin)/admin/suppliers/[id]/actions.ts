'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { BUSINESS_NATURES, SUPPLIER_BUCKET, type DocType } from '@/lib/schemas';
import { SUPPLIER_CATEGORIES } from '@/lib/categories';
import { isCategory, isDate, isUuid } from '@/lib/centres';
import { parsePriceList } from '@/lib/price-import';
import { recordTransition } from '@/lib/approval';
import { validateUploads, type Upload } from '@/lib/uploads';

type Tab = 'profile' | 'prices' | 'documents' | 'history';

const base = (id: string) => `/admin/suppliers/${id}`;

function fail(id: string, tab: Tab, msg: string): never {
  redirect(`${base(id)}?tab=${tab}&err=${encodeURIComponent(msg)}`);
}
function done(id: string, tab: Tab, msg: string): never {
  redirect(`${base(id)}?tab=${tab}&ok=${encodeURIComponent(msg)}`);
}

const txt = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
const nul = (s: string) => (s === '' ? null : s);

/** Every action runs with the admin's own session. RLS decides what is allowed. */
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');
  return { supabase, user };
}

function parsePrice(raw: string): number | null {
  const n = Number(raw);
  return raw !== '' && Number.isFinite(n) && n >= 0 && n <= 1e10 ? n : null;
}

function itemInput(fd: FormData) {
  return {
    code: txt(fd, 'item_code').toUpperCase(),
    description: txt(fd, 'description'),
    unit: txt(fd, 'unit') || 'Each',
    price: txt(fd, 'unit_price'),
    date: txt(fd, 'effective_date'),
    centre: txt(fd, 'centre_id'),
    category: txt(fd, 'category'),
  };
}

// ---------- A. Supplier profile ----------

export async function updateSupplierDetails(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();

  const company_name = txt(formData, 'company_name');
  const email = txt(formData, 'email').toLowerCase();
  const his = txt(formData, 'supplier_code').toUpperCase();
  if (company_name.length < 2) fail(id, 'profile', 'Company name is required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(id, 'profile', 'Email address is not valid');
  if (his && !/^SP\d{8}$/.test(his)) fail(id, 'profile', 'HIS code must be SP followed by 8 digits, e.g. SP00000108');

  // Centres and categories are chosen from fixed lists only
  const { data: centres } = await supabase.from('centres').select('id, name');
  const wantedCentres = formData.getAll('centre_ids').map(String).filter(isUuid);
  const chosenCentres = (centres ?? []).filter((c) => wantedCentres.includes(c.id));
  const chosenCats = formData.getAll('departments').map(String).filter(isCategory);

  const bn = txt(formData, 'business_nature');
  const { error } = await supabase
    .from('suppliers')
    .update({
      supplier_code: nul(his),
      company_name,
      head_office_address: nul(txt(formData, 'head_office_address')),
      factory_address: nul(txt(formData, 'factory_address')),
      telephone: nul(txt(formData, 'telephone')),
      mobile: nul(txt(formData, 'mobile')),
      fax: nul(txt(formData, 'fax')),
      email: nul(email),
      contact_person: nul(txt(formData, 'contact_person')),
      contact_title: nul(txt(formData, 'contact_title')),
      business_nature: (BUSINESS_NATURES as readonly string[]).includes(bn) ? bn : null,
      categories: formData.getAll('categories').map(String).filter((c) => (SUPPLIER_CATEGORIES as readonly string[]).includes(c)),
      branches: chosenCentres.map((c) => c.name),
      iso_9000: formData.get('iso_9000') === 'on',
      iso_certificate_no: nul(txt(formData, 'iso_certificate_no')),
      production_capacity: nul(txt(formData, 'production_capacity')),
      quality_controls: nul(txt(formData, 'quality_controls')),
      price_validity_until: nul(txt(formData, 'price_validity_until')),
    })
    .eq('id', id);
  if (error) fail(id, 'profile', error.code === '23505' ? 'That HIS code is already used by another supplier' : error.message);

  // Replace centre and category links
  const c1 = await supabase.from('supplier_centres').delete().eq('supplier_id', id);
  if (c1.error) fail(id, 'profile', c1.error.message);
  if (chosenCentres.length) {
    const c2 = await supabase.from('supplier_centres').insert(chosenCentres.map((c) => ({ supplier_id: id, centre_id: c.id })));
    if (c2.error) fail(id, 'profile', c2.error.message);
  }
  const d1 = await supabase.from('supplier_departments').delete().eq('supplier_id', id);
  if (d1.error) fail(id, 'profile', d1.error.message);
  if (chosenCats.length) {
    const d2 = await supabase.from('supplier_departments').insert(chosenCats.map((d) => ({ supplier_id: id, dept: d })));
    if (d2.error) fail(id, 'profile', d2.error.message);
  }

  revalidatePath('/admin/suppliers');
  revalidatePath(base(id));
  done(id, 'profile', 'Supplier profile saved');
}

export async function updateSupplierStatus(id: string, formData: FormData): Promise<void> {
  const schema = z.object({
    status: z.enum(['draft', 'pending', 'under_review', 'changes_requested', 'approved', 'rejected']),
    review_notes: z.string().trim().max(2000).optional(),
  });
  const parsed = schema.parse({ status: formData.get('status'), review_notes: formData.get('review_notes') ?? undefined });

  const { supabase, user } = await requireUser();
  const { data: cur } = await supabase.from('suppliers').select('status, supplier_code').eq('id', id).maybeSingle();
  if (!cur) fail(id, 'profile', 'Supplier not found');
  if (parsed.status === cur.status) done(id, 'profile', 'Status unchanged');
  if (parsed.status === 'approved' && !cur.supplier_code) fail(id, 'profile', 'Enter the HIS supplier code before approving');

  const { error } = await supabase
    .from('suppliers')
    .update({ status: parsed.status, review_notes: parsed.review_notes || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) fail(id, 'profile', error.message);

  await recordTransition(supabase, { supplierId: id, from: cur.status, to: parsed.status, reason: parsed.review_notes || null, userId: user.id, email: user.email ?? null });
  revalidatePath('/admin');
  revalidatePath(base(id));
  done(id, 'profile', `Status set to ${parsed.status.replace('_', ' ')}`);
}

// ---------- B. Price list (centre-specific) ----------

export async function addPriceItem(id: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const f = itemInput(formData);
  if (!f.description) fail(id, 'prices', 'Item description is required');
  if (!f.code) fail(id, 'prices', 'Item code is required');
  if (!isUuid(f.centre)) fail(id, 'prices', 'Choose the centre for this price');
  if (!isCategory(f.category)) fail(id, 'prices', 'Choose a category: Pharmacy, Lab or General Stores');
  const price = parsePrice(f.price);
  if (price === null) fail(id, 'prices', 'Unit price must be a number, 0 or more');
  const date = f.date || new Date().toISOString().slice(0, 10);
  if (!isDate(date)) fail(id, 'prices', 'Effective date is not valid');

  const { data: last } = await supabase.from('supplier_items').select('line_no').eq('supplier_id', id).order('line_no', { ascending: false }).limit(1).maybeSingle();
  const { data: row, error } = await supabase
    .from('supplier_items')
    .insert({
      supplier_id: id, line_no: (last?.line_no ?? 0) + 1, his_item_code: f.code, description: f.description,
      unit: f.unit, unit_price: price, currency: 'LKR', centre_id: f.centre, category: f.category, effective_date: date,
    })
    .select('id')
    .single();
  if (error || !row) fail(id, 'prices', error?.message ?? 'Could not add the item');

  await supabase.from('supplier_price_history').insert({
    item_id: row.id, supplier_id: id, item_code: f.code, description: f.description, centre_id: f.centre,
    category: f.category, old_price: null, new_price: price, effective_date: date, changed_by: user.id, actor_email: user.email ?? null,
  });
  revalidatePath(base(id));
  done(id, 'prices', 'Price item added');
}

export async function updateItem(id: string, itemId: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const { data: cur } = await supabase.from('supplier_items').select('*').eq('id', itemId).eq('supplier_id', id).maybeSingle();
  if (!cur) fail(id, 'prices', 'Item not found');

  const f = itemInput(formData);
  if (!f.description) fail(id, 'prices', 'Item description is required');
  if (!f.code) fail(id, 'prices', 'Item code is required');
  const price = parsePrice(f.price);
  if (price === null) fail(id, 'prices', 'Unit price must be a number, 0 or more');
  if (!isDate(f.date)) fail(id, 'prices', 'Effective date is not valid');

  const { error } = await supabase
    .from('supplier_items')
    .update({ his_item_code: f.code, description: f.description, unit: f.unit, unit_price: price, effective_date: f.date })
    .eq('id', itemId)
    .eq('supplier_id', id);
  if (error) fail(id, 'prices', error.message);

  // Keep history only when the price actually moves
  if (Number(cur.unit_price) !== price) {
    await supabase.from('supplier_price_history').insert({
      item_id: itemId, supplier_id: id, item_code: f.code, description: f.description, centre_id: cur.centre_id,
      category: cur.category, old_price: cur.unit_price, new_price: price, effective_date: f.date,
      changed_by: user.id, actor_email: user.email ?? null,
    });
  }
  revalidatePath(base(id));
  done(id, 'prices', Number(cur.unit_price) !== price ? 'Price updated and recorded in history' : 'Item saved');
}

export async function deleteItem(id: string, itemId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('supplier_items').delete().eq('id', itemId).eq('supplier_id', id);
  if (error) fail(id, 'prices', error.message);
  revalidatePath(base(id));
  done(id, 'prices', 'Item deleted');
}

export async function importPriceList(id: string, formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const centre = txt(formData, 'centre_id');
  const category = txt(formData, 'category');
  if (!isUuid(centre)) fail(id, 'prices', 'Choose the centre for this price list');
  if (!isCategory(category)) fail(id, 'prices', 'Choose a category for this price list');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) fail(id, 'prices', 'Choose a CSV or Excel file');
  if ((file as File).size > 5 * 1024 * 1024) fail(id, 'prices', 'File must be 5 MB or smaller');

  let parsed: ReturnType<typeof parsePriceList>;
  try {
    parsed = parsePriceList(Buffer.from(await (file as File).arrayBuffer()));
  } catch (err) {
    fail(id, 'prices', (err as Error).message);
  }
  if (parsed.rows.length === 0) fail(id, 'prices', 'No valid price rows found in the file');

  const today = new Date().toISOString().slice(0, 10);
  const { data: last } = await supabase.from('supplier_items').select('line_no').eq('supplier_id', id).order('line_no', { ascending: false }).limit(1).maybeSingle();
  let next = last?.line_no ?? 0;
  const rows = parsed.rows.map((r) => ({
    supplier_id: id, line_no: ++next, his_item_code: r.his_item_code, description: r.description, unit: r.unit,
    unit_price: r.unit_price, currency: 'LKR', centre_id: centre, category, effective_date: today,
  }));

  const { data: inserted, error } = await supabase.from('supplier_items').insert(rows).select('id, his_item_code, description, unit_price');
  if (error || !inserted) fail(id, 'prices', error?.message ?? 'Import failed');

  await supabase.from('supplier_price_history').insert(
    inserted.map((i) => ({
      item_id: i.id, supplier_id: id, item_code: i.his_item_code, description: i.description, centre_id: centre,
      category, old_price: null, new_price: i.unit_price, effective_date: today, changed_by: user.id, actor_email: user.email ?? null,
    })),
  );
  revalidatePath(base(id));
  done(id, 'prices', `Imported ${inserted.length} items (${parsed.skipped} skipped)`);
}

// ---------- C. Documents ----------

const UPLOAD_TYPES = ['business_registration', 'supplier_agreement', 'other'] as const;
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);

export async function uploadDocument(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const type = txt(formData, 'doc_type');
  if (!(UPLOAD_TYPES as readonly string[]).includes(type)) fail(id, 'documents', 'Choose a document type');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) fail(id, 'documents', 'Choose a file to upload');
  const uploads: Upload[] = [{ docType: type as DocType, file: file as File }];
  const problem = await validateUploads(uploads);
  if (problem) fail(id, 'documents', problem);

  const expires = txt(formData, 'expires_on');
  if (expires && !isDate(expires)) fail(id, 'documents', 'Expiry date is not valid');

  const path = `${id}/${type}/${randomUUID()}-${safeName((file as File).name)}`;
  const { error: upErr } = await supabase.storage.from(SUPPLIER_BUCKET).upload(path, file as File, { contentType: (file as File).type, upsert: false });
  if (upErr) fail(id, 'documents', upErr.message);

  const { error } = await supabase.from('supplier_documents').insert({
    supplier_id: id, doc_type: type, storage_path: path, file_name: (file as File).name,
    mime_type: (file as File).type, size_bytes: (file as File).size, expires_on: expires || null,
  });
  if (error) {
    await supabase.storage.from(SUPPLIER_BUCKET).remove([path]);
    fail(id, 'documents', error.message);
  }
  revalidatePath(base(id));
  done(id, 'documents', 'Document uploaded');
}

export async function setDocumentExpiry(id: string, formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const docId = txt(formData, 'doc_id');
  const expires = txt(formData, 'expires_on');
  if (expires && !isDate(expires)) fail(id, 'documents', 'Expiry date is not valid');
  const { error } = await supabase.from('supplier_documents').update({ expires_on: expires || null }).eq('id', docId).eq('supplier_id', id);
  if (error) fail(id, 'documents', error.message);
  revalidatePath(base(id));
  done(id, 'documents', 'Expiry date saved');
}
